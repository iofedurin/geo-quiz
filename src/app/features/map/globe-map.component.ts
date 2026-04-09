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
import * as d3 from 'd3';
import type { GeoPermissibleObjects } from 'd3';
import { CountryDataService } from '../../core/services/country-data.service';
import type { CountryState } from '../../core/models/quiz.model';

type D3Svg = d3.Selection<SVGSVGElement, unknown, null, undefined>;

@Component({
  selector: 'app-globe-map',
  standalone: true,
  template: `<div #container class="globe-container"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .globe-container { width: 100%; height: 100%; background: #1a1a2e; }
  `],
})
export class GlobeMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  readonly countryStates = input<Map<string, CountryState>>(new Map());
  readonly region = input<string | null>(null);
  readonly countryClicked = output<string>();

  private readonly countryData = inject(CountryDataService);
  private readonly zone = inject(NgZone);

  private svg: D3Svg | null = null;
  private projection: d3.GeoProjection | null = null;
  private pathGen: d3.GeoPath | null = null;
  private baseRadius = 250;

  constructor() {
    effect(() => {
      const states = this.countryStates();
      this.updateFills(states);
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => setTimeout(() => this.initGlobe(), 0));
  }

  ngOnDestroy(): void {
    this.svg?.remove();
    this.svg = null;
  }

  private initGlobe(): void {
    const el = this.containerRef.nativeElement;
    const width = el.clientWidth || 800;
    const height = el.clientHeight || 600;
    this.baseRadius = Math.min(width, height) / 2.2;

    // Initial rotation to center on a nice view
    const initRotate: [number, number] = [0, -20];

    this.projection = d3.geoOrthographic()
      .scale(this.baseRadius)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate(initRotate);

    this.pathGen = d3.geoPath().projection(this.projection);

    this.svg = d3.select(el)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('display', 'block');

    // Ocean
    this.svg.append('path')
      .datum({ type: 'Sphere' } as GeoPermissibleObjects)
      .attr('class', 'sphere')
      .attr('d', this.pathGen as any)
      .attr('fill', '#a3c8f0')
      .attr('stroke', '#7bb3d4')
      .attr('stroke-width', 1);

    // Countries
    const geoData = this.countryData.getFilteredGeoJSON(this.region());

    this.svg.selectAll<SVGPathElement, any>('.country')
      .data(geoData.features)
      .join('path')
      .attr('class', 'country')
      .attr('d', this.pathGen as any)
      .attr('fill', (d) => this.fillColor(String(d.id), (d.properties as any)?.isActive))
      .attr('stroke', '#888')
      .attr('stroke-width', 0.4)
      .style('cursor', (d) => (d.properties as any)?.isActive !== false ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if ((d.properties as any)?.isActive === false) return;
        if (!this.projection) return;
        const centroid = d3.geoCentroid(d as any);
        const [lam, phi] = this.projection.rotate() as [number, number, number];
        const dist = d3.geoDistance(centroid, [-lam, -phi]);
        if (dist < Math.PI / 2) {
          this.zone.run(() => this.countryClicked.emit(String(d.id)));
        }
      })
      .on('mouseover', function(_, d) {
        if ((d.properties as any)?.isActive === false) return;
        d3.select(this).attr('stroke', '#333').attr('stroke-width', 1.5);
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', '#888').attr('stroke-width', 0.4);
      });

    this.addMicroMarkers();
    this.setupInteraction();
  }

  private setupInteraction(): void {
    if (!this.svg || !this.projection || !this.pathGen) return;
    const svg = this.svg;
    const proj = this.projection;
    const path = this.pathGen;

    const redraw = () => {
      svg.selectAll<SVGPathElement, unknown>('path').attr('d', path as any);
      this.updateMarkerPositions();
    };

    const drag = d3.drag<SVGSVGElement, unknown>()
      .filter(event => event.touches == null || event.touches.length === 1)
      .on('drag', (event) => {
        const [lam, phi] = proj.rotate() as [number, number, number];
        const k = 75 / proj.scale();
        proj.rotate([lam + event.dx * k, phi - event.dy * k]);
        redraw();
      });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 10])
      .filter(event => event.touches == null || event.touches.length !== 1)
      .on('zoom', (event) => {
        proj.scale(this.baseRadius * event.transform.k);
        redraw();
      });

    svg.call(drag as any).call(zoom as any);
  }

  private addMicroMarkers(): void {
    if (!this.svg || !this.projection) return;
    const region = this.region();
    const activeIds = region
      ? new Set(this.countryData.getByRegion(region).map(c => c.id))
      : null;

    const micros = this.countryData.getMicroStates()
      .filter(ms => !activeIds || activeIds.has(ms.id));

    this.svg.selectAll<SVGCircleElement, any>('.micro-marker')
      .data(micros, (d: any) => d.id)
      .join('circle')
      .attr('class', 'micro-marker')
      .attr('r', 6)
      .attr('fill', d => this.fillColor(d.id, true))
      .attr('stroke', '#555')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (!this.projection) return;
        const [lam, phi] = this.projection.rotate() as [number, number, number];
        const dist = d3.geoDistance(d.centroid, [-lam, -phi]);
        if (dist < Math.PI / 2) {
          this.zone.run(() => this.countryClicked.emit(d.id));
        }
      });

    this.updateMarkerPositions();
  }

  private updateMarkerPositions(): void {
    if (!this.svg || !this.projection) return;
    const proj = this.projection;
    this.svg.selectAll<SVGCircleElement, any>('.micro-marker')
      .each(function(d) {
        const pos = proj(d.centroid);
        const [lam, phi] = proj.rotate() as [number, number, number];
        const dist = d3.geoDistance(d.centroid, [-lam, -phi]);
        const visible = dist < Math.PI / 2;
        d3.select(this)
          .attr('cx', pos ? pos[0] : -999)
          .attr('cy', pos ? pos[1] : -999)
          .attr('display', visible ? null : 'none');
      });
  }

  private fillColor(id: string, isActive: any): string {
    if (isActive === false) return '#c0c0c0';
    const state = this.countryStates().get(id);
    switch (state) {
      case 'correct':       return '#4CAF50';
      case 'incorrect':     return '#F44336';
      case 'wrong-attempt': return '#9E9E9E';
      case 'revealed':      return '#42A5F5';
      case 'highlighted':   return '#FFC107';
      default:              return '#e8e8e8';
    }
  }

  private updateFills(states: Map<string, CountryState>): void {
    if (!this.svg) return;
    this.svg.selectAll<SVGPathElement, any>('.country')
      .attr('fill', (d) => this.fillColor(String(d.id), (d.properties as any)?.isActive));
    // Обновить маркеры микростран
    this.svg.selectAll<SVGCircleElement, any>('.micro-marker')
      .attr('fill', d => this.fillColor(d.id, true));
  }
}
