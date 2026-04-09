import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LanguageToggleComponent } from './shared/components/language-toggle.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, LanguageToggleComponent],
  template: `
    <header class="app-header">
      <a routerLink="/" class="app-brand">GeoQuiz</a>
      <app-language-toggle />
    </header>
    <main class="app-main">
      <router-outlet />
    </main>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; width: 100%; height: 100vh; overflow: hidden; }
    .app-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 1rem; height: 52px;
      background: #1a237e; color: white; flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .app-brand {
      color: white; text-decoration: none;
      font-size: 1.25rem; font-weight: 700; letter-spacing: 1px;
    }
    .app-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  `],
})
export class App {}
