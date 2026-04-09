# GeoQuiz

Interactive geography quiz app — identify countries on a map (flat or globe) by name, capital, or flag.

## Commands

- `bun install` — install dependencies
- `bun start` — dev server (default port 4200)
- `bun run build` — production build to `dist/`
- `bun run test` — run unit tests
- `bun run update-data` — regenerate countries-meta.json + countries-geo.json

## Stack

- **Angular 21** — standalone components, signals, lazy-loaded routes
- **Bun** — package manager
- **Leaflet** — flat map view
- **D3** — orthographic globe view
- **@jsverse/transloco v8** — EN/RU i18n (custom `AppTranslocoLoader`, not `TranslocoHttpLoader`)
- **SCSS** — component styles (inline)
- **Prettier** — formatting (printWidth 100, singleQuote, angular HTML parser)

## Project Structure

```
src/app/
  app.ts                          — root component (toolbar + router-outlet)
  app.config.ts                   — providers (Transloco, router with HashLocation)
  app.routes.ts                   — lazy: HomeComponent (/), QuizComponent (/quiz)
  core/
    models/country.model.ts       — CountryMeta interface
    models/quiz.model.ts          — QuizMode, QuizState, QuizResult, QuizConfig
    services/country-data.service.ts — loads JSON assets, TopoJSON→GeoJSON
    services/quiz.service.ts      — quiz logic with signals
  features/
    home/home.component.ts        — mode/region/view selector
    quiz/quiz.component.ts        — main quiz page
    quiz/quiz-header.component.ts — question prompt + progress bar
    quiz/quiz-result.component.ts — result overlay
    map/flat-map.component.ts     — Leaflet map
    map/globe-map.component.ts    — D3 globe
    map/map-container.component.ts — switches flat/globe
  shared/components/
    language-toggle.component.ts  — EN/RU switcher
    flag-grid.component.ts        — 3×3 flag picker
    country-info-popup.component.ts — feedback overlay
src/assets/
  data/countries-meta.json        — 236 countries (EN+RU names/capitals)
  data/countries-geo.json         — TopoJSON 50m borders
  data/capitals-i18n.json         — RU capital translations
  i18n/en.json, ru.json           — UI strings
scripts/
  prepare-data.ts                 — generates data JSON files
```

## Conventions

- All components are **standalone** (no NgModules)
- Use Angular **signals** and `input()` / `output()` for component I/O
- Use `effect()` in constructors to react to input signal changes
- Leaflet event callbacks must run inside `NgZone.run()`
- HashLocationStrategy (`withHashLocation()`) for GitHub Pages compatibility
- Flags loaded from flagcdn.com CDN (not bundled)
