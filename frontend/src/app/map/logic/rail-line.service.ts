import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, Observable, filter } from "rxjs";
import { RailLine } from "../../../../schema-gen/railline";
import { environment } from "../../../environments/environment";
import { LoggingService } from "../../shared/logging.service";

@Injectable({
    providedIn: "root"
})
export class RailLineService {

    private readonly logger = inject(LoggingService).getLogger("railline:service");
    private readonly httpClient = inject(HttpClient);

    private readonly railLineSubject = new BehaviorSubject<RailLine | undefined>(undefined);

    constructor() {
        this.httpClient.get<RailLine>(`${environment.assetsURLPrefix}/assets/raillines/${environment.railLine}.json`).subscribe({
            next: (railline: RailLine) => {
                // Maybe validate?
                if (railline) {
                    this.railLineSubject.next(railline);
                }
            },
            error: (err) => this.logger.log(`Error loading rail line '${environment.railLine}'`, err)
        })
    }

    public getRailLine(): Observable<RailLine> {
        return this.railLineSubject.pipe(filter((line): line is RailLine => !!line));
    }

    public get railLine(): RailLine | undefined {
        return this.railLineSubject.value;
    }
}
