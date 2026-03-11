import { inject, Injectable } from "@angular/core";
import { Map } from "maplibre-gl";
import { MapPosition } from "../../../../schema-gen/map_position";
import { RailLine } from "../../../../schema-gen/railline";
import { AuthService } from "../../auth/auth.service";
import { LoggingService } from "../../shared/logging.service";
import { VehiclesService } from "../../shared/vehicles.service";
import { RailLineService } from "./rail-line.service";

@Injectable({
    providedIn: "root"
})
export class MapLogicService {
    private readonly logger = inject(LoggingService).getLogger("map:logic");
    private readonly raillineService: RailLineService = inject(RailLineService);
    private readonly authService: AuthService = inject(AuthService);
    private readonly vehiclesService: VehiclesService = inject(VehiclesService);

    private readonly vehiclePositions: Record<number, MapPosition> = {};

    private map?: Map | null;

    constructor() {
        this.raillineService.getRailLine().subscribe({
            next: () => {
                // Subscribe to vehicle positions
                this.vehiclesService.createMapUpdateSubscription().subscribe({
                    next: (pos: MapPosition) => {
                        this.updateVehiclePosition(pos);
                    }
                });

                // Delayed start when rail line is only ready after start
                if (this.map) {
                    this.start(this.map);
                }
            }
        });
    }

    public start(map: Map) {
        this.map = map;

        // Check if rail line is loaded
        if (this.raillineService.railLine) {
            this.initLine(this.raillineService.railLine, map);
            this.initVehicles(map);
            this.refreshVehiclePositions();
        }
    }

    public stop() {
        this.map = null;
    }

    private initLine(line: RailLine, map: Map) {
        for (const track of line.tracks) {
            const lineStringData: GeoJSON.Feature<GeoJSON.LineString> = {
                "type": "Feature",
                "geometry": track.data as GeoJSON.LineString,
                "properties": {},
            }

            map.addSource(track.id, {
                "type": "geojson",
                "data": lineStringData
            });

            map.addLayer({
                "id": track.id,
                "type": "line",
                "source": track.id,
                "layout": {
                    "line-join": "round",
                    "line-cap": "round"
                },
                "paint": {
                    "line-color": "#a03472",
                    "line-width": 6
                }
            });
        }
    }

    private initVehicles(map: Map) {
        map.addSource("vehicles", {
            "type": "geojson",
            "data": {
                "type": "FeatureCollection",
                "features": []
            }
        });

        map.addLayer({
            "id": "vehicles",
            "type": "symbol",
            "source": "vehicles",
            "layout": {
                "text-field": ["get", "description"],
                "text-justify": "center",
                "text-allow-overlap": true,
                "icon-image": ["get", "icon"],
                "icon-size": 0.5,
                "icon-allow-overlap": true
            }
        });
    }

    private updateVehiclePosition(pos: MapPosition) {
        this.vehiclePositions[pos.vehicle] = pos;
        this.refreshVehiclePositions();
    }

    refreshVehiclePositions() {
        if (this.map) {
            const data = {
                "type": "FeatureCollection",
                "features": Object.entries(this.vehiclePositions).filter(
                    ([_, pos]) =>
                        (pos.vehicle > 0 || this.authService.isLoggedInAsAdmin()) &&
                        (!pos.offtrack || this.authService.isLoggedInAsOperator())
                ).map(([_, pos]) => {
                    return {
                        "type": "Feature",
                        "properties": {
                            "description": pos.label,
                            "icon": "railvehicle"
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [pos.longitude, pos.latitude]
                        }
                    }
                })
            };
            this.logger.debug("New vehicle layer", data);
            // Incomplete typing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.map.getSource("vehicles") as any).setData(data);
        }
    }
}
