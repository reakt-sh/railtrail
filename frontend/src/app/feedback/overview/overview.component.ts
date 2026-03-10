import { AfterViewInit, Component, inject, OnInit, ViewChild } from "@angular/core";
import { MyMaterialModule } from "../../shared/my-material.module";
import { Logger } from "loglevel";
import { MatSort } from "@angular/material/sort";
import { NotificationService } from "../../shared/notification.service";
import { LoggingService } from "../../shared/logging.service";
import { FeedbackService } from "../../shared/feedback.service";
import { Feedback } from "../../../../schema-gen/feedback";
import { MatTableDataSource } from "@angular/material/table";

@Component({
    selector: "app-feedback-overview",
    imports: [MyMaterialModule],
    templateUrl: "./overview.component.html",
    styleUrl: "./overview.component.scss",
})
export class OverviewComponent implements OnInit, AfterViewInit {

    private readonly logger: Logger = inject(LoggingService).getLogger("feedback:overview::component");
    private readonly notificationService: NotificationService = inject(NotificationService);
    private readonly feedbackService: FeedbackService = inject(FeedbackService);

    @ViewChild(MatSort) sort?: MatSort;

    protected loaded = false;
    protected displayedColumns = ["timestamp", "rating", "text"];
    protected tableSource = new MatTableDataSource<Feedback>([]);
    protected selectedYear = new Date().getFullYear();
    protected availableYears: number[] = [...Array(this.selectedYear - 2026 + 1).keys()].map(i => i + 2026); // TODO: get from backend

    ngOnInit(): void {
        this.requestList(this.selectedYear);
    }

    ngAfterViewInit(): void {
        this.tableSource.sort = this.sort ?? null;
    }

    protected convertDate(isoTimestamp: string): string {
        return new Date(isoTimestamp).toLocaleString();
    }

    protected cropComment(comment: string): string {
        return comment.length > 50 ? comment.substring(0, 50) + "..." : comment;
    }

    protected requestList(year: number) {
        this.feedbackService.requestAllInYear(year).subscribe({
            next: (list: Feedback[]) => {
                this.loaded = true;
                this.tableSource.data = list;
            },
            error: (err) => {
                this.logger.error(err);
                this.notificationService.showError($localize`Could not load feedback for year: ` + year);
            }
        });
    }

}
