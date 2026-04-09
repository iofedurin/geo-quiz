import { Component, computed, ElementRef, input, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CountryMeta } from '../../core/models/country.model';

const MAX_RESULTS = 8;

@Component({
  selector: 'app-country-autocomplete',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="autocomplete" (keydown)="onKeyDown($event)">
      <!-- Dropdown (opens upward) -->
      @if (isOpen() && filtered().length) {
        <ul class="dropdown" role="listbox">
          @for (c of filtered(); track c.id; let i = $index) {
            <li class="option" role="option"
                [class.focused]="focusedIndex() === i"
                (mousedown)="select(c)">
              <img class="opt-flag" [src]="c.flagSvg" [alt]="c.cca2" />
              <span>{{ lang() === 'ru' ? c.name.ru : c.name.en }}</span>
            </li>
          }
        </ul>
      }

      <div class="input-row">
        <input #inputEl class="search-input"
               [ngModel]="query()"
               (ngModelChange)="onQuery($event)"
               (focus)="isOpen.set(true)"
               (blur)="onBlur()"
               [placeholder]="placeholder()"
               autocomplete="off"
               spellcheck="false" />
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex: 1; min-width: 0; }
    .autocomplete { position: relative; display: flex; flex-direction: column; width: 100%; }

    .dropdown {
      position: absolute; bottom: 100%; left: 0; right: 0; margin-bottom: 6px;
      background: white; border: 1px solid #ddd; border-radius: 10px;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.15);
      list-style: none; margin-top: 0; padding: 4px 0;
      max-height: 280px; overflow-y: auto; z-index: 600;
    }
    .option {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; cursor: pointer; font-size: 0.9rem; color: #222;
      transition: background 0.1s;
      &:hover, &.focused { background: #f0f4ff; }
    }
    .opt-flag {
      width: 28px; height: 19px; object-fit: contain;
      border-radius: 2px; border: 1px solid #e0e0e0; flex-shrink: 0;
    }

    .input-row { display: flex; gap: 0; }
    .search-input {
      flex: 1; padding: 0.55rem 0.85rem;
      border: 2px solid #c5cae9; border-radius: 10px;
      font-size: 1rem; outline: none; background: white;
      &:focus { border-color: #1a237e; }
    }
  `],
})
export class CountryAutocompleteComponent {
  readonly countries = input.required<CountryMeta[]>();
  readonly lang = input('ru');
  readonly placeholder = input('');
  readonly selected = output<CountryMeta>();
  readonly cleared = output<void>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;

  readonly query = signal('');
  readonly isOpen = signal(false);
  readonly focusedIndex = signal(-1);

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const lang = this.lang();
    return this.countries()
      .filter(c => {
        const name = (lang === 'ru' ? c.name.ru : c.name.en).toLowerCase();
        return name.includes(q);
      })
      .sort((a, b) => {
        const an = (lang === 'ru' ? a.name.ru : a.name.en).toLowerCase();
        const bn = (lang === 'ru' ? b.name.ru : b.name.en).toLowerCase();
        return (an.startsWith(q) ? 0 : 1) - (bn.startsWith(q) ? 0 : 1) || an.localeCompare(bn);
      })
      .slice(0, MAX_RESULTS);
  });

  onQuery(val: string): void {
    this.query.set(val);
    this.focusedIndex.set(-1);
    this.isOpen.set(true);
  }

  onKeyDown(e: KeyboardEvent): void {
    const list = this.filtered();
    if (!list.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusedIndex.set(Math.min(this.focusedIndex() + 1, list.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusedIndex.set(Math.max(this.focusedIndex() - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = this.focusedIndex();
      const hit = idx >= 0 ? list[idx] : list.length === 1 ? list[0] : null;
      if (hit) this.select(hit);
    } else if (e.key === 'Escape') {
      this.isOpen.set(false);
    }
  }

  select(country: CountryMeta): void {
    this.query.set('');
    this.isOpen.set(false);
    this.focusedIndex.set(-1);
    this.selected.emit(country);
    setTimeout(() => this.inputEl?.nativeElement.focus(), 0);
  }

  onBlur(): void {
    // Delay so mousedown on option fires first
    setTimeout(() => this.isOpen.set(false), 150);
  }

  focus(): void {
    this.inputEl?.nativeElement.focus();
  }
}
