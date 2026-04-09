export interface CountryMeta {
  /** ISO 3166-1 Numeric — ключ связи с GeoJSON feature.id */
  id: string;
  /** ISO Alpha-2 (например "DE") */
  cca2: string;
  /** ISO Alpha-3 (например "DEU") */
  cca3: string;
  name: { en: string; ru: string };
  capital: { en: string; ru: string };
  /** "Europe" | "Africa" | "Asia" | "Americas" | "Oceania" | "Antarctic" */
  region: string;
  subregion: string;
  /** URL на flagcdn.com, например https://flagcdn.com/de.svg */
  flagSvg: string;
  flagEmoji: string;
}
