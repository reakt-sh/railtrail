import { Inject, Injectable } from "@angular/core";
import { Logger } from "loglevel";
import { BehaviorSubject, catchError, EMPTY, map, Observable, tap } from "rxjs";
import { webSocket } from "rxjs/webSocket";
import { MapPosition } from "../../../schema-gen/map_position";
import { environment } from "../../environments/environment";
import { LoggingService } from "../shared/logging.service";
import { WINDOW } from "../shared/window.provider";
import { HttpClient } from "@angular/common/http";
import { VehicleList } from "../../../schema-gen/vehicle_list";

@Injectable({
    providedIn: "root"
})
export class VehiclesService {

    private readonly logger: Logger;
    private readonly mapUpdateUrl: string;

    private readonly latestList = new BehaviorSubject<VehicleList | undefined>(undefined);
    public readonly latestList$ = this.latestList.asObservable();

    constructor(
        @Inject(WINDOW) private window: Window,
        private readonly http: HttpClient,
        readonly logging: LoggingService,
    ) {
        this.logger = logging.getLogger("vehicles:service");

        if (environment.positionAPI && environment.positionAPI.startsWith("http")) {
            this.mapUpdateUrl = `ws${environment.positionAPI.slice(4)}/position-updates`;
        } else {
            this.mapUpdateUrl = `${window.location.protocol.replace("http", "ws")}//${window.location.host}${environment.positionAPI}/position-updates`;
        }
        // DO NOT COMMIT!
        //this.url = "wss://railtrail.rtsys.informatik.uni-kiel.de/api/position-updates"
    }

    public requestList() : Observable<VehicleList> {
        return this.http.get<VehicleList>(environment.webAPI + "/vehicles").pipe(tap((list: VehicleList) => {
            this.latestList.next(list);
        }));
    }

    public saveList(newList: VehicleList) : Observable<VehicleList> {
        return this.http.post<VehicleList>(environment.webAPI + "/vehicles", newList);
    }

    public createMapUpdateSubscription(): Observable<MapPosition> {
        return webSocket({
            url: this.mapUpdateUrl
        }).pipe(
            map((msg) => this.processMapUpdateNotification(msg)),
            catchError((err) => {
                this.logger.error("Error in position update websocket connection.", err);
                return EMPTY // close
            })
        );
    }

    private processMapUpdateNotification(msg: unknown): MapPosition {
        // TODO Maybe validate beforehand
        return msg as MapPosition
    }

}
