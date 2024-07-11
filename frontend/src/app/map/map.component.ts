import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MapComponent as LibreMapComponent } from '@maplibre/ngx-maplibre-gl';
import { Map, Marker, Popup, StyleSpecification } from 'maplibre-gl';
import { RailLine } from '../../../schema-gen/railline';
import { MapLogicService } from './logic/map-logic.service';
import { RailLineService } from './rail-line.service';
import { environment } from '../../environments/environment';
import * as turfHelpers from "@turf/helpers"
import * as turfMeta from "@turf/meta"
import * as turf from '@turf/turf'

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [LibreMapComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('map', { static: true })
  private mapComp!: LibreMapComponent;
  map?: Map;

  readonly mapStyle: StyleSpecification = {
    "version": 8,
    "sources": {
      "osm": {
        "type": "raster",
        "tiles": ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        "tileSize": 256,
        "attribution": "&copy; OpenStreetMap Contributors",
        "maxzoom": 20
      }
    },
    "layers": [
      {
        "id": "osm",
        "type": "raster",
        "source": "osm" // This must match the source key above
      }
    ]
  };

  constructor(
    private readonly railine: RailLineService,
    private readonly mapLogic: MapLogicService,
    private readonly http: HttpClient,
  ) { }

  ngOnInit() {
    this.mapComp.mapLoad.subscribe((m) => this.initMap(m))

    // Testing
    this.http.get<any>(environment.positionAPI + '/hello').subscribe(
      (data: any) => console.log("Received data for: " + environment.positionAPI + '/hello' + " = " + JSON.stringify(data)),
      err => console.log('Error', err.error)
    );
    this.http.get<any>(environment.positionAPI + '/tracking/test/current').subscribe(
      (data: any) => console.log("Received data for: " + environment.positionAPI + '/tracking/test/current' + " = " + JSON.stringify(data)),
      err => console.log('Error', err.error)
    );
    this.http.get<any>("https://reqres.in/api/users/2").subscribe(
      (data: any) => console.log("Received data for: https://reqres.in/api/users/2 = " + JSON.stringify(data)),
      err => console.log('Error', err.error)
    );
  }

  ngOnDestroy(): void {
    this.mapLogic.stop()
  }

  private initMap(map: Map) {
    this.map = map
    map.setCenter({ lat: 54.16763498392591, lng: 10.551193888334025 });
    map.setZoom(15);

    this.railine.getRailLine().subscribe(
      (line: RailLine) => {
        for (let i = 0; i < line.tracks.length; i++) {
          const track = line.tracks[i];

          const trackData = track.data as unknown as GeoJSON.FeatureCollection<GeoJSON.Point>
          const lineStringData: GeoJSON.Feature<GeoJSON.LineString> = turfHelpers.lineString(turfMeta.coordAll(trackData))

          map.addSource(track.id, {
            'type': 'geojson',
            'data': lineStringData
          });

          map.addLayer({
            'id': track.id,
            'type': 'line',
            'source': track.id,
            'layout': {
              'line-join': 'round',
              'line-cap': 'round'
            },
            'paint': {
              'line-color': '#a03472',
              'line-width': 6
            }
          });

          // map.addLayer({
          //   'id': track.id,
          //   'type': 'fill',
          //   'source': track.id,
          //   'paint': {
          //     'fill-color': '#888888',
          //     'fill-outline-color': 'red',
          //     'fill-opacity': 0.4
          //   },
          //   // filter for (multi)polygons; for also displaying linestrings
          //   // or points add more layers with different filters
          //   'filter': ['==', '$type', 'Polygon']
          // });
          this.http.get<any>(environment.positionAPI + '/tracking/test/current').subscribe(
            (data: any) => {
              for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                  const element = data[key];

                  const marker = new Marker()
                    .setPopup(new Popup().setHTML(`<h1>${key}</h1><p>${JSON.stringify(element)}</p>`))
                    .setLngLat(element.coords)
                    .addTo(map);
                  // const marker2 = new Marker({
                  //   color: "#FF0000",
                  // })
                  //   .setPopup(new Popup().setHTML(`<h1>${key} Projected</h1><p>${JSON.stringify(element)}</p>`))
                  //   .setLngLat(turf.along(lineStringData, element.km, { units: "kilometers" }).geometry.coordinates as [number, number])
                  //   .addTo(map);
                  // console.log(element.coords)
                  // console.log(turf.along(lineStringData, element.km).geometry.coordinates as [number, number])
                }
              }
            },
            err => console.log('Error', err.error)
          );

        }
      },
      err => console.log('Error', err.error)
    )

    this.mapLogic.start(map)
  }
}
