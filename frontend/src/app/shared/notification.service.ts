import { inject, Injectable } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({
    providedIn: "root"
})
export class NotificationService {

    private readonly snackBar = inject(MatSnackBar);
    private readonly closeLabel = $localize`Close`

    public showError(message: string) {
        this.snackBar.open(message, this.closeLabel, {
            duration: 5000,
        });
    }

    public showInfo(message: string) {
        this.snackBar.open(message, this.closeLabel, {
            duration: 4000,
        });
    }
}
