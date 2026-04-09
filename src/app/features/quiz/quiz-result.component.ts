import { Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { QuizResult } from '../../core/models/quiz.model';

@Component({
  selector: 'app-quiz-result',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="result-overlay">
      <div class="result-card">
        <h2 class="result-title">{{ 'result.title' | transloco }}</h2>

        <div class="result-circle" [class]="grade()">
          <span class="result-percent">{{ result().percent }}%</span>
        </div>

        <p class="result-score">
          {{ 'result.score' | transloco: { score: result().score, total: result().total } }}
        </p>

        <p class="result-grade-label">
          @if (result().percent >= 80) {
            {{ 'result.excellent' | transloco }}
          } @else if (result().percent >= 50) {
            {{ 'result.good' | transloco }}
          } @else {
            {{ 'result.fair' | transloco }}
          }
        </p>

        <div class="result-actions">
          <button class="btn btn-primary" (click)="playAgain.emit()">
            {{ 'result.playAgain' | transloco }}
          </button>
          <button class="btn btn-secondary" (click)="goHome.emit()">
            {{ 'result.changeSettings' | transloco }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .result-overlay {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 2000;
    }
    .result-card {
      background: white; border-radius: 16px;
      padding: 2rem 2.5rem; text-align: center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.3);
      min-width: 280px;
    }
    .result-title { margin: 0 0 1.25rem; color: #1a237e; font-size: 1.5rem; }
    .result-circle {
      width: 100px; height: 100px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem;
      border: 6px solid #e0e0e0;
      &.excellent { border-color: #4CAF50; background: #e8f5e9; }
      &.good { border-color: #FF9800; background: #fff3e0; }
      &.fair { border-color: #F44336; background: #ffebee; }
    }
    .result-percent { font-size: 1.6rem; font-weight: 800; color: #333; }
    .result-score { font-size: 1.1rem; color: #555; margin: 0.25rem 0; }
    .result-grade-label { font-size: 1rem; color: #888; margin-bottom: 1.5rem; }
    .result-actions { display: flex; flex-direction: column; gap: 10px; }
    .btn {
      padding: 0.65rem 1.25rem; font-size: 1rem;
      border: none; border-radius: 8px; cursor: pointer;
      font-weight: 600; transition: opacity 0.2s;
      &:hover { opacity: 0.88; }
    }
    .btn-primary { background: #1a237e; color: white; }
    .btn-secondary { background: #e8eaf6; color: #1a237e; }
  `],
})
export class QuizResultComponent {
  readonly result = input.required<QuizResult>();
  readonly playAgain = output<void>();
  readonly goHome = output<void>();

  readonly grade = computed(() => {
    const p = this.result().percent;
    if (p >= 80) return 'excellent';
    if (p >= 50) return 'good';
    return 'fair';
  });
}
