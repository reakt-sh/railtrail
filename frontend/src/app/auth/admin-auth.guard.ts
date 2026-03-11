import { inject, Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, RouterStateSnapshot } from "@angular/router";
import { AuthRole, AuthService } from "./auth.service";

@Injectable({
    providedIn: "root",
})
export class AdminAuthGuard implements CanActivate, CanActivateChild {

    private readonly authService: AuthService = inject(AuthService);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        return this.authService.checkLogin(state.url, AuthRole.Admin);
    }

    canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        return this.canActivate(route, state);
    }

}
