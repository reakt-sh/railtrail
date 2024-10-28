import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, RouterStateSnapshot } from "@angular/router";
import { AuthRole, AuthService } from "./auth.service";

@Injectable({
    providedIn: "root",
})
export class OperatorAuthGuard implements CanActivate, CanActivateChild {

    constructor(
        private auth: AuthService
    ) {
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ) {
        return this.auth.checkLogin(state.url, AuthRole.Operator);
    }

    canActivateChild(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot) {
        return this.canActivate(route, state);
    }
}
