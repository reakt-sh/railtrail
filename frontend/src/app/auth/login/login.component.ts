import { ChangeDetectionStrategy, Component, OnInit, signal } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { MyMaterialModule } from "../../shared/my-material.module";
import { AuthRole, AuthService } from "../auth.service";

@Component({
    selector: "app-auth-login",
    standalone: true,
    imports: [MyMaterialModule, RouterModule, ReactiveFormsModule],
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {

    protected logout = false;
    protected roles = AuthRole;
    protected hide = signal(true);
    protected selectedRole: AuthRole;
    protected readonly passwordForm = new FormControl<string>("", [Validators.required]);
    protected passwordErrorMessage = signal("");
    protected failed = signal(false);

    constructor(
        protected readonly auth: AuthService,
        private readonly router: Router
    ) {
        this.selectedRole = AuthRole.Operator
    }

    ngOnInit(): void {
        if (this.router.url.endsWith(this.auth.logoutPage)) {
            this.logout = true;
            this.auth.logout();
        }
        if (this.auth.requestedRole) {
            this.selectedRole = this.auth.requestedRole;
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
            this.auth.loginAsRole(this.selectedRole, this.passwordForm.value || "").subscribe((success) => {
                if (!success) {
                    this.failed.set(true);
                }
            })
        }
    }

}
