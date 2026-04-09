import { Component, computed, effect, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CountryMeta } from '../../core/models/country.model';
import type { QuizMode } from '../../core/models/quiz.model';

export interface PreviousResult {
  country: CountryMeta;
  wasCorrect: boolean;
}

@Component({
  selector: 'app-quiz-info-panel',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="info-panel">
      <!-- Question (always at the top) -->
      <div class="question-section">
        @if (country()) {
          <div class="question">
            @if (mode() === 'find-by-name') {
              <span [innerHTML]="'quiz.findByName' | transloco: { country: label() }"></span>
            } @else if (mode() === 'find-by-capital') {
              <span [innerHTML]="'quiz.findByCapital' | transloco: { capital: label() }"></span>
            } @else if (mode() === 'find-by-flag') {
              <div class="flag-question">
                <span>{{ 'quiz.findByFlag' | transloco }}</span>
                <img class="question-flag" [src]="country()!.flagSvg" [alt]="country()!.cca2" />
              </div>
            } @else if (mode() === 'name-country') {
              <span>{{ 'quiz.nameCountry' | transloco }}</span>
            } @else {
              <span [innerHTML]="'quiz.pickFlag' | transloco: { country: label() }"></span>
            }
          </div>
        }
        <div class="question-footer">
          <span class="score">
            {{ 'quiz.score' | transloco: { score: progress().score, total: progress().total } }}
          </span>
          @if (!revealed()) {
            <button class="giveup-btn" (click)="giveUp.emit()">
              {{ 'quiz.giveUp' | transloco }}
            </button>
          }
        </div>
      </div>

      <!-- Info section (below question) — shown when there's something to display -->
      @if (infoCountry()) {
        <div class="divider"></div>
        <div class="info-section" [class.info-correct]="infoVariant() === 'correct'"
             [class.info-wrong]="infoVariant() === 'wrong'"
             [class.info-revealed]="infoVariant() === 'revealed'">

          <!-- Verdict label -->
          @if (infoVariant() === 'correct') {
            <div class="verdict correct">{{ 'quiz.correct' | transloco }}</div>
          } @else if (infoVariant() === 'wrong') {
            <div class="verdict wrong">{{ 'quiz.incorrect' | transloco }}</div>
          }

          <!-- Country info -->
          <img class="info-flag" [src]="infoCountry()!.flagSvg" [alt]="infoCountry()!.cca2" />
          <div class="info-name">
            {{ lang() === 'ru' ? infoCountry()!.name.ru : infoCountry()!.name.en }}
          </div>
          @if (showCapital()) {
            <div class="info-capital">
              {{ 'country.capital' | transloco }}:
              <strong>{{ lang() === 'ru' ? infoCountry()!.capital.ru : infoCountry()!.capital.en }}</strong>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .info-panel {
      position: absolute;
      top: 12px; right: 12px;
      width: 300px;
      background: rgba(255, 255, 255, 0.97);
      border-radius: 14px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.22);
      z-index: 800;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .question-section {
      padding: 14px 16px 10px;
    }
    .question {
      font-size: 0.95rem; color: #222; font-weight: 500; line-height: 1.4;
      margin-bottom: 10px;
      :deep(strong) { color: #1a237e; }
    }
    .flag-question {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .question-flag {
      height: 32px; border-radius: 3px; border: 1px solid #ddd;
    }
    .question-footer {
      display: flex; align-items: center; justify-content: space-between;
    }
    .score { font-size: 0.8rem; color: #999; }
    .giveup-btn {
      padding: 3px 10px;
      font-size: 0.78rem; font-weight: 600; color: #999;
      background: none; border: 1.5px solid #ddd; border-radius: 12px;
      cursor: pointer; white-space: nowrap;
      transition: all 0.15s ease;
      &:hover { background: #f5f5f5; color: #555; border-color: #aaa; }
    }

    .divider {
      height: 1px; background: #eee; margin: 0;
    }

    .info-section {
      padding: 14px 16px 16px;
      text-align: center;
      animation: slideIn 0.2s ease;
      &.info-correct { background: #f1f8f1; }
      &.info-wrong   { background: #fff5f5; }
      &.info-revealed { background: #f0f6ff; }
    }
    .verdict {
      font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.8px; margin-bottom: 10px;
      &.correct { color: #2e7d32; }
      &.wrong   { color: #c62828; }
    }
    .info-flag {
      display: block; margin: 0 auto 10px;
      width: 96px; height: 64px; object-fit: contain;
      border-radius: 4px; border: 1px solid rgba(0,0,0,0.12);
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .info-name {
      font-size: 1.05rem; font-weight: 700; color: #1a1a1a;
      margin-bottom: 4px;
    }
    .info-capital {
      font-size: 0.85rem; color: #666;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class QuizInfoPanelComponent {
  readonly mode = input.required<QuizMode>();
  readonly country = input<CountryMeta | null>(null);
  readonly lang = input('ru');
  readonly progress = input<{ score: number; total: number; percent: number }>(
    { score: 0, total: 0, percent: 0 },
  );
  readonly wrongCountry = input<CountryMeta | null>(null);
  readonly previousResult = input<PreviousResult | null>(null);
  readonly revealed = input(false);

  readonly giveUp = output<void>();
  readonly advance = output<void>();

  private timerId: ReturnType<typeof setTimeout> | null = null;

  readonly label = computed(() => {
    const c = this.country();
    if (!c) return '';
    const l = this.lang();
    if (this.mode() === 'find-by-capital') return l === 'ru' ? c.capital.ru : c.capital.en;
    return l === 'ru' ? c.name.ru : c.name.en;
  });

  /** Страна, показываемая в нижней инфо-секции */
  readonly infoCountry = computed<CountryMeta | null>(() => {
    if (this.revealed()) return this.country();
    const prev = this.previousResult();
    if (prev) return prev.country;
    return this.wrongCountry();
  });

  /** Вид нижней секции */
  readonly infoVariant = computed<'correct' | 'wrong' | 'revealed' | null>(() => {
    if (this.revealed()) return 'revealed';
    const prev = this.previousResult();
    if (prev) return prev.wasCorrect ? 'correct' : 'wrong';
    if (this.wrongCountry()) return 'wrong';
    return null;
  });

  /** Показывать ли столицу в инфо-секции */
  readonly showCapital = computed(() => {
    const c = this.infoCountry();
    if (!c) return false;
    const cap = this.lang() === 'ru' ? c.capital.ru : c.capital.en;
    if (!cap) return false;
    // В режиме find-by-capital показываем только при wrong/revealed (иначе это подсказка к ответу)
    // В остальных режимах — всегда
    if (this.mode() === 'find-by-capital') {
      return this.infoVariant() === 'wrong' || this.infoVariant() === 'revealed';
    }
    return true;
  });

  constructor() {
    effect(() => {
      const isRevealed = this.revealed();
      this.clearTimer();
      if (isRevealed) {
        this.timerId = setTimeout(() => this.advance.emit(), 3000);
      }
    });
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
