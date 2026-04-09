import {
  ApplicationConfig,
  Injectable,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
class AppTranslocoLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);
  getTranslation(lang: string) {
    return this.http.get<Record<string, unknown>>(`assets/i18n/${lang}.json`);
  }
}

import { routes } from './app.routes';
import { CountryDataService } from './core/services/country-data.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // Роутинг с HashLocationStrategy (нужно для GitHub Pages — нет поддержки SPA routing)
    provideRouter(routes, withHashLocation()),

    provideHttpClient(),

    // Transloco — runtime переключение языка EN/RU
    provideTransloco({
      config: {
        availableLangs: ['ru', 'en'],
        defaultLang: 'ru',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: AppTranslocoLoader,
    }),

    // Загрузка данных стран при старте приложения
    provideAppInitializer(() => {
      const countryData = inject(CountryDataService);
      return countryData.init();
    }),
  ],
};
