import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Logger } from "loglevel";
import { BehaviorSubject, catchError, map, Observable, of, skip, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { LoggingService } from "../shared/logging.service";

@Injectable({
    providedIn: "root"
})
export class AuthService {

    private readonly logger: Logger = inject(LoggingService).getLogger("auth:service");
    private readonly router: Router = inject(Router);
    private readonly http: HttpClient = inject(HttpClient);

    private redirectPage?: string;
    public requestedRole?: AuthRole;
    public readonly loginPage = "/login";
    public readonly logoutPage = "/logout";

    private readonly loggedInAs = new BehaviorSubject<LoggedInAs | undefined>(undefined);
    public readonly loggedIn$ = this.loggedInAs.pipe(map(it => !!it));

    constructor() {
        // Init redirector
        this.loggedInAs.pipe(skip(1)).subscribe((loggedInAs) => {
            this.logger.debug("New log in state ", loggedInAs);
            if (loggedInAs && (this.router.url.endsWith(this.loginPage) || this.router.url.endsWith(this.logoutPage))) {
                if (this.redirectPage) {
                    this.logger.debug("Redirecting to ", this.redirectPage);
                    this.router.navigateByUrl(this.redirectPage);
                    this.redirectPage = undefined;
                } else {
                    this.logger.debug("Redirecting to root.");
                    this.router.navigateByUrl("/");
                }
            } else if ((!loggedInAs || (this.requestedRole && this.accessLevelOf(this.requestedRole) > this.accessLevelOf(loggedInAs.role))) && this.redirectPage && this.redirectPage !== this.loginPage) {
                this.router.navigateByUrl(this.loginPage);
                this.logger.debug("Redirecting to login page.");
            }
        });

        // Ease development
        // if (isDevMode()) {
        //   this.logger.info('Detected client-only debug mode. Simulating successful authentication.');
        //   this.loggedInAs.next({role: AuthRole.Admin});
        // }
    }

    public isLoggedIn(): boolean {
        return !!this.loggedInAs.value;
    }

    public isLoggedInAsOperator(): boolean {
        return !!this.loggedInAs.value && this.loggedInAs.value.role === AuthRole.Operator;
    }

    public isLoggedInAsAdmin(): boolean {
        return !!this.loggedInAs.value && this.loggedInAs.value.role === AuthRole.Admin;
    }

    public hasAccessLevel(level: AuthRole): boolean {
        return !!this.loggedInAs.value && this.accessLevelOf(this.loggedInAs.value?.role) >= this.accessLevelOf(level);
    }

    public gainAccessLevel(url: string, level: AuthRole): Observable<boolean> | boolean {
        if (this.isLoggedIn() && this.accessLevelOf(this.loggedInAs.value?.role) >= this.accessLevelOf(level)) {
            return true;
        } else {
            this.redirectPage = url;
            this.requestedRole = level;
            return this.testAuthStatus(level);
        }
    }

    public loginAsRole(role: AuthRole, password: string): Observable<boolean> {
        this.logger.debug("Logging in");
        return this.http.post<LoggedInAs>(environment.webAPI + "/auth/login-role", {
            username: role,
            password: password
        }).pipe(
            tap((loggedInAs) => {
                this.logger.debug("Logged in as ", loggedInAs);
                this.loggedInAs.next(loggedInAs);
            }),
            map((loggedInAs) => !!loggedInAs),
            catchError((err, _) => {
                this.logger.debug("Error while logging in.", err);
                return of(false);
            })
        );
    }

    public logout() {
        this.logger.debug("Logging out");
        this.http.get(environment.webAPI + "auth/logout").subscribe(_ => this.testAuthStatus());
    }

    private testAuthStatus(level?: AuthRole): Observable<boolean> {
        this.logger.debug("Testing authentication");
        return this.http.get<LoggedInAs>(environment.webAPI + "/auth").pipe(
            tap((loggedInAs) => this.loggedInAs.next(loggedInAs)),
            map((loggedInAs) => { // Successfully logged in
                this.logger.debug("Is logged in as ", loggedInAs);
                if (loggedInAs && (level === undefined || this.accessLevelOf(loggedInAs.role) >= this.accessLevelOf(level))) {
                    return true;
                }
                return false;
            }),
            catchError((_) => { // Not logged in
                this.logger.debug("Not yet authenticated");
                this.loggedInAs.next(undefined);
                return of(false);
            })
        );
    }

    private accessLevelOf(role?: AuthRole): number {
        switch (role) {
        case AuthRole.Operator: return 10;
        case AuthRole.Admin: return 99;
        default: return 0;
        }
    }
}

interface LoggedInAs {
    role: AuthRole
    user?: string
}

export enum AuthRole {
    Admin = "admin",
    Operator = "operator"
}
