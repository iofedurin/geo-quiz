import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { feature as topoFeature } from 'topojson-client';
import { geoArea, geoCentroid } from 'd3-geo';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import type { CountryMeta } from '../models/country.model';

export interface MicroState {
  id: string;
  centroid: [number, number]; // [longitude, latitude]
}

@Injectable({ providedIn: 'root' })
export class CountryDataService {
  private readonly http = inject(HttpClient);

  readonly loaded = signal(false);

  /** Метаданные: numeric ID → CountryMeta */
  private readonly metaById = new Map<string, CountryMeta>();

  /** Все GeoJSON features (обогащённые numeric ID) */
  private geoJSON!: FeatureCollection<Geometry>;

  /** Микространа: площадь GeoJSON < порога */
  private microStates: MicroState[] = [];

  /** Загрузить данные при старте приложения (вызывается из provideAppInitializer) */
  async init(): Promise<void> {
    const [meta, topo] = await Promise.all([
      firstValueFrom(this.http.get<CountryMeta[]>('assets/data/countries-meta.json')),
      firstValueFrom(this.http.get<Topology>('assets/data/countries-geo.json')),
    ]);

    for (const m of meta) {
      this.metaById.set(m.id, m);
    }

    // Конвертация TopoJSON → GeoJSON
    const objects = topo.objects as Record<string, any>;
    this.geoJSON = topoFeature(topo, objects['countries']) as unknown as FeatureCollection<Geometry>;

    // Вычислить микространы (площадь < 0.00005 стерадиан ≈ 1600 км²)
    const AREA_THRESHOLD = 0.00005;
    this.microStates = this.geoJSON.features
      .filter(f => {
        const id = String(f.id);
        return this.metaById.has(id) && geoArea(f as any) < AREA_THRESHOLD;
      })
      .map(f => ({
        id: String(f.id),
        centroid: geoCentroid(f as any) as [number, number],
      }));

    this.loaded.set(true);
  }

  /** Все страны */
  getAll(): CountryMeta[] {
    return [...this.metaById.values()];
  }

  /** Страны по региону. region = null → весь мир */
  getByRegion(region: string | null): CountryMeta[] {
    if (!region) return this.getAll();
    const r = region.toLowerCase();
    return this.getAll().filter(c => c.region.toLowerCase() === r);
  }

  /** Страна по numeric ID (совпадает с feature.id в GeoJSON) */
  getById(id: string): CountryMeta | undefined {
    return this.metaById.get(id);
  }

  /** Страна по ISO Alpha-2 */
  getByCca2(cca2: string): CountryMeta | undefined {
    return this.getAll().find(c => c.cca2 === cca2);
  }

  /** Полный GeoJSON мира */
  getGeoJSON(): FeatureCollection<Geometry> {
    return this.geoJSON;
  }

  /**
   * GeoJSON, отфильтрованный по региону.
   * Страны вне региона остаются в коллекции с флагом isActive=false,
   * чтобы карта показывала весь мир, но интерактивными были только нужные.
   */
  getFilteredGeoJSON(region: string | null): FeatureCollection<Geometry & { properties: any }> {
    if (!region) return this.geoJSON as any;

    const activeIds = new Set(this.getByRegion(region).map(c => c.id));

    return {
      ...this.geoJSON,
      features: this.geoJSON.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          isActive: activeIds.has(String(f.id)),
        },
      })),
    } as any;
  }

  /** Микространы с центроидами для маркеров на карте */
  getMicroStates(): MicroState[] {
    return this.microStates;
  }

  /** Случайные N стран из региона, исключая заданный cca2 */
  getRandomFrom(region: string | null, exclude: string, count: number): CountryMeta[] {
    const pool = this.getByRegion(region).filter(
      c => c.cca2 !== exclude && c.cca2 !== '',
    );
    return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
  }
}
