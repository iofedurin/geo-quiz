import { computed, inject, Injectable, signal } from '@angular/core';
import { CountryDataService } from './country-data.service';
import type { CountryMeta } from '../models/country.model';
import type { CountryState, QuizConfig, QuizResult, QuizState } from '../models/quiz.model';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly countryData = inject(CountryDataService);

  private readonly _state = signal<QuizState | null>(null);
  private _startTime = 0;

  readonly state = this._state.asReadonly();

  /** Текущая страна-вопрос или null если квиз не начат / завершён */
  readonly currentCountry = computed<CountryMeta | null>(() => {
    const s = this._state();
    if (!s || s.finished) return null;
    return s.queue[s.currentIndex] ?? null;
  });

  /** Прогресс */
  readonly progress = computed(() => {
    const s = this._state();
    if (!s) return { current: 0, total: 0, percent: 0 };
    const current = s.answered.size;
    return {
      current,
      total: s.total,
      percent: s.total > 0 ? Math.round((current / s.total) * 100) : 0,
    };
  });

  /** Состояния стран для отображения на карте */
  readonly countryStates = computed((): Map<string, CountryState> => {
    const s = this._state();
    if (!s) return new Map();

    const map = new Map<string, CountryState>(s.answered);

    // Ошибочные клики текущего вопроса — серым
    for (const id of s.currentWrongAttempts) {
      map.set(id, 'wrong-attempt');
    }

    // «Не знаю» — показать правильный ответ
    if (s.revealedId) {
      map.set(s.revealedId, 'revealed');
    }

    // В режимах "назови страну" и "выбери флаг" — подсвечиваем текущую
    const mode = s.config.mode;
    if (mode === 'name-country' || mode === 'pick-flag') {
      const current = this.currentCountry();
      if (current) map.set(current.id, 'highlighted');
    }

    return map;
  });

  readonly isFinished = computed(() => this._state()?.finished ?? false);

  /** Запустить новый квиз */
  startQuiz(config: QuizConfig): void {
    let countries = this.countryData.getByRegion(config.region);

    // Для режима "по столице" — только страны со столицей
    if (config.mode === 'find-by-capital') {
      countries = countries.filter(c => c.capital.en !== '');
    }

    // Fisher-Yates shuffle
    const queue = [...countries];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    this._startTime = Date.now();
    this._state.set({
      config,
      queue,
      currentIndex: 0,
      answered: new Map(),
      currentWrongAttempts: new Set(),
      hadWrongAttempt: false,
      revealedId: null,
      score: 0,
      total: queue.length,
      finished: false,
    });
  }

  /**
   * Режимы 1-3: пользователь кликнул на страну на карте.
   * Неправильный клик — помечает серым, не записывает ответ.
   * Правильный клик — записывает результат.
   */
  checkMapClick(clickedId: string): 'correct' | 'incorrect' {
    const s = this._state();
    const current = this.currentCountry();
    if (!s || !current) return 'incorrect';

    if (clickedId === current.id) {
      // Правильно — записываем финальный ответ
      const answered = new Map(s.answered);
      answered.set(current.id, 'correct');
      this._state.set({
        ...s,
        answered,
        score: s.hadWrongAttempt ? s.score : s.score + 1,
      });
      return 'correct';
    }

    // Неправильно — только помечаем серым, не записываем ответ
    const wrongAttempts = new Set(s.currentWrongAttempts);
    wrongAttempts.add(clickedId);
    this._state.set({
      ...s,
      currentWrongAttempts: wrongAttempts,
      hadWrongAttempt: true,
    });
    return 'incorrect';
  }

  /**
   * Режим 4: пользователь ввёл название страны.
   * Неправильный ввод — не записывает ответ, возвращает false.
   * Правильный — записывает результат.
   */
  checkNameInput(input: string): boolean {
    const s = this._state();
    const current = this.currentCountry();
    if (!s || !current) return false;

    const norm = (v: string) => v.trim().toLowerCase();
    const guess = norm(input);
    const isCorrect = guess === norm(current.name.en) || guess === norm(current.name.ru);

    if (isCorrect) {
      const answered = new Map(s.answered);
      answered.set(current.id, 'correct');
      this._state.set({
        ...s,
        answered,
        score: s.hadWrongAttempt ? s.score : s.score + 1,
      });
    } else {
      this._state.set({ ...s, hadWrongAttempt: true });
    }

    return isCorrect;
  }

  /**
   * Режим 5: пользователь выбрал флаг.
   * Принимает cca2 выбранной страны.
   */
  checkFlagPick(cca2: string): boolean {
    const s = this._state();
    const current = this.currentCountry();
    if (!s || !current) return false;

    const isCorrect = cca2 === current.cca2;
    this._recordAnswer(s, current.id, isCorrect);
    return isCorrect;
  }

  /**
   * 9 вариантов флагов для режима pick-flag:
   * 1 правильный + 8 случайных из того же региона.
   */
  getFlagOptions(): string[] {
    const s = this._state();
    const current = this.currentCountry();
    if (!s || !current) return [];

    const distractors = this.countryData
      .getRandomFrom(s.config.region, current.cca2, 8)
      .map(c => c.cca2);

    const options = [current.cca2, ...distractors];

    // Перемешать итоговый список
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  /** Перейти к следующему вопросу */
  next(): void {
    const s = this._state();
    if (!s) return;

    const nextIndex = s.currentIndex + 1;
    if (nextIndex >= s.total) {
      this._state.set({ ...s, finished: true });
    } else {
      this._state.set({
        ...s,
        currentIndex: nextIndex,
        currentWrongAttempts: new Set(),
        hadWrongAttempt: false,
        revealedId: null,
      });
    }
  }

  /** Пропустить текущий вопрос (засчитывается как неверный) */
  skip(): void {
    const s = this._state();
    const current = this.currentCountry();
    if (!s || !current) return;

    const answered = new Map(s.answered);
    answered.set(current.id, 'incorrect');
    this._state.set({ ...s, answered });
  }

  /** «Не знаю» — показать правильный ответ на карте, засчитать как неверный */
  giveUp(): void {
    const s = this._state();
    const current = this.currentCountry();
    if (!s || !current) return;

    const answered = new Map(s.answered);
    answered.set(current.id, 'incorrect');
    this._state.set({ ...s, answered, revealedId: current.id });
  }

  /** Итоги квиза */
  getResults(): QuizResult | null {
    const s = this._state();
    if (!s) return null;

    return {
      score: s.score,
      total: s.total,
      percent: s.total > 0 ? Math.round((s.score / s.total) * 100) : 0,
      config: s.config,
      durationSec: Math.round((Date.now() - this._startTime) / 1000),
    };
  }

  /** Сбросить квиз */
  reset(): void {
    this._state.set(null);
  }

  // ──────────────────── private ────────────────────

  /** Используется только для pick-flag (старое поведение) */
  private _recordAnswer(s: QuizState, countryId: string, isCorrect: boolean): void {
    const answered = new Map(s.answered);
    answered.set(countryId, isCorrect ? 'correct' : 'incorrect');

    this._state.set({
      ...s,
      answered,
      score: isCorrect ? s.score + 1 : s.score,
    });
  }
}
