import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import * as L from 'leaflet';
import { CountryDataService } from '../../core/services/country-data.service';
import type { CountryState } from '../../core/models/quiz.model';

@Component({
  selector: 'app-flat-map',
  standalone: true,
  template: `<div #mapEl class="map-el"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .map-el { width: 100%; height: 100%; background: #a3c8f0; }
  `],
})
export class FlatMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapElRef!: ElementRef<HTMLDivElement>;

  readonly countryStates = input<Map<string, CountryState>>(new Map());
  readonly region = input<string | null>(null);
  readonly countryClicked = output<string>();

  private readonly countryData = inject(CountryDataService);
  private readonly zone = inject(NgZone);

  private map: L.Map | null = null;
  private geoLayer: L.GeoJSON | null = null;
  private microMarkers = new Map<string, L.CircleMarker>();

  constructor() {
    effect(() => {
      const states = this.countryStates();
      this.updateStyles(states);
    });
  }

  ngAfterViewInit(): void {
    // setTimeout lets the browser finish layout so Leaflet gets a non-zero container height
    this.zone.runOutsideAngular(() => setTimeout(() => this.initMap(), 0));
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
    this.geoLayer = null;
  }

  private initMap(): void {
    this.map = L.map(this.mapElRef.nativeElement, {
      zoom: 2,
      center: [20, 0],
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      attributionControl: false,
      minZoom: 1,
      maxZoom: 8,
      worldCopyJump: false,
      // Canvas renderer avoids the SVG overlay-pane oversizing artifact
      // (SVG pane extends 128px beyond viewport edges causing horizontal line artifacts
      // at the boundaries of large polygons like Russia/Antarctica)
      renderer: L.canvas(),
    });

    this.loadGeoJSON();
    this.addMicroMarkers();
    this.map.invalidateSize();
  }

  private loadGeoJSON(): void {
    if (!this.map) return;
    const geoData = this.countryData.getFilteredGeoJSON(this.region());

    this.geoLayer = L.geoJSON(geoData as any, {
      style: (feature) => this.styleForFeature(feature),
      onEachFeature: (feature, layer) => {
        const id = String(feature.id);
        const isActive = (feature.properties as any)?.isActive !== false;

        if (isActive) {
          layer.on('click', () => {
            this.zone.run(() => this.countryClicked.emit(id));
          });
          (layer as L.Path).on('mouseover', () => {
            (layer as L.Path).setStyle({ fillOpacity: 0.92, weight: 2 });
          });
          (layer as L.Path).on('mouseout', () => {
            const state = this.countryStates().get(id);
            (layer as L.Path).setStyle(this.buildStyle(state, true));
          });
        }
      },
    }).addTo(this.map);

    if (this.region()) {
      this.fitToActiveRegion();
    }
  }

  /** Zoom to bounding box of active-region features only (excludes greyed-out world countries). */
  private fitToActiveRegion(): void {
    if (!this.geoLayer || !this.map) return;

    let bounds: L.LatLngBounds | null = null;

    this.geoLayer.eachLayer((layer: any) => {
      if (layer.feature?.properties?.isActive === false) return;
      if (typeof layer.getBounds !== 'function') return;
      try {
        const b: L.LatLngBounds = layer.getBounds();
        if (!b.isValid()) return;
        bounds = bounds ? bounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast());
      } catch (_) { /* skip degenerate geometries */ }
    });

    if (bounds && (bounds as L.LatLngBounds).isValid()) {
      this.map.fitBounds(bounds as L.LatLngBounds, { padding: [40, 40], maxZoom: 6 });
    }
  }

  private styleForFeature(feature: any): L.PathOptions {
    const id = String(feature.id);
    const state = this.countryStates().get(id);
    const isActive = feature.properties?.isActive !== false;
    return this.buildStyle(state, isActive);
  }

  private buildStyle(state: CountryState | undefined, isActive: boolean): L.PathOptions {
    if (!isActive) {
      return { fillColor: '#c8c8c8', fillOpacity: 0.4, weight: 0.5, color: '#aaa' };
    }
    switch (state) {
      case 'correct':
        return { fillColor: '#4CAF50', fillOpacity: 0.82, weight: 2, color: '#2e7d32' };
      case 'incorrect':
        return { fillColor: '#F44336', fillOpacity: 0.82, weight: 2, color: '#b71c1c' };
      case 'wrong-attempt':
        return { fillColor: '#9E9E9E', fillOpacity: 0.6, weight: 1.5, color: '#757575' };
      case 'revealed':
        return { fillColor: '#42A5F5', fillOpacity: 0.85, weight: 3, color: '#1565C0' };
      case 'highlighted':
        return { fillColor: '#FFC107', fillOpacity: 0.88, weight: 2.5, color: '#e65100' };
      default:
        return { fillColor: '#e0e0e0', fillOpacity: 0.7, weight: 1, color: '#777' };
    }
  }

  private addMicroMarkers(): void {
    if (!this.map) return;
    const region = this.region();
    const activeIds = region
      ? new Set(this.countryData.getByRegion(region).map(c => c.id))
      : null;

    for (const ms of this.countryData.getMicroStates()) {
      if (activeIds && !activeIds.has(ms.id)) continue;
      const state = this.countryStates().get(ms.id);
      const style = this.buildStyle(state, true);
      const marker = L.circleMarker([ms.centroid[1], ms.centroid[0]], {
        radius: 8,
        fillColor: style.fillColor,
        fillOpacity: 0.9,
        weight: 2,
        color: style.color ?? '#555',
      }).addTo(this.map);

      marker.on('click', () => {
        this.zone.run(() => this.countryClicked.emit(ms.id));
      });

      this.microMarkers.set(ms.id, marker);
    }
  }

  private updateStyles(states: Map<string, CountryState>): void {
    if (!this.geoLayer) return;
    this.geoLayer.eachLayer((layer: any) => {
      const feature = layer.feature;
      if (!feature) return;
      const id = String(feature.id);
      const isActive = feature.properties?.isActive !== false;
      (layer as L.Path).setStyle(this.buildStyle(states.get(id), isActive));
    });

    // Обновить маркеры микростран
    for (const [id, marker] of this.microMarkers) {
      const style = this.buildStyle(states.get(id), true);
      marker.setStyle({
        fillColor: style.fillColor,
        color: style.color ?? '#555',
      });
    }
  }
}
