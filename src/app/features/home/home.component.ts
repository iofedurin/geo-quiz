import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { QuizService } from '../../core/services/quiz.service';
import type { QuizMode } from '../../core/models/quiz.model';

const MODES: { value: QuizMode; key: string }[] = [
  { value: 'find-by-name',    key: 'modes.findByName' },
  { value: 'find-by-capital', key: 'modes.findByCapital' },
  { value: 'find-by-flag',    key: 'modes.findByFlag' },
  { value: 'name-country',    key: 'modes.nameCountry' },
  { value: 'pick-flag',       key: 'modes.pickFlag' },
];

const REGIONS: { value: string | null; key: string }[] = [
  { value: null,       key: 'regions.world' },
  { value: 'Africa',   key: 'regions.africa' },
  { value: 'Americas', key: 'regions.americas' },
  { value: 'Asia',     key: 'regions.asia' },
  { value: 'Europe',   key: 'regions.europe' },
  { value: 'Oceania',  key: 'regions.oceania' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <div class="home-page">
      <div class="home-card">
        <h1 class="home-title">{{ 'home.title' | transloco }}</h1>
        <p class="home-subtitle">{{ 'home.subtitle' | transloco }}</p>

        <!-- Mode -->
        <section class="section">
          <label class="section-label">{{ 'home.selectMode' | transloco }}</label>
          <div class="radio-group">
            @for (m of modes; track m.value) {
              <label class="radio-item" [class.active]="selectedMode() === m.value">
                <input type="radio" name="mode" [value]="m.value"
                  [checked]="selectedMode() === m.value"
                  (change)="selectedMode.set(m.value)" />
                {{ m.key | transloco }}
              </label>
            }
          </div>
        </section>

        <!-- Region -->
        <section class="section">
          <label class="section-label">{{ 'home.selectRegion' | transloco }}</label>
          <div class="btn-group">
            @for (r of regions; track r.key) {
              <button class="region-btn" [class.active]="selectedRegion() === r.value"
                (click)="selectedRegion.set(r.value)">
                {{ r.key | transloco }}
              </button>
            }
          </div>
        </section>

        <button class="start-btn" (click)="start()">
          {{ 'home.start' | transloco }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .home-page {
      display: flex; align-items: center; justify-content: center;
      flex: 1; padding: 1rem;
      background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%);
      overflow-y: auto;
    }
    .home-card {
      background: white; border-radius: 16px;
      padding: 2rem 2.5rem; max-width: 520px; width: 100%;
      box-shadow: 0 8px 32px rgba(26,35,126,0.15);
    }
    .home-title {
      margin: 0 0 0.25rem; font-size: 2rem; color: #1a237e; font-weight: 800;
    }
    .home-subtitle { margin: 0 0 1.5rem; color: #666; font-size: 1rem; }

    .section { margin-bottom: 1.25rem; }
    .section-label {
      display: block; font-weight: 600; color: #333;
      margin-bottom: 0.5rem; font-size: 0.9rem; text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .radio-group { display: flex; flex-direction: column; gap: 6px; }
    .radio-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 8px;
      cursor: pointer; font-size: 0.95rem; color: #444;
      border: 2px solid transparent; transition: all 0.15s;
      &.active { background: #e8eaf6; border-color: #3949ab; color: #1a237e; font-weight: 600; }
      &:hover:not(.active) { background: #f5f5f5; }
      input { accent-color: #1a237e; }
    }

    .btn-group { display: flex; flex-wrap: wrap; gap: 8px; }
    .region-btn {
      padding: 6px 14px; border-radius: 20px;
      border: 2px solid #c5cae9; background: white;
      color: #555; cursor: pointer; font-size: 0.9rem;
      transition: all 0.15s;
      &.active { background: #1a237e; border-color: #1a237e; color: white; font-weight: 600; }
      &:hover:not(.active) { border-color: #3949ab; color: #1a237e; }
    }

    .start-btn {
      width: 100%; margin-top: 1.5rem;
      padding: 0.75rem; font-size: 1.1rem; font-weight: 700;
      background: #1a237e; color: white;
      border: none; border-radius: 10px; cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      &:hover { background: #283593; transform: translateY(-1px); }
      &:active { transform: translateY(0); }
    }
  `],
})
export class HomeComponent {
  protected readonly modes = MODES;
  protected readonly regions = REGIONS;

  protected readonly selectedMode = signal<QuizMode>('find-by-name');
  protected readonly selectedRegion = signal<string | null>('Europe');

  private readonly quiz = inject(QuizService);
  private readonly router = inject(Router);

  start(): void {
    this.quiz.startQuiz({
      mode: this.selectedMode(),
      region: this.selectedRegion(),
      mapView: 'globe',
    });
    this.router.navigate(['/quiz']);
  }
}
