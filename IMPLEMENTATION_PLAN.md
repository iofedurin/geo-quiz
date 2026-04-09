# GeoQuiz - План реализации

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Технологический стек](#2-технологический-стек)
3. [Источники данных](#3-источники-данных)
4. [Архитектура приложения](#4-архитектура-приложения)
5. [Детальный план реализации](#5-детальный-план-реализации)
6. [Тестирование](#6-тестирование)
7. [Деплой](#7-деплой)
8. [Структура файлов](#8-структура-файлов)

---

## 1. Обзор проекта

Мини-сайт для подготовки к квизам по географии с двумя основными режимами:

### Режим 1: "Найди страну"
- Показывается карта (мир/континент/регион), все страны "пустые" (без подписей)
- Называется страна (по названию / столице / флагу), пользователь должен кликнуть на неё на карте
- При правильном ответе: границы подсвечиваются зелёным, показывается инфо (название, столица, флаг)
- При неправильном: подсвечивается красным, продолжается
- Продолжается, пока не пройдены все страны в выбранном регионе

### Режим 2: "Назови страну"
- На карте выделяется случайная страна
- Пользователь должен ввести её название (и/или столицу)
- Также предлагаются 9 флагов (один правильный), нужно выбрать флаг этой страны
- Подборка флагов — из стран того же региона (чтобы было сложнее, но не из всех стран мира)

### Общие требования
- Два языка: русский / английский, переключение на лету
- Карта зумится, панорамируется; режим глобуса с вращением
- Хостинг на GitHub Pages (статический сайт)

---

## 2. Технологический стек

### 2.1. Фреймворк: Angular 21 (standalone components)

**Почему**: Требование заказчика. Используем последнюю версию (21.2.x) с standalone components (без NgModule).

```
ng new geo-quiz --style=scss --routing --ssr=false
```

> **Важно**: При создании проекта указать `--ssr=false`, т.к. GitHub Pages — статический хостинг, SSR не нужен.

### 2.2. Карты: Leaflet + D3-geo (гибридный подход)

**Исследованные варианты**:

| Библиотека | Глобус | Без тайлов | Клик по странам | Bundle size | Angular |
|---|---|---|---|---|---|
| **Leaflet** | Нет (только 2D) | Да | Отлично | ~42kB gzip | @bluehalo/ngx-leaflet@21 |
| **D3-geo** | Да (orthographic) | Да | Да (SVG paths) | ~30kB gzip | Напрямую |
| **MapLibre GL JS** | Да (v5+, WebGL) | Сложно* | Да | ~200kB gzip | @maplibre/ngx-maplibre-gl@19 |
| **OpenLayers** | Нет | Да | Да | ~400kB gzip | Нет official wrapper |
| **Globe.gl** | Да (Three.js) | Да | Да | ~500kB gzip | Нет wrapper |

> *MapLibre GL JS требует WebGL и стилевой JSON. Можно создать "пустой" стиль с только GeoJSON-слоем, но это не типичное использование. Кроме того, bundle size значительно больше.

**Решение: Leaflet (2D) + D3-geo (глобус)**

Причины:
1. **Leaflet** — лучший выбор для 2D карты с кликабельными странами:
   - Нативная поддержка GeoJSON через `L.geoJSON()`
   - `onEachFeature` для обработки кликов
   - `setStyle()` для подсветки (зелёный/красный)
   - Работает без тайл-сервера (только GeoJSON поверх цветного фона)
   - Маленький bundle (~42kB)
   - Зрелая экосистема, отличная документация
   - Angular-обёртка: `@bluehalo/ngx-leaflet@21` (поддерживает Angular 19, standalone)

2. **D3-geo** — для режима глобуса:
   - `geoOrthographic()` проекция даёт 3D-вид глобуса
   - Drag-to-rotate через `d3.drag()`
   - SVG paths кликабельны нативно
   - Лёгкий (~30kB)
   - Не требует тайлов, WebGL или внешних сервисов

**Режим переключения**: Пользователь выбирает "Карта" (Leaflet) или "Глобус" (D3-geo). Это два отдельных Angular-компонента с общим интерфейсом.

### 2.3. Интернационализация: Transloco (@jsverse/transloco)

**Исследованные варианты**:

| Подход | Runtime switching | Lazy loading | Status |
|---|---|---|---|
| @angular/localize | Нет (build-time) | N/A | Не подходит |
| ngx-translate | Да | Требует доп. настройки | Был заброшен, новые мейнтейнеры |
| **@jsverse/transloco** | **Да** | **Встроенный** | **Активно поддерживается** |

**Почему Transloco**:
- Переключение языка на лету без перезагрузки (`reRenderOnLangChange: true`)
- Lazy loading скоупов (можно отдельно грузить переводы стран)
- Структурная директива `*transloco` — один subscription на шаблон
- Активная разработка (январь 2026 — свежий релиз)
- Плагин persist для сохранения выбранного языка
- ~8kB gzip

**Структура переводов**:
```
assets/i18n/
├── en.json          # UI labels (кнопки, заголовки)
├── ru.json          # UI labels
├── countries/
│   ├── en.json      # Country names & capitals in English
│   └── ru.json      # Country names & capitals in Russian
```

### 2.4. CSS / UI: Angular Material + SCSS

- Angular Material для базовых компонентов (toolbar, buttons, dialogs, select)
- SCSS для кастомных стилей карты
- Responsive design (mobile-first)

---

## 3. Источники данных

### 3.1. Границы стран (GeoJSON/TopoJSON)

**Источник**: `world-atlas` npm-пакет (TopoJSON, из Natural Earth Data)

| Файл | Размер | Детализация | Стран |
|---|---|---|---|
| `countries-110m.json` | 108 KB | Низкая (мир) | 177 |
| `countries-50m.json` | 756 KB | Средняя (рабочая) | 242 |
| `countries-10m.json` | ~4.9 MB | Высокая (зум) | 258 |

**Решение**: Использовать `countries-50m.json` как основной — хороший баланс размера и детализации.

```bash
npm install world-atlas topojson-client
```

**Конвертация TopoJSON → GeoJSON в runtime**:
```typescript
import { feature } from 'topojson-client';
import topology from 'world-atlas/countries-50m.json';

const countries = feature(topology, topology.objects.countries);
// countries.features — массив GeoJSON Feature с geometry и properties
```

> **Важно**: Каждая feature в world-atlas имеет `id` — это трёхзначный ISO 3166-1 numeric code (например, "643" для России). Свойство `properties.name` содержит английское название.

### 3.2. Метаданные стран

**Источник**: `mledoze/countries` (GitHub) — JSON с переводами на русский

Этот датасет содержит для каждой страны:
- `name.common` / `name.official` — английское название
- `translations.rus.common` / `translations.rus.official` — русское название
- `capital` — массив столиц (только на английском!)
- `cca2` (ISO Alpha-2), `cca3` (ISO Alpha-3), `ccn3` (ISO Numeric)
- `region` / `subregion` — континент / подрегион
- `flag` — emoji флаг
- `flags.svg` / `flags.png` — URL флага

**Проблема: столицы только на английском.** `mledoze/countries` НЕ содержит переводов столиц.

**Решение**: Создать вручную/полуавтоматически JSON-маппинг столиц RU/EN:
1. Скрипт-генератор: взять список столиц из `mledoze/countries`
2. Перевести через Wikidata SPARQL query:
```sparql
SELECT ?country ?countryLabel ?capital ?capitalLabel ?capitalLabelRu WHERE {
  ?country wdt:P31 wd:Q6256.     # instance of country
  ?country wdt:P36 ?capital.      # has capital
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
    ?country rdfs:label ?countryLabel.
    ?capital rdfs:label ?capitalLabel.
  }
  OPTIONAL {
    ?capital rdfs:label ?capitalLabelRu.
    FILTER(LANG(?capitalLabelRu) = "ru")
  }
}
```
3. Результат сохранить как `data/capitals-i18n.json`
4. При необходимости — ручная корректировка (10-15 спорных случаев)

### 3.3. Флаги

**Источник**: flagcdn.com (бесплатный CDN, Cloudflare, public domain)

```html
<!-- SVG -->
<img src="https://flagcdn.com/de.svg" alt="Germany" />

<!-- PNG с шириной 80px -->
<img src="https://flagcdn.com/w80/de.png" alt="Germany" />
```

URL использует ISO 3166-1 Alpha-2 код (lowercase): `https://flagcdn.com/{cca2}.svg`

> **Почему CDN вместо flag-icons npm**: Пакет `flag-icons` содержит дублирующиеся SVG (1x1 и 4x3 варианты), что ломает Angular build из-за конфликта имён файлов. flagcdn.com — нулевой bundle size, быстрый глобальный CDN, всегда актуальные флаги. RestCountries API уже возвращает URL флагов с flagcdn.com.

### 3.4. Связь данных (маппинг)

Ключевая проблема: связать GeoJSON features с метаданными стран.

**world-atlas** использует ISO 3166-1 Numeric (`id: "643"` для России)
**mledoze/countries** имеет `ccn3: "643"`

→ Связь через `ISO Numeric code` (`ccn3` ↔ `feature.id`)

**Скрипт подготовки данных** (`scripts/prepare-data.ts`):
1. Загрузить TopoJSON из `world-atlas`
2. Загрузить метаданные из `mledoze/countries`
3. Связать по ISO Numeric
4. Обогатить GeoJSON features метаданными (название RU/EN, столица RU/EN, регион, код флага)
5. Сохранить итоговый JSON в `src/assets/data/`

> **Важно про Natural Earth ISO коды**: У некоторых стран (Франция, Норвегия, Косово) поле `ISO_A2`/`ISO_A3` содержит `-99`. Но в world-atlas используется numeric code, который в большинстве случаев корректен. Для пограничных случаев — ручной маппинг.

### 3.5. Группировка по регионам

Из `mledoze/countries`:
```
region: "Africa" | "Americas" | "Asia" | "Europe" | "Oceania" | "Antarctic"
subregion: "Western Europe" | "Eastern Asia" | "South America" | ...
```

Для квиза используем `region` как основной фильтр + возможность выбрать `subregion`.

### 3.6. Стратегия обновления данных

Границы стран и метаданные меняются крайне редко (1-2 изменения в год).

**Подход**:
- Данные зашиваются в бандл при сборке (не загружаются из API в runtime)
- Скрипт `bun run update-data` запускает `scripts/prepare-data.ts`:
  - Скачивает свежие данные из mledoze/countries (GitHub raw)
  - Пересобирает итоговые JSON
  - Валидирует (все ли страны из GeoJSON имеют метаданные)
- Запускать вручную раз в полгода или при необходимости

---

## 4. Архитектура приложения

### 4.1. Структура модулей (standalone components)

```
src/app/
├── app.component.ts              # Root: toolbar + router-outlet
├── app.routes.ts                 # Routing
├── app.config.ts                 # Providers (Transloco, etc.)
│
├── core/                         # Core services (singleton)
│   ├── services/
│   │   ├── country-data.service.ts    # Загрузка и доступ к данным стран
│   │   ├── quiz.service.ts            # Логика квиза (состояние, проверки)
│   │   ├── region.service.ts          # Фильтрация по регионам
│   │   └── language.service.ts        # Обёртка над Transloco
│   └── models/
│       ├── country.model.ts           # Интерфейс Country
│       ├── quiz.model.ts              # QuizState, QuizMode, QuizResult
│       └── region.model.ts            # Region enum
│
├── features/
│   ├── home/                          # Главная страница (выбор режима)
│   │   └── home.component.ts
│   ├── quiz/                          # Страница квиза
│   │   ├── quiz.component.ts          # Контейнер квиза
│   │   ├── quiz-header/               # Текущий вопрос, прогресс
│   │   ├── quiz-result/               # Результаты после завершения
│   │   └── quiz-settings/             # Настройки перед стартом
│   └── map/                           # Компоненты карты
│       ├── map-container.component.ts # Обёртка (переключает flat/globe)
│       ├── flat-map.component.ts      # Leaflet карта
│       ├── globe-map.component.ts     # D3 глобус
│       └── country-info-popup.component.ts  # Попап с инфой о стране
│
├── shared/
│   ├── components/
│   │   ├── flag-image.component.ts    # Отображение флага по коду
│   │   ├── language-toggle.component.ts # Переключатель языка
│   │   └── flag-grid.component.ts     # Сетка 3x3 с флагами для выбора
│   └── pipes/
│       └── country-name.pipe.ts       # Pipe для получения имени по языку
│
└── assets/
    ├── data/
    │   ├── countries-geo.json         # TopoJSON / обработанный GeoJSON
    │   ├── countries-meta.json        # Метаданные стран (имена, столицы, коды)
    │   └── capitals-i18n.json         # Перевод столиц RU
    ├── i18n/
    │   ├── en.json                    # UI переводы EN
    │   ├── ru.json                    # UI переводы RU
    │   └── countries/
    │       ├── en.json                # Названия стран EN
    │       └── ru.json                # Названия стран RU
    └── flags/                         # (если хранить локально)
```

### 4.2. Ключевые интерфейсы

```typescript
// country.model.ts
export interface Country {
  id: string;            // ISO Numeric code ("643")
  cca2: string;          // ISO Alpha-2 ("RU")
  cca3: string;          // ISO Alpha-3 ("RUS")
  name: {
    en: string;          // "Russia"
    ru: string;          // "Россия"
  };
  capital: {
    en: string;          // "Moscow"
    ru: string;          // "Москва"
  };
  region: string;        // "Europe"
  subregion: string;     // "Eastern Europe"
  flagEmoji: string;     // "🇷🇺"
  flagSvgPath: string;   // "assets/flags/ru.svg" или URL
}

// quiz.model.ts
export type QuizMode = 'find-by-name' | 'find-by-capital' | 'find-by-flag' | 'name-country' | 'pick-flag';
export type MapView = 'flat' | 'globe';

export interface QuizConfig {
  mode: QuizMode;
  region: string | null;  // null = весь мир
  mapView: MapView;
}

export interface QuizState {
  config: QuizConfig;
  countries: Country[];          // Все страны в текущем регионе
  currentIndex: number;
  currentCountry: Country;       // Текущий вопрос
  answered: Map<string, boolean>; // countryId → correct/incorrect
  score: number;
  total: number;
}
```

### 4.3. Общий интерфейс карты

Оба компонента карты (flat и globe) реализуют общий интерфейс:

```typescript
// map-component.interface.ts
export interface MapComponent {
  // Input: список стран с их состоянием (нейтральная / зелёная / красная)
  countryStates: Map<string, 'neutral' | 'correct' | 'incorrect' | 'highlighted'>;

  // Input: регион для фильтрации/зума
  region: string | null;

  // Output: пользователь кликнул на страну
  countryClicked: EventEmitter<string>;  // countryId

  // Методы
  highlightCountry(countryId: string, color: 'correct' | 'incorrect' | 'highlighted'): void;
  resetCountry(countryId: string): void;
  zoomToRegion(region: string): void;
  showCountryInfo(countryId: string, info: Country): void;
}
```

### 4.4. Поток данных (Quiz Flow)

```
1. Пользователь выбирает: режим + регион + тип карты
2. QuizService загружает список стран для региона, перемешивает
3. QuizService выдаёт первый вопрос → UI отображает (имя/столицу/флаг)
4. Пользователь кликает на карту
5. MapComponent → emit countryClicked(id)
6. QuizService проверяет ответ:
   - Правильно → highlight зелёным, показать инфо, score++
   - Неправильно → highlight красным кликнутую страну
7. Через 1.5 сек → следующий вопрос
8. Когда все страны пройдены → показать результат
```

Для Режима 2 ("Назови страну"):
```
1. QuizService выбирает случайную страну
2. MapComponent подсвечивает её (highlighted)
3. Пользователь вводит имя / выбирает из флагов
4. Проверка → зелёный/красный
5. Далее аналогично
```

---

## 5. Детальный план реализации

### Фаза 0: Инициализация проекта (1 шаг)

**Шаг 0.1: Создание проекта и базовая настройка**

```bash
# Создать Angular проект (без SSR — GitHub Pages статический хостинг)
ng new geo-quiz --style=scss --ssr=false --skip-tests=false

# Перейти в проект
cd geo-quiz

# Установить зависимости
bun add leaflet d3 topojson-client
bun add @jsverse/transloco

# Dev зависимости
bun add -d @types/leaflet @types/d3 @types/topojson-client
```

Настроить `.gitignore`:
```
node_modules/
dist/
.angular/
```

Настроить `angular.json`:
- Добавить Leaflet CSS в `styles`: `"node_modules/leaflet/dist/leaflet.css"`

---

### Фаза 1: Данные (3 шага)

**Шаг 1.1: Скрипт подготовки данных**

Создать `scripts/prepare-data.ts`:
1. Загрузить `countries.json` из `mledoze/countries` (GitHub raw URL)
2. Загрузить TopoJSON из `world-atlas/countries-50m.json`
3. Для каждой feature в TopoJSON:
   - Найти соответствие в mledoze по `ccn3` ↔ `feature.id`
   - Извлечь: name_en, name_ru, capital_en, cca2, cca3, region, subregion
4. Сохранить `src/assets/data/countries-meta.json`
5. Скопировать TopoJSON в `src/assets/data/countries-geo.json`
6. Вывести отчёт о несопоставленных странах

**Как запускать**: `npx ts-node scripts/prepare-data.ts` (или `tsx`)

**Шаг 1.2: Перевод столиц на русский**

Варианты:
- **A (рекомендуемый)**: Запустить SPARQL запрос к Wikidata, получить JSON, обработать скриптом
- **B**: Ручной файл `data/capitals-ru.json` (~200 записей)

Создать файл `src/assets/data/capitals-i18n.json`:
```json
{
  "643": { "en": "Moscow", "ru": "Москва" },
  "840": { "en": "Washington, D.C.", "ru": "Вашингтон" },
  ...
}
```

**Шаг 1.3: Файлы переводов UI**

`src/assets/i18n/en.json`:
```json
{
  "home": {
    "title": "GeoQuiz",
    "subtitle": "Geography Quiz Trainer",
    "startQuiz": "Start Quiz",
    "selectMode": "Select Mode",
    "selectRegion": "Select Region"
  },
  "quiz": {
    "findCountry": "Find {{country}} on the map",
    "findCapital": "Find the country with capital {{capital}}",
    "findByFlag": "Find the country with this flag",
    "nameCountry": "What country is highlighted?",
    "pickFlag": "Which flag belongs to this country?",
    "correct": "Correct!",
    "incorrect": "Incorrect!",
    "score": "Score: {{score}} / {{total}}",
    "next": "Next",
    "finish": "Finish"
  },
  "regions": {
    "world": "World",
    "africa": "Africa",
    "americas": "Americas",
    "asia": "Asia",
    "europe": "Europe",
    "oceania": "Oceania"
  },
  "modes": {
    "findByName": "Find by Country Name",
    "findByCapital": "Find by Capital",
    "findByFlag": "Find by Flag",
    "nameCountry": "Name the Country",
    "pickFlag": "Pick the Flag"
  },
  "settings": {
    "language": "Language",
    "mapView": "Map View",
    "flat": "Flat Map",
    "globe": "Globe"
  }
}
```

`src/assets/i18n/ru.json` — аналогичная структура с русскими текстами.

---

### Фаза 2: Ядро приложения (4 шага)

**Шаг 2.1: Настройка Transloco**

В `app.config.ts`:
```typescript
import { provideTransloco, TranslocoHttpLoader } from '@jsverse/transloco';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['en', 'ru'],
        defaultLang: 'ru',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // ... Angular Material, Router
  ],
};
```

> **Почему `defaultLang: 'ru'`**: Основной пользователь русскоязычный (готовится к квизам).

Transloco Loader будет автоматически загружать JSON из `assets/i18n/{lang}.json`.

Для данных стран (названия, столицы) — не используем Transloco, а используем свой `CountryDataService`, который возвращает данные на нужном языке. Причина: данные стран — это не UI-переводы, а бизнес-данные, и их структура отличается.

**Шаг 2.2: CountryDataService**

```typescript
@Injectable({ providedIn: 'root' })
export class CountryDataService {
  private countries: Country[] = [];
  private countriesMap = new Map<string, Country>();
  private geoData: any; // GeoJSON FeatureCollection

  constructor(private http: HttpClient) {}

  async loadData(): Promise<void> {
    // Загрузить TopoJSON, конвертировать в GeoJSON
    // Загрузить метаданные стран
    // Связать и сохранить в memory
  }

  getCountriesByRegion(region: string | null): Country[] { ... }
  getCountryById(id: string): Country | undefined { ... }
  getGeoJSON(region?: string): FeatureCollection { ... }
  getCountryName(id: string, lang: string): string { ... }
  getCapitalName(id: string, lang: string): string { ... }
}
```

Данные загружаются один раз при старте приложения через `APP_INITIALIZER` или `resolve` в роутере.

**Шаг 2.3: QuizService**

```typescript
@Injectable({ providedIn: 'root' })
export class QuizService {
  private state = signal<QuizState | null>(null);

  readonly currentQuestion = computed(() => { ... });
  readonly progress = computed(() => { ... });
  readonly isFinished = computed(() => { ... });

  startQuiz(config: QuizConfig): void {
    // Получить страны для региона
    // Перемешать (Fisher-Yates shuffle)
    // Инициализировать state
  }

  checkAnswer(countryId: string): boolean {
    // Режим 1: сравнить кликнутый id с текущим вопросом
    // Обновить state
  }

  checkNameAnswer(input: string): boolean {
    // Режим 2: сравнить введённое имя (нормализация: trim, toLowerCase)
  }

  checkFlagAnswer(cca2: string): boolean {
    // Сравнить выбранный флаг с текущей страной
  }

  getFlagOptions(): string[] {
    // Вернуть 9 кодов флагов (1 правильный + 8 рандомных из того же региона)
  }

  nextQuestion(): void { ... }
  getResults(): QuizResult { ... }
}
```

> **Важно**: Используем Angular Signals для реактивного состояния — это современный подход в Angular 19.

**Шаг 2.4: Роутинг**

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'quiz', component: QuizComponent },
  { path: '**', redirectTo: '' },
];
```

В `app.config.ts` использовать `withHashLocation()` (современный Angular 19+ API):
```typescript
import { provideRouter, withHashLocation } from '@angular/router';

providers: [
  provideRouter(routes, withHashLocation()),
  // ...
]
```

> **Почему HashLocationStrategy**: GitHub Pages не поддерживает SPA routing. URL будут вида `https://user.github.io/geo-quiz/#/quiz`, но это работает без серверной настройки. Альтернатива — `404.html` хак, но он менее надёжен (Brave показывает предупреждение при 404 статусе).

---

### Фаза 3: Компоненты карты (3 шага)

**Шаг 3.1: Flat Map (Leaflet)**

```typescript
@Component({
  selector: 'app-flat-map',
  standalone: true,
  imports: [LeafletModule],
  template: `<div leaflet [leafletOptions]="options" (leafletMapReady)="onMapReady($event)"></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; } div { height: 100%; }`],
})
export class FlatMapComponent implements OnInit, OnChanges {
  @Input() countryStates!: Map<string, string>;
  @Input() region: string | null = null;
  @Output() countryClicked = new EventEmitter<string>();

  private map!: L.Map;
  private geoLayer!: L.GeoJSON;
  private layerMap = new Map<string, L.Layer>(); // countryId → layer

  options: L.MapOptions = {
    zoom: 2,
    center: [20, 0],
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
    // НЕТ tileLayer — только GeoJSON на цветном фоне
  };

  onMapReady(map: L.Map): void {
    this.map = map;
    this.loadGeoJSON();
  }

  private loadGeoJSON(): void {
    const geoData = this.countryDataService.getGeoJSON(this.region);

    this.geoLayer = L.geoJSON(geoData, {
      style: (feature) => this.getCountryStyle(feature),
      onEachFeature: (feature, layer) => {
        this.layerMap.set(feature.id as string, layer);
        layer.on('click', () => this.countryClicked.emit(feature.id as string));
        layer.on('mouseover', (e) => this.highlightHover(e));
        layer.on('mouseout', (e) => this.resetHover(e));
      },
    }).addTo(this.map);
  }

  private getCountryStyle(feature: any): L.PathOptions {
    const state = this.countryStates?.get(feature.id);
    const baseStyle = {
      fillColor: '#e0e0e0',  // Нейтральный серый
      weight: 1,
      color: '#999',
      fillOpacity: 0.7,
    };

    switch (state) {
      case 'correct': return { ...baseStyle, fillColor: '#4CAF50', fillOpacity: 0.8 };
      case 'incorrect': return { ...baseStyle, fillColor: '#F44336', fillOpacity: 0.8 };
      case 'highlighted': return { ...baseStyle, fillColor: '#FFC107', fillOpacity: 0.8 };
      default: return baseStyle;
    }
  }

  highlightCountry(id: string, state: string): void {
    const layer = this.layerMap.get(id) as L.Path;
    if (layer) {
      layer.setStyle(this.getStyleForState(state));
    }
  }
}
```

**Стилизация "пустой" карты**:
- Фон карты: CSS `background-color: #a3c8f0` (океан, голубой)
- Страны: серая заливка, тонкие границы
- Нет тайлового слоя — чистый GeoJSON
- Hover: лёгкое осветление

**Шаг 3.2: Globe Map (D3-geo)**

```typescript
@Component({
  selector: 'app-globe-map',
  standalone: true,
  template: `<div #globeContainer class="globe-container"></div>`,
  styles: [`.globe-container { width: 100%; height: 100%; }`],
})
export class GlobeMapComponent implements AfterViewInit, OnChanges {
  @ViewChild('globeContainer') container!: ElementRef;
  @Input() countryStates!: Map<string, string>;
  @Input() region: string | null = null;
  @Output() countryClicked = new EventEmitter<string>();

  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private projection!: d3.GeoProjection;
  private path!: d3.GeoPath;
  private geoData!: any;

  ngAfterViewInit(): void {
    this.initGlobe();
  }

  private initGlobe(): void {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    // Orthographic проекция = глобус
    this.projection = d3.geoOrthographic()
      .scale(Math.min(width, height) / 2.2)
      .translate([width / 2, height / 2])
      .clipAngle(90);  // Скрывать обратную сторону

    this.path = d3.geoPath().projection(this.projection);

    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Сфера (океан)
    this.svg.append('path')
      .datum({ type: 'Sphere' })
      .attr('d', this.path)
      .attr('fill', '#a3c8f0')
      .attr('stroke', '#666');

    // Страны
    this.geoData = this.countryDataService.getGeoJSON(this.region);
    this.svg.selectAll('.country')
      .data(this.geoData.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', this.path)
      .attr('fill', (d: any) => this.getFillColor(d.id))
      .attr('stroke', '#999')
      .attr('stroke-width', 0.5)
      .on('click', (event: any, d: any) => {
        // Проверяем, что страна видима (не на обратной стороне глобуса)
        const centroid = d3.geoCentroid(d);
        const rotation = this.projection.rotate();
        const distance = d3.geoDistance(centroid, [-rotation[0], -rotation[1]]);
        if (distance < Math.PI / 2) {
          this.countryClicked.emit(d.id);
        }
      });

    // Drag для вращения
    const drag = d3.drag<SVGSVGElement, unknown>()
      .on('drag', (event) => {
        const rotate = this.projection.rotate();
        const k = 0.5; // sensitivity
        this.projection.rotate([
          rotate[0] + event.dx * k,
          rotate[1] - event.dy * k,
        ]);
        this.svg.selectAll('.country').attr('d', this.path as any);
        this.svg.select('path').attr('d', this.path as any); // сфера
      });

    this.svg.call(drag);

    // Zoom (масштабирование глобуса)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        this.projection.scale(
          Math.min(width, height) / 2.2 * event.transform.k
        );
        this.svg.selectAll('.country').attr('d', this.path as any);
        this.svg.select('path').attr('d', this.path as any);
      });

    this.svg.call(zoom);
  }
}
```

> **Про click на обратной стороне глобуса**: Если страна находится на невидимой стороне, клик не должен срабатывать. Используем `d3.geoDistance()` для проверки.

**Шаг 3.3: Map Container (переключатель)**

```typescript
@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [FlatMapComponent, GlobeMapComponent],
  template: `
    @if (mapView() === 'flat') {
      <app-flat-map
        [countryStates]="countryStates()"
        [region]="region()"
        (countryClicked)="onCountryClicked($event)" />
    } @else {
      <app-globe-map
        [countryStates]="countryStates()"
        [region]="region()"
        (countryClicked)="onCountryClicked($event)" />
    }
  `,
})
export class MapContainerComponent {
  mapView = input<MapView>('flat');
  countryStates = input<Map<string, string>>(new Map());
  region = input<string | null>(null);
  countryClicked = output<string>();
}
```

> Используем Angular 19 `input()` / `output()` signal-based API.

---

### Фаза 4: UI компоненты (4 шага)

**Шаг 4.1: Home Component**

Главная страница с выбором:
- Режим квиза (5 вариантов)
- Регион (Мир / Европа / Азия / Африка / Америки / Океания)
- Вид карты (2D / Глобус)
- Кнопка "Начать"

Использовать Angular Material: `mat-card`, `mat-radio-group`, `mat-select`, `mat-button`.

**Шаг 4.2: Quiz Component**

Основной контейнер:
- Верхняя панель: текущий вопрос + прогресс-бар
- Карта (MapContainer)
- Для Режима 2: поле ввода + кнопка проверки + сетка флагов

```typescript
@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [MapContainerComponent, QuizHeaderComponent, FlagGridComponent, ...],
  template: `
    <app-quiz-header [question]="currentQuestion()" [progress]="progress()" />

    <app-map-container
      [mapView]="config.mapView"
      [countryStates]="countryStates()"
      [region]="config.region"
      (countryClicked)="onMapClick($event)" />

    @if (config.mode === 'name-country') {
      <div class="answer-panel">
        <mat-form-field>
          <input matInput [(ngModel)]="nameInput" (keyup.enter)="submitName()" />
        </mat-form-field>
        <button mat-raised-button (click)="submitName()">Check</button>
      </div>
    }

    @if (config.mode === 'pick-flag') {
      <app-flag-grid [flags]="flagOptions()" (flagSelected)="onFlagSelected($event)" />
    }

    @if (isFinished()) {
      <app-quiz-result [results]="results()" />
    }
  `,
})
```

**Шаг 4.3: Country Info Popup**

При правильном ответе — показать popup/overlay с:
- Флаг (SVG)
- Название страны (на текущем языке)
- Столица (на текущем языке)
- Кнопка "Далее"

Использовать Angular Material `mat-card` или кастомный overlay.

**Шаг 4.4: Flag Grid Component**

Сетка 3x3 для выбора флага:
```typescript
@Component({
  selector: 'app-flag-grid',
  template: `
    <div class="flag-grid">
      @for (code of flags(); track code) {
        <button class="flag-cell" (click)="flagSelected.emit(code)">
          <span class="fi fi-{{code}}" style="font-size: 3rem;"></span>
        </button>
      }
    </div>
  `,
  styles: [`.flag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }`],
})
export class FlagGridComponent {
  flags = input<string[]>([]);
  flagSelected = output<string>();
}
```

---

### Фаза 5: Toolbar и язык (2 шага)

**Шаг 5.1: App Toolbar**

```typescript
@Component({
  selector: 'app-root',
  template: `
    <mat-toolbar color="primary">
      <span>{{ 'home.title' | transloco }}</span>
      <span class="spacer"></span>
      <app-language-toggle />
    </mat-toolbar>
    <router-outlet />
  `,
})
```

**Шаг 5.2: Language Toggle**

```typescript
@Component({
  selector: 'app-language-toggle',
  template: `
    <button mat-icon-button [matMenuTriggerFor]="langMenu">
      <span>{{ activeLang() === 'ru' ? 'RU' : 'EN' }}</span>
    </button>
    <mat-menu #langMenu="matMenu">
      <button mat-menu-item (click)="setLang('ru')">Русский</button>
      <button mat-menu-item (click)="setLang('en')">English</button>
    </mat-menu>
  `,
})
export class LanguageToggleComponent {
  private translocoService = inject(TranslocoService);
  activeLang = toSignal(this.translocoService.langChanges$);

  setLang(lang: string): void {
    this.translocoService.setActiveLang(lang);
  }
}
```

> Transloco автоматически перерисует все `transloco` пайпы и директивы при смене языка.

---

### Фаза 6: Полировка (3 шага)

**Шаг 6.1: Responsive Design**

- На мобильных: карта на весь экран, вопрос внизу (overlay)
- На десктопе: карта слева (70%), панель справа (30%)
- Breakpoints: 768px (tablet), 1024px (desktop)

**Шаг 6.2: Анимации и UX**

- Плавная подсветка стран (CSS transition на opacity/fillColor)
- Анимация прогресс-бара
- Toast-уведомления "Правильно!" / "Неправильно!" (Angular CDK overlay или mat-snackbar)
- Звуковые эффекты (опционально, по желанию пользователя)

**Шаг 6.3: Zoom to Region**

При выборе конкретного региона:
- **Leaflet**: `map.fitBounds(geoLayer.getBounds())` — автоматический зум на регион
- **D3-geo**: вычислить центроид региона через `d3.geoCentroid()`, установить `projection.rotate()` и `projection.scale()`

---

## 6. Тестирование

### 6.1. Unit Tests (Jasmine + Karma, встроенные в Angular)

**Что тестировать**:

1. **QuizService** (основная бизнес-логика):
   - `startQuiz()` — корректно инициализирует state, перемешивает страны
   - `checkAnswer()` — правильный/неправильный ответ, обновление score
   - `nextQuestion()` — переход к следующему, корректный index
   - `isFinished()` — true когда все страны пройдены
   - `getFlagOptions()` — возвращает 9 флагов, один из них правильный
   - `checkNameAnswer()` — нормализация ввода (регистр, пробелы)

2. **CountryDataService**:
   - Загрузка и парсинг данных
   - `getCountriesByRegion()` — фильтрация по региону
   - `getCountryById()` — поиск по id
   - `getCountryName(id, lang)` — возврат имени на нужном языке

3. **Pipes**:
   - `countryNamePipe` — корректная трансформация

**Пример теста**:
```typescript
describe('QuizService', () => {
  let service: QuizService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QuizService);
  });

  it('should start quiz with correct number of countries', () => {
    service.startQuiz({ mode: 'find-by-name', region: 'Europe', mapView: 'flat' });
    const state = service.state();
    expect(state?.countries.length).toBeGreaterThan(30);
    expect(state?.currentIndex).toBe(0);
    expect(state?.score).toBe(0);
  });

  it('should increment score on correct answer', () => {
    service.startQuiz({ mode: 'find-by-name', region: null, mapView: 'flat' });
    const correctId = service.currentQuestion()!.id;
    const result = service.checkAnswer(correctId);
    expect(result).toBeTrue();
    expect(service.state()?.score).toBe(1);
  });
});
```

### 6.2. Что НЕ тестировать (для экономии времени)

- Рендеринг карты (Leaflet/D3) — сложно мокать, тестируется визуально
- Angular Material компоненты — они уже протестированы
- Transloco интеграция — проверяется E2E

### 6.3. Запуск тестов

```bash
bun run test              # Unit tests
bun run test -- --watch=false --browsers=ChromeHeadless  # CI
```

---

## 7. Деплой

### 7.1. GitHub Pages через GitHub Actions (рекомендуемый)

Создать `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build --configuration production --base-href /geo-quiz/

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/geo-quiz/browser

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

> **Важно**: путь `dist/geo-quiz/browser` — так Angular 19 структурирует output (папка `browser` внутри).

### 7.2. Локальный деплой (альтернатива)

```bash
# Установить angular-cli-ghpages
bunx ng add angular-cli-ghpages

# Деплой
bunx ng deploy --base-href=/geo-quiz/
```

### 7.3. Конфигурация для GitHub Pages

В `angular.json` проверить / добавить:
```json
{
  "architect": {
    "build": {
      "options": {
        "outputMode": "static"
      },
      "configurations": {
        "production": {
          "budgets": [
            { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" }
          ],
          "optimization": true,
          "outputHashing": "all",
          "sourceMap": false
        }
      }
    }
  }
}
```

> **`outputMode: "static"`** — гарантирует, что Angular НЕ сгенерирует `server.mjs` (GitHub Pages не может запускать Node.js). Если SSR был отключён при `ng new --ssr=false`, это уже по умолчанию, но лучше убедиться.

### 7.4. Предварительная настройка репозитория

1. Создать репозиторий на GitHub
2. Settings → Pages → Source: GitHub Actions
3. Push код → workflow автоматически задеплоит

---

## 8. Структура файлов (итоговая)

```
geo-quiz/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── scripts/
│   └── prepare-data.ts          # Скрипт подготовки данных
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.component.scss
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── core/
│   │   │   ├── services/
│   │   │   │   ├── country-data.service.ts
│   │   │   │   └── quiz.service.ts
│   │   │   └── models/
│   │   │       ├── country.model.ts
│   │   │       └── quiz.model.ts
│   │   ├── features/
│   │   │   ├── home/
│   │   │   │   ├── home.component.ts
│   │   │   │   └── home.component.scss
│   │   │   ├── quiz/
│   │   │   │   ├── quiz.component.ts
│   │   │   │   ├── quiz.component.scss
│   │   │   │   ├── quiz-header.component.ts
│   │   │   │   └── quiz-result.component.ts
│   │   │   └── map/
│   │   │       ├── map-container.component.ts
│   │   │       ├── flat-map.component.ts
│   │   │       ├── flat-map.component.scss
│   │   │       ├── globe-map.component.ts
│   │   │       └── globe-map.component.scss
│   │   └── shared/
│   │       └── components/
│   │           ├── language-toggle.component.ts
│   │           ├── flag-image.component.ts
│   │           ├── flag-grid.component.ts
│   │           └── country-info-popup.component.ts
│   ├── assets/
│   │   ├── data/
│   │   │   ├── countries-geo.json
│   │   │   └── countries-meta.json
│   │   └── i18n/
│   │       ├── en.json
│   │       └── ru.json
│   ├── styles.scss
│   ├── index.html
│   └── main.ts
├── angular.json
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## Приложение: Порядок реализации (чеклист для middle-разработчика)

| # | Задача | Зависимости | Приоритет |
|---|---|---|---|
| 1 | `ng new`, установка зависимостей, `.gitignore` | — | P0 |
| 2 | Настройка Transloco + файлы переводов | #1 | P0 |
| 3 | Скрипт подготовки данных (`prepare-data.ts`) | #1 | P0 |
| 4 | `CountryDataService` + загрузка данных | #3 | P0 |
| 5 | Модели (`Country`, `QuizState`, `QuizConfig`) | — | P0 |
| 6 | `FlatMapComponent` (Leaflet) — базовый рендеринг | #4 | P0 |
| 7 | Клик по странам + подсветка в FlatMap | #6 | P0 |
| 8 | `QuizService` — бизнес-логика квиза | #4, #5 | P0 |
| 9 | `HomeComponent` — выбор режима | #2 | P1 |
| 10 | `QuizComponent` — интеграция карты + вопросов | #7, #8, #9 | P1 |
| 11 | Режим "Найди страну" — полный цикл | #10 | P1 |
| 12 | `GlobeMapComponent` (D3-geo) | #4 | P1 |
| 13 | `MapContainerComponent` — переключение 2D/глобус | #6, #12 | P1 |
| 14 | Режим "Назови страну" (ввод текста) | #10 | P2 |
| 15 | `FlagGridComponent` + режим "Выбери флаг" | #10 | P2 |
| 16 | `CountryInfoPopup` — попап с инфой | #10 | P2 |
| 17 | `LanguageToggle` + переключение языка | #2 | P2 |
| 18 | Responsive design | #10 | P2 |
| 19 | Unit тесты для `QuizService` и `CountryDataService` | #4, #8 | P2 |
| 20 | GitHub Actions деплой | #10 | P2 |
| 21 | Zoom to region | #6, #12 | P3 |
| 22 | Анимации, polish | #10 | P3 |

---

## Приложение: Ключевые ссылки

- **Leaflet**: https://leafletjs.com/ | Angular: https://github.com/bluehalo/ngx-leaflet
- **D3-geo**: https://d3js.org/d3-geo | Projections: https://d3js.org/d3-geo/projection
- **world-atlas TopoJSON**: https://github.com/topojson/world-atlas
- **topojson-client**: https://github.com/topojson/topojson-client
- **mledoze/countries**: https://github.com/mledoze/countries
- **flag-icons**: https://github.com/lipis/flag-icons
- **Transloco**: https://jsverse.gitbook.io/transloco
- **Angular Material**: https://material.angular.io
- **angular-cli-ghpages**: https://github.com/angular-schule/angular-cli-ghpages
- **Natural Earth Data**: https://www.naturalearthdata.com/
- **RestCountries API**: https://restcountries.com/v3.1/all (для доп. данных, если нужно)
