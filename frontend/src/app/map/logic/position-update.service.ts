import { Inject, Injectable } from "@angular/core";
import { Logger } from "loglevel";
import { catchError, EMPTY, map, Observable } from "rxjs";
import { webSocket } from "rxjs/webSocket";
import { MapPosition } from "../../../../schema-gen/map_position";
import { environment } from "../../../environments/environment";
import { LoggingService } from "../../shared/logging.service";
import { WINDOW } from "../../shared/window.provider";

@Injectable({
  providedIn: "root"
})
export class PositionUpdateService {

  private readonly logger: Logger;
  private readonly url: string;

  constructor(
    @Inject(WINDOW) window: Window,
    logging: LoggingService,
  ) {
    this.logger = logging.getLogger("position-update:service");

    if (environment.positionAPI && environment.positionAPI.startsWith("http")) {
      this.url = `ws${environment.positionAPI.slice(4)}/position-updates`;
    } else {
      this.url = `${window.location.protocol.replace("http", "ws")}//${window.location.host}${environment.positionAPI}/position-updates`;
    }
  }

  public createUpdateSubscription(): Observable<MapPosition> {
    return webSocket({
      url: this.url
    }).pipe(
      map((msg) => this.processNotification(msg)),
      catchError((err) => {
        this.logger.error("Error in position update websocket connection.", err);
        return EMPTY // close
      })
    );
  }

  private processNotification(msg: any): MapPosition {
    // TODO Maybe validate beforehand
    return msg as MapPosition
  }

}
