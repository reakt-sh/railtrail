import { Component, inject } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { Logger } from "loglevel";
import { FeedbackService } from "../../shared/feedback.service";
import { LoggingService } from "../../shared/logging.service";
import { MyMaterialModule } from "../../shared/my-material.module";
import { NotificationService } from "../../shared/notification.service";

@Component({
    selector: "app-feedback-submit",
    imports: [MyMaterialModule, ReactiveFormsModule],
    templateUrl: "./submit.component.html",
    styleUrl: "./submit.component.scss",
})
export class SubmitComponent {
    private readonly logger: Logger = inject(LoggingService).getLogger("feedback:submit::component");
    private readonly notificationService: NotificationService = inject(NotificationService);
    private readonly feedbackService: FeedbackService = inject(FeedbackService);

    protected readonly ratingForm = new FormControl<number>(1, [Validators.required, Validators.min(1), Validators.max(5)]);
    protected readonly commentForm = new FormControl<string>("", [Validators.maxLength(7000)]);

    protected sendFeedback() {
        if (!this.ratingForm.invalid && !this.commentForm.invalid) {
            this.feedbackService.submitFeedback({
                rating: this.ratingForm.value!,
                text: this.commentForm.value!
            }).subscribe({
                next: () => {
                    this.notificationService.showInfo($localize`Feedback submitted successfully!`);
                    this.ratingForm.setValue(1);
                    this.commentForm.setValue("");
                },
                error: (err) => {
                    this.logger.error(err);
                    this.notificationService.showError($localize`Failed to submit feedback!`);
                }
            });
        } else {
            this.notificationService.showError($localize`Please fix the errors in the form before submitting!`);
        }

        return false; // prevent page reload
    }
}
