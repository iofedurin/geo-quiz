import {
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { QuizService } from '../../core/services/quiz.service';
import { CountryDataService } from '../../core/services/country-data.service';
import { MapContainerComponent } from '../map/map-container.component';
import { QuizResultComponent } from './quiz-result.component';
import { FlagGridComponent } from '../../shared/components/flag-grid.component';
import { CountryInfoPopupComponent } from '../../shared/components/country-info-popup.component';
import {
  QuizInfoPanelComponent,
  type PreviousResult,
} from '../../shared/components/quiz-info-panel.component';
import { QuizHeaderComponent } from './quiz-header.component';
import { CountryAutocompleteComponent } from '../../shared/components/country-autocomplete.component';
import type { CountryMeta } from '../../core/models/country.model';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    TranslocoPipe,
    MapContainerComponent, QuizResultComponent,
    FlagGridComponent, CountryInfoPopupComponent, QuizInfoPanelComponent, QuizHeaderComponent,
    CountryAutocompleteComponent,
  ],
  template: `
    <div class="quiz-page">
      <!-- Map area (for map-based modes) -->
      @if (config()?.mode !== 'pick-flag') {
        <div class="map-area">
          <app-map-container
            [mapView]="config()?.mapView ?? 'globe'"
            [countryStates]="quiz.countryStates()"
            [region]="config()?.region ?? null"
            (countryClicked)="onMapClick($event)"
          />

          <!-- Info panel (top-right corner) -->
          @if (quiz.currentCountry() || isRevealed()) {
            <app-quiz-info-panel
              [mode]="config()!.mode"
              [country]="quiz.currentCountry()"
              [lang]="lang()"
              [progress]="headerProgress()"
              [wrongCountry]="wrongCountry()"
              [previousResult]="previousResult()"
              [revealed]="isRevealed()"
              (giveUp)="doGiveUp()"
              (advance)="advanceFromReveal()"
            />
          }

          <!-- Answer panel for name-country -->
          @if (!isRevealed() && !quiz.isFinished() && config()?.mode === 'name-country') {
            <div class="answer-panel">
              <app-country-autocomplete
                [countries]="regionCountries()"
                [lang]="lang()"
                [placeholder]="'quiz.nameCountry' | transloco"
                (selected)="onCountrySelected($event)"
              />
            </div>
          }

          <!-- Result overlay -->
          @if (quiz.isFinished()) {
            @if (quiz.getResults(); as res) {
              <app-quiz-result
                [result]="res"
                (playAgain)="playAgain()"
                (goHome)="goHome()"
              />
            }
          }
        </div>
      }

      <!-- Flag picker (full screen, no map) -->
      @if (config()?.mode === 'pick-flag') {
        <div class="flag-screen">
          @if (!quiz.isFinished()) {
            <app-quiz-header
              [mode]="config()!.mode"
              [country]="quiz.currentCountry()"
              [lang]="lang()"
              [progress]="headerProgress()"
            />
          }
          @if (!feedbackVisible() && !quiz.isFinished()) {
            <app-flag-grid
              [flags]="flagOptions()"
              [locked]="feedbackVisible()"
              (flagSelected)="onFlagPick($event)"
            />
          }
          <app-country-info-popup
            [visible]="feedbackVisible()"
            [isCorrect]="lastResult() === 'correct'"
            [country]="feedbackCountry()"
            [selectedCountry]="feedbackSelectedCountry()"
            [lang]="lang()"
            (next)="advanceFlagPick()"
          />
          @if (quiz.isFinished()) {
            @if (quiz.getResults(); as res) {
              <app-quiz-result
                [result]="res"
                (playAgain)="playAgain()"
                (goHome)="goHome()"
              />
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .quiz-page {
      display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;
    }
    .map-area {
      flex: 1; position: relative; overflow: hidden; min-height: 0;
    }
    .flag-screen {
      flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
      background: #f5f5f5;
    }
    .answer-panel {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: white; border-top: 1px solid #ddd;
      padding: 0.75rem 1rem;
      display: flex; gap: 8px; align-items: center;
      z-index: 500;
    }
  `],
})
export class QuizComponent {
  protected readonly quiz = inject(QuizService);
  private readonly countryData = inject(CountryDataService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  constructor() {
    effect(() => {
      if (!this.quiz.state()) {
        this.router.navigate(['/']);
      }
    });
  }

  protected readonly config = computed(() => this.quiz.state()?.config ?? null);

  protected readonly headerProgress = computed(() => {
    const p = this.quiz.progress();
    const s = this.quiz.state();
    return {
      score: s?.score ?? 0,
      total: p.total,
      percent: p.percent,
    };
  });

  // ── Info panel state (for map-based modes) ─────────────
  protected readonly wrongCountry = signal<CountryMeta | null>(null);
  protected readonly previousResult = signal<PreviousResult | null>(null);
  protected readonly isRevealed = signal(false);
  private prevResultTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Flag pick mode state (keep old popup behavior) ─────
  protected readonly lastResult = signal<'correct' | 'incorrect' | null>(null);
  protected readonly feedbackCountry = signal<CountryMeta | null>(null);
  protected readonly feedbackSelectedCountry = signal<CountryMeta | null>(null);
  protected readonly feedbackVisible = signal(false);

  protected readonly flagOptions = computed(() => {
    const cc = this.quiz.currentCountry();
    if (!cc) return [];
    return this.quiz.getFlagOptions();
  });

  protected readonly regionCountries = computed(() => {
    const region = this.config()?.region ?? null;
    return this.countryData.getByRegion(region);
  });

  // ── Map click handler ─────────────────────────────────

  protected onMapClick(id: string): void {
    if (this.isRevealed() || this.quiz.isFinished()) return;
    const mode = this.config()?.mode;
    if (mode === 'name-country' || mode === 'pick-flag') return;

    const country = this.quiz.currentCountry();
    const result = this.quiz.checkMapClick(id);

    if (result === 'correct') {
      // Immediately advance, show previous result as compact banner
      this.wrongCountry.set(null);
      this.setPreviousResult({ country: country!, wasCorrect: true });
      this.quiz.next();
    } else {
      const selected = this.countryData.getById(id) ?? null;
      this.wrongCountry.set(selected);
    }
  }

  protected onCountrySelected(country: CountryMeta): void {
    if (this.isRevealed() || this.quiz.isFinished()) return;
    const current = this.quiz.currentCountry();
    const result = this.quiz.checkMapClick(country.id);

    if (result === 'correct') {
      this.wrongCountry.set(null);
      this.setPreviousResult({ country: current!, wasCorrect: true });
      this.quiz.next();
    } else {
      this.wrongCountry.set(country);
    }
  }

  protected doGiveUp(): void {
    if (this.isRevealed()) return;
    this.quiz.giveUp();
    this.wrongCountry.set(null);
    this.isRevealed.set(true);
  }

  protected advanceFromReveal(): void {
    this.isRevealed.set(false);
    const country = this.quiz.currentCountry();
    if (country) {
      this.setPreviousResult({ country, wasCorrect: false });
    }
    this.quiz.next();
  }

  private setPreviousResult(result: PreviousResult): void {
    if (this.prevResultTimer) clearTimeout(this.prevResultTimer);
    this.previousResult.set(result);
    this.prevResultTimer = setTimeout(() => this.previousResult.set(null), 3000);
  }

  // ── Flag pick handlers (old popup flow) ────────────────

  protected onFlagPick(cca2: string): void {
    if (this.feedbackVisible()) return;
    const country = this.quiz.currentCountry();
    const ok = this.quiz.checkFlagPick(cca2);
    const selected = !ok ? (this.countryData.getByCca2(cca2) ?? null) : null;
    this.lastResult.set(ok ? 'correct' : 'incorrect');
    this.feedbackCountry.set(country);
    this.feedbackSelectedCountry.set(selected);
    this.feedbackVisible.set(true);
  }

  protected advanceFlagPick(): void {
    this.feedbackVisible.set(false);
    this.lastResult.set(null);
    this.feedbackSelectedCountry.set(null);
    this.quiz.next();
  }

  protected playAgain(): void {
    const cfg = this.config();
    if (cfg) {
      this.wrongCountry.set(null);
      this.previousResult.set(null);
      this.isRevealed.set(false);
      this.quiz.startQuiz(cfg);
    }
  }

  protected goHome(): void {
    this.quiz.reset();
    this.router.navigate(['/']);
  }
}
