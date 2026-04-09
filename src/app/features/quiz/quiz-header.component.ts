import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CountryMeta } from '../../core/models/country.model';
import type { QuizMode } from '../../core/models/quiz.model';

@Component({
  selector: 'app-quiz-header',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="quiz-header">
      <div class="progress-bar">
        <div class="progress-fill" [style.width.%]="progress().percent"></div>
      </div>
      <div class="header-body">
        <div class="question">
          @if (mode() === 'find-by-name') {
            <span [innerHTML]="'quiz.findByName' | transloco: { country: label() }"></span>
          } @else if (mode() === 'find-by-capital') {
            <span [innerHTML]="'quiz.findByCapital' | transloco: { capital: label() }"></span>
          } @else if (mode() === 'find-by-flag') {
            <span>{{ 'quiz.findByFlag' | transloco }}</span>
            @if (country()) {
              <img class="question-flag" [src]="country()!.flagSvg" [alt]="country()!.cca2" />
            }
          } @else if (mode() === 'name-country') {
            <span>{{ 'quiz.nameCountry' | transloco }}</span>
          } @else {
            <span [innerHTML]="'quiz.pickFlag' | transloco: { country: label() }"></span>
          }
        </div>
        <div class="score">
          {{ 'quiz.score' | transloco: { score: progress().score, total: progress().total } }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quiz-header { background: white; border-bottom: 1px solid #e0e0e0; flex-shrink: 0; }
    .progress-bar { height: 4px; background: #e0e0e0; }
    .progress-fill { height: 100%; background: #1a237e; transition: width 0.3s ease; }
    .header-body {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 1rem; gap: 1rem; min-height: 52px;
    }
    .question {
      font-size: 1.05rem; color: #222; font-weight: 500;
      display: flex; align-items: center; gap: 0.75rem; flex: 1;
      :deep(strong) { color: #1a237e; }
    }
    .question-flag { height: 36px; border-radius: 3px; border: 1px solid #ddd; }
    .score { font-size: 0.9rem; color: #666; white-space: nowrap; flex-shrink: 0; }
  `],
})
export class QuizHeaderComponent {
  readonly mode = input.required<QuizMode>();
  readonly country = input<CountryMeta | null>(null);
  readonly lang = input('ru');
  readonly progress = input<{ score: number; total: number; percent: number }>(
    { score: 0, total: 0, percent: 0 }
  );

  readonly label = computed(() => {
    const c = this.country();
    if (!c) return '';
    const l = this.lang();
    if (this.mode() === 'find-by-capital') return l === 'ru' ? c.capital.ru : c.capital.en;
    return l === 'ru' ? c.name.ru : c.name.en;
  });
}
