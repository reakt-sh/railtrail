import { Injectable } from '@angular/core';
import { Map } from 'maplibre-gl';

@Injectable({
  providedIn: 'root'
})
export class MapLogicService {
  private map?: Map | null

  constructor() { }

  start(map: Map) {
    this.map = map;
  }

  stop() {
    this.map = null;
  }
}
