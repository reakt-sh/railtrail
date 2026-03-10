import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Logger } from "loglevel";
import { Observable } from "rxjs";
import { Feedback } from "../../../schema-gen/feedback";
import { environment } from "../../environments/environment";
import { LoggingService } from "../shared/logging.service";

@Injectable({
    providedIn: "root"
})
export class FeedbackService {

    private readonly logger: Logger = inject(LoggingService).getLogger("feedback:service");
    private readonly http: HttpClient = inject(HttpClient);

    public requestAllInYear(year: number) : Observable<Feedback[]> {
        return this.http.get<Feedback[]>(`${environment.webAPI}/feedback/list/${year}`);
    }

    public submitFeedback(feedback: Feedback) : Observable<void> {
        return this.http.post<void>(`${environment.webAPI}/feedback/submit`, feedback);
    }

}
