import { Component, effect, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CountryMeta } from '../../core/models/country.model';

@Component({
  selector: 'app-country-info-popup',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    @if (visible()) {
      <div class="popup-backdrop">
        <div class="popup-card" [class.correct]="isCorrect()" [class.incorrect]="!isCorrect()">
          <div class="popup-verdict">
            {{ (isCorrect() ? 'quiz.correct' : 'quiz.incorrect') | transloco }}
          </div>

          <!-- Wrong pick -->
          @if (!isCorrect() && selectedCountry()) {
            <div class="pick-section wrong-section">
              <span class="pick-label">{{ 'quiz.youPicked' | transloco }}</span>
              <img class="pick-flag" [src]="selectedCountry()!.flagSvg" [alt]="selectedCountry()!.cca2" />
              <span class="pick-name">
                {{ lang() === 'ru' ? selectedCountry()!.name.ru : selectedCountry()!.name.en }}
              </span>
            </div>
          }

          <!-- Correct answer -->
          @if (country()) {
            @if (!isCorrect() && selectedCountry()) {
              <span class="pick-label correct-label">{{ 'quiz.correctAnswer' | transloco }}</span>
            }
            <img class="popup-flag" [src]="country()!.flagSvg" [alt]="country()!.cca2" />
            <h3 class="popup-name">
              {{ lang() === 'ru' ? country()!.name.ru : country()!.name.en }}
            </h3>
            <p class="popup-capital">
              {{ 'country.capital' | transloco }}:
              <strong>{{ lang() === 'ru' ? country()!.capital.ru : country()!.capital.en }}</strong>
            </p>
          }

          <button class="popup-next" (click)="close()">
            {{ 'quiz.next' | transloco }} ({{ seconds() }})
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .popup-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .popup-card {
      background: white; border-radius: 12px;
      padding: 1.25rem 1.5rem; min-width: 240px; max-width: 340px; width: 90%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border-top: 6px solid #ccc;
      &.correct { border-top-color: #4CAF50; }
      &.incorrect { border-top-color: #F44336; }
    }
    .popup-verdict {
      font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem;
      .correct & { color: #2e7d32; }
      .incorrect & { color: #c62828; }
    }
    .pick-section {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px; border-radius: 8px; margin-bottom: 10px;
    }
    .wrong-section { background: #ffebee; border: 1px solid #ffcdd2; }
    .pick-label {
      font-size: 0.78rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: #888; display: block; margin-bottom: 4px;
    }
    .correct-label { color: #2e7d32; margin-bottom: 6px; }
    .pick-flag {
      width: 80px; height: 54px; object-fit: contain;
      border-radius: 3px; border: 1px solid #ddd;
    }
    .pick-name { font-size: 0.9rem; color: #555; }
    .popup-flag {
      width: 120px; height: 80px; object-fit: contain;
      border-radius: 4px; border: 1px solid #ddd;
      margin-bottom: 0.5rem;
    }
    .popup-name { margin: 0.25rem 0; font-size: 1.1rem; }
    .popup-capital { margin: 0.25rem 0; color: #555; font-size: 0.95rem; }
    .popup-next {
      margin-top: 1rem;
      background: #1a237e; color: white;
      border: none; border-radius: 8px;
      padding: 0.5rem 1.5rem; font-size: 1rem; cursor: pointer;
      &:hover { background: #283593; }
    }
  `],
})
export class CountryInfoPopupComponent {
  readonly visible = input(false);
  readonly isCorrect = input(false);
  readonly country = input<CountryMeta | null>(null);
  readonly selectedCountry = input<CountryMeta | null>(null);
  readonly lang = input('ru');
  readonly next = output<void>();

  readonly seconds = signal(10);
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.seconds.set(10);
        this.timerId = setInterval(() => {
          const s = this.seconds() - 1;
          this.seconds.set(s);
          if (s <= 0) {
            this.clearTimer();
            this.next.emit();
          }
        }, 1000);
      } else {
        this.clearTimer();
      }
    });
  }

  close(): void {
    this.clearTimer();
    this.next.emit();
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
