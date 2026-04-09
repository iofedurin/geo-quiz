#!/usr/bin/env bun
/**
 * Скрипт подготовки данных для GeoQuiz
 * Запуск: bun run update-data
 *
 * Генерирует:
 *   src/assets/data/countries-meta.json  — метаданные стран (имена RU/EN, столицы, коды, регионы)
 *   src/assets/data/countries-geo.json   — TopoJSON с границами стран
 *
 * Источники:
 *   - RestCountries API v3.1 (названия, переводы, флаги, коды)
 *   - world-atlas (TopoJSON границы, Natural Earth 50m)
 *   - src/assets/data/capitals-i18n.json (переводы столиц на русский, вручную)
 *
 * Обновление: запускать раз в полгода или при изменении данных.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS_DATA = resolve(ROOT, 'src/assets/data');

interface RestCountry {
  name: { common: string; official: string };
  translations: { rus?: { common: string; official: string } };
  capital: string[];
  cca2: string;
  cca3: string;
  ccn3: string;
  region: string;
  subregion: string;
  flags: { svg: string; png: string };
  flag: string;
}

interface CapitalTranslation {
  en: string;
  ru: string;
}

export interface CountryMeta {
  id: string;         // ISO 3166-1 Numeric — ключ для связи с GeoJSON
  cca2: string;       // ISO Alpha-2 (например "DE")
  cca3: string;       // ISO Alpha-3 (например "DEU")
  name: { en: string; ru: string };
  capital: { en: string; ru: string };
  region: string;     // "Europe" | "Africa" | "Asia" | "Americas" | "Oceania" | "Antarctic"
  subregion: string;
  flagSvg: string;    // URL на flagcdn.com
  flagEmoji: string;
}

console.log('🌍 GeoQuiz — подготовка данных\n');

// ─── 1. RestCountries API ───────────────────────────────────────────────────
console.log('📡 Загрузка данных из RestCountries API...');
const FIELDS = 'name,translations,capital,flags,flag,cca2,cca3,ccn3,region,subregion';
const res = await fetch(`https://restcountries.com/v3.1/all?fields=${FIELDS}`);
if (!res.ok) throw new Error(`RestCountries: ${res.status} ${res.statusText}`);

const restCountries: RestCountry[] = await res.json();
console.log(`   ✓ Получено ${restCountries.length} стран`);

// Индексы для быстрого поиска
const byNumeric = new Map<string, RestCountry>();
const byCca2 = new Map<string, RestCountry>();
for (const c of restCountries) {
  if (c.ccn3) byNumeric.set(String(c.ccn3).padStart(3, '0'), c);
  if (c.cca2) byCca2.set(c.cca2, c);
}

// ─── 2. Переводы столиц ─────────────────────────────────────────────────────
console.log('📖 Загрузка переводов столиц...');
const capitalsRaw: Record<string, CapitalTranslation> = JSON.parse(
  readFileSync(resolve(ASSETS_DATA, 'capitals-i18n.json'), 'utf-8'),
);
console.log(`   ✓ Загружено ${Object.keys(capitalsRaw).length} переводов столиц`);

// ─── 3. TopoJSON (world-atlas) ───────────────────────────────────────────────
console.log('🗺️  Загрузка TopoJSON из world-atlas...');
const topoPath = resolve(ROOT, 'node_modules/world-atlas/countries-50m.json');
const worldTopo = JSON.parse(readFileSync(topoPath, 'utf-8'));
const geometries: Array<{ id: number | string }> = worldTopo.objects.countries.geometries;
console.log(`   ✓ Загружено ${geometries.length} объектов`);

// ─── 4. Слияние данных ──────────────────────────────────────────────────────
console.log('🔗 Слияние данных...');
const meta: CountryMeta[] = [];
const unmatched: string[] = [];

for (const geom of geometries) {
  // world-atlas хранит numeric ID как число (например 276 для Германии)
  // Некоторые объекты (Антарктика и спорные территории) не имеют ID
  if (geom.id === undefined || geom.id === null) {
    unmatched.push('(no-id)');
    continue;
  }
  const numericId = String(geom.id).padStart(3, '0');
  const country = byNumeric.get(numericId);

  if (!country) {
    unmatched.push(numericId);
    continue;
  }

  const capEn = (country.capital ?? []).join(', ');
  const capTranslation = capitalsRaw[country.cca2];

  meta.push({
    id: numericId,
    cca2: country.cca2 ?? '',
    cca3: country.cca3 ?? '',
    name: {
      en: country.name?.common ?? '',
      ru: country.translations?.rus?.common ?? country.name?.common ?? '',
    },
    capital: {
      en: capTranslation?.en ?? capEn,
      ru: capTranslation?.ru ?? capEn, // fallback на EN если нет перевода
    },
    region: country.region ?? '',
    subregion: country.subregion ?? '',
    flagSvg: `assets/flags/${(country.cca2 ?? '').toLowerCase()}.svg`,
    flagEmoji: country.flag ?? '',
  });
}

console.log(`   ✓ Совпало: ${meta.length} стран`);

if (unmatched.length > 0) {
  console.warn(`   ⚠️  Нет данных для numeric ID: ${unmatched.join(', ')}`);
  console.warn('      (обычно это Антарктика и спорные территории — нормально)');
}

// Статистика переводов
const noRuName = meta.filter(c => c.name.ru === c.name.en).length;
const noRuCap = meta.filter(c => c.capital.ru === c.capital.en && c.capital.en !== '').length;
console.log(`   ℹ️  Без RU-перевода названия: ${noRuName}`);
console.log(`   ℹ️  Без RU-перевода столицы: ${noRuCap}`);

// ─── 5. Сохранение ──────────────────────────────────────────────────────────
writeFileSync(
  resolve(ASSETS_DATA, 'countries-meta.json'),
  JSON.stringify(meta, null, 2),
  'utf-8',
);
console.log(`\n✓ countries-meta.json — ${meta.length} стран`);

// Сохраняем TopoJSON как есть (для Leaflet/D3 runtime конвертации)
writeFileSync(
  resolve(ASSETS_DATA, 'countries-geo.json'),
  JSON.stringify(worldTopo),
  'utf-8',
);
console.log('✓ countries-geo.json — TopoJSON (world-atlas 50m)');

// ─── 6. Загрузка флагов ─────────────────────────────────────────────────────
const FLAGS_DIR = resolve(ROOT, 'src/assets/flags');
if (!existsSync(FLAGS_DIR)) mkdirSync(FLAGS_DIR, { recursive: true });

console.log('\n🏳️  Загрузка флагов с flagcdn.com...');
const flagCodes = [...new Set(meta.map(c => c.cca2.toLowerCase()))];
let downloaded = 0, skipped = 0, failed = 0;

const BATCH = 20;
for (let i = 0; i < flagCodes.length; i += BATCH) {
  await Promise.all(flagCodes.slice(i, i + BATCH).map(async code => {
    const outPath = resolve(FLAGS_DIR, `${code}.svg`);
    if (existsSync(outPath)) { skipped++; return; }
    try {
      const r = await fetch(`https://flagcdn.com/${code}.svg`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      writeFileSync(outPath, await r.text(), 'utf-8');
      downloaded++;
    } catch (e) {
      console.warn(`   ⚠️  ${code}: ${e}`);
      failed++;
    }
  }));
}
console.log(`   ✓ Скачано: ${downloaded}, уже было: ${skipped}, ошибок: ${failed}`);

console.log('\n✅ Готово!\n');
