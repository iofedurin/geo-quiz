import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-flag-grid',
  standalone: true,
  template: `
    <div class="flag-grid">
      @for (code of flags(); track code) {
        <button
          class="flag-cell"
          [class.selected]="selected() === code"
          [disabled]="locked()"
          (click)="pick(code)"
        >
          <img [src]="'assets/flags/' + code.toLowerCase() + '.svg'" [alt]="code" />
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .flag-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 8px;
      padding: 8px;
      flex: 1;
      min-height: 0;
      box-sizing: border-box;
    }
    .flag-cell {
      border: 3px solid transparent;
      border-radius: 6px;
      background: #eee;
      cursor: pointer;
      padding: 4px;
      transition: border-color 0.15s, transform 0.1s;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      min-height: 0;
      &:hover:not([disabled]) { border-color: #1a237e; transform: scale(1.02); }
      &.selected { border-color: #1a237e; }
      &[disabled] { cursor: default; }
      img { width: 100%; height: 100%; object-fit: contain; }
    }
  `],
})
export class FlagGridComponent {
  readonly flags = input<string[]>([]);
  readonly locked = input(false);
  readonly flagSelected = output<string>();

  readonly selected = signal<string | null>(null);

  pick(code: string): void {
    if (this.locked()) return;
    this.selected.set(code);
    this.flagSelected.emit(code);
  }
}
