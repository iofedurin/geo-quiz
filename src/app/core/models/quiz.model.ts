import type { CountryMeta } from './country.model';

/** Режим квиза */
export type QuizMode =
  | 'find-by-name'     // Дано: название страны   → кликни на карте
  | 'find-by-capital'  // Дано: столица            → кликни на карте
  | 'find-by-flag'     // Дано: флаг               → кликни на карте
  | 'name-country'     // Дано: выделенная страна  → введи название
  | 'pick-flag';       // Дано: выделенная страна  → выбери из 9 флагов

/** Вид карты */
export type MapView = 'flat' | 'globe';

/** Состояние страны на карте */
export type CountryState = 'neutral' | 'correct' | 'incorrect' | 'highlighted' | 'wrong-attempt' | 'revealed';

/** Конфигурация квиза (задаётся на главной странице) */
export interface QuizConfig {
  mode: QuizMode;
  /** null = весь мир */
  region: string | null;
  mapView: MapView;
}

/** Состояние выполняемого квиза */
export interface QuizState {
  config: QuizConfig;
  /** Перемешанный список стран для прохождения */
  queue: CountryMeta[];
  /** Индекс текущего вопроса */
  currentIndex: number;
  /** id → 'correct' | 'incorrect' */
  answered: Map<string, 'correct' | 'incorrect'>;
  /** IDs ошибочных кликов в текущем вопросе */
  currentWrongAttempts: Set<string>;
  /** Были ли ошибки в текущем вопросе */
  hadWrongAttempt: boolean;
  /** ID страны, показанной при «не знаю» */
  revealedId: string | null;
  score: number;
  total: number;
  finished: boolean;
}

/** Итоги квиза */
export interface QuizResult {
  score: number;
  total: number;
  percent: number;
  config: QuizConfig;
  /** Время прохождения в секундах */
  durationSec: number;
}
