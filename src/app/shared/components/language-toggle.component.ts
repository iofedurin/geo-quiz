import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [TranslocoPipe],
  template: `
    <button class="lang-btn" (click)="toggle()" [title]="'nav.language' | transloco">
      {{ activeLang() === 'ru' ? 'EN' : 'RU' }}
    </button>
  `,
  styles: [`
    .lang-btn {
      background: transparent;
      border: 2px solid rgba(255,255,255,0.6);
      color: white;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.5px;
      transition: background 0.2s;
      &:hover { background: rgba(255,255,255,0.15); }
    }
  `],
})
export class LanguageToggleComponent {
  private readonly transloco = inject(TranslocoService);

  readonly activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  toggle(): void {
    this.transloco.setActiveLang(this.activeLang() === 'ru' ? 'en' : 'ru');
  }
}
