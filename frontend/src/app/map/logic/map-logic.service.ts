import { Injectable } from "@angular/core";
import { Logger } from "loglevel";
import { Map } from "maplibre-gl";
import { MapPosition } from "../../../../schema-gen/map_position";
import { RailLine } from "../../../../schema-gen/railline";
import { LoggingService } from "../../shared/logging.service";
import { VehiclesService } from "../../shared/vehicles.service";
import { RailLineService } from "./rail-line.service";
import { AuthService } from "../../auth/auth.service";

@Injectable({
    providedIn: "root"
})
export class MapLogicService {
    private readonly logger: Logger;
    private readonly vehiclePositions: Record<number, MapPosition> = {};

    private map?: Map | null;

    constructor(
        private readonly railline: RailLineService,
        private readonly auth: AuthService,
        vehiclesUpdates: VehiclesService,
        logging: LoggingService,
    ) {
        this.logger = logging.getLogger("map:logic");

        railline.getRailLine().subscribe({
            next: () => {
                // Subscribe to vehicle positions
                vehiclesUpdates.createMapUpdateSubscription().subscribe({
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
        if (this.railline.railLine) {
            this.initLine(this.railline.railLine, map);
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
                        (pos.vehicle > 0 || this.auth.isLoggedInAsAdmin()) &&
                        (!pos.offtrack || this.auth.isLoggedInAsOperator())
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
            (this.map.getSource("vehicles") as any).setData(data);
        }
    }
}
