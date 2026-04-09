import { Component, input, output } from '@angular/core';
import { FlatMapComponent } from './flat-map.component';
import { GlobeMapComponent } from './globe-map.component';
import type { CountryState, MapView } from '../../core/models/quiz.model';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [FlatMapComponent, GlobeMapComponent],
  template: `
    @if (mapView() === 'flat') {
      <app-flat-map
        [countryStates]="countryStates()"
        [region]="region()"
        (countryClicked)="countryClicked.emit($event)"
      />
    } @else {
      <app-globe-map
        [countryStates]="countryStates()"
        [region]="region()"
        (countryClicked)="countryClicked.emit($event)"
      />
    }
  `,
  styles: [`:host { display: block; width: 100%; height: 100%; }`],
})
export class MapContainerComponent {
  readonly mapView = input<MapView>('flat');
  readonly countryStates = input<Map<string, CountryState>>(new Map());
  readonly region = input<string | null>(null);
  readonly countryClicked = output<string>();
}
