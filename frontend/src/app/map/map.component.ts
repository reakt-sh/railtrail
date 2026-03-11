import { Component, inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MapComponent as LibreMapComponent, NgxMapLibreGLModule } from "@maplibre/ngx-maplibre-gl";
import { Logger } from "loglevel";
import { Map, StyleSpecification } from "maplibre-gl";
import { RailLine } from "../../../schema-gen/railline";
import { LoggingService } from "../shared/logging.service";
import { MapIconsService } from "./logic/map-icons.service";
import { MapLogicService } from "./logic/map-logic.service";
import { RailLineService } from "./logic/rail-line.service";

@Component({
    selector: "app-map",
    imports: [NgxMapLibreGLModule],
    templateUrl: "./map.component.html",
    styleUrl: "./map.component.scss"
})
export class MapComponent implements OnInit, OnDestroy {

    private readonly logger: Logger = inject(LoggingService).getLogger("map:component");
    private readonly railLineService: RailLineService = inject(RailLineService);
    private readonly mapIconsService: MapIconsService = inject(MapIconsService);
    private readonly mapLogicService: MapLogicService = inject(MapLogicService);

    @ViewChild("map", { static: true })
    private mapComp!: LibreMapComponent;

    // The underlying map instance
    private map?: Map;

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
        "glyphs": "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf", // FIXME
        "layers": [
            {
                "id": "osm",
                "type": "raster",
                "source": "osm" // This must match the source key above
            }
        ]
    };

    ngOnInit() {
        this.mapComp.mapLoad.subscribe((m: Map) => this.initMap(m));
    }

    ngOnDestroy(): void {
        this.mapLogicService.stop();
    }

    private initMap(map: Map) {
        this.map = map

        this.mapIconsService.init(map);

        this.railLineService.getRailLine().subscribe({
            next: (line: RailLine) => {
                // Configure
                const conf = line.map.startConfiguration;
                if (conf) {
                    map.setCenter({ lat: conf.latitude, lng: conf.longitude });
                    map.setZoom(conf.zoom ?? 15);
                }
                map.dragRotate.disable();
                map.keyboard.disable();
                map.touchZoomRotate.disableRotation();

                // Start to populate map
                this.mapLogicService.start(map);
            }
        });
    }
}
