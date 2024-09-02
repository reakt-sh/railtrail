import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, RouterStateSnapshot } from '@angular/router';
import { AuthRole, AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private auth: AuthService
  ) {
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    return this.auth.checkLogin(state.url, AuthRole.Admin);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot) {
    return this.canActivate(route, state);
  }

}
