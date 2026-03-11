import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { MyMaterialModule } from "../../shared/my-material.module";
import { AuthRole, AuthService } from "../auth.service";

@Component({
    selector: "app-auth-login",
    imports: [MyMaterialModule, RouterModule, ReactiveFormsModule],
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {

    protected readonly authService: AuthService = inject(AuthService);
    private readonly router: Router = inject(Router);

    protected logout = false;
    protected roles = AuthRole;
    protected hide = signal(true);
    protected selectedRole: AuthRole = AuthRole.Operator;
    protected readonly passwordForm = new FormControl<string>("", [Validators.required]);
    protected passwordErrorMessage = signal("");
    protected failed = signal(false);

    ngOnInit(): void {
        if (this.router.url.endsWith(this.authService.logoutPage)) {
            this.logout = true;
            this.authService.logout();
        }
        if (this.authService.requestedRole) {
            this.selectedRole = this.authService.requestedRole;
        }
    }

    protected clickHide(event: MouseEvent) {
        this.hide.set(!this.hide());
        event.stopPropagation();
    }

    protected updateErrorMessage() {
        if (this.passwordForm.hasError("required")) {
            this.passwordErrorMessage.set("You must enter a value");
        } else {
            this.passwordErrorMessage.set("");
        }
    }

    protected sendLogin() {
        this.updateErrorMessage();
        this.failed.set(false);
        if (!this.passwordForm.hasError("required")) {
            this.authService.loginAsRole(this.selectedRole, this.passwordForm.value || "").subscribe((success) => {
                if (!success) {
                    this.failed.set(true);
                }
            })
        }
    }

}
