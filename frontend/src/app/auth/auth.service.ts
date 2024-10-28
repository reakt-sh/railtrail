import { HttpClient } from "@angular/common/http";
import { Injectable, isDevMode } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, map, Observable, of, skip, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { Logger } from "loglevel";
import { LoggingService } from "../shared/logging.service";

@Injectable({
    providedIn: "root"
})
export class AuthService {

    private readonly logger: Logger;
    private redirectPage?: string;
    public requestedRole?: AuthRole;
    public readonly loginPage = "/login";
    public readonly logoutPage = "/logout";

    private readonly loggedInAs = new BehaviorSubject<LoggedInAs | undefined>(undefined);
    public readonly loggedIn$ = this.loggedInAs.pipe(map(it => !!it));

    constructor(
        private router: Router,
        private http: HttpClient,
        logging: LoggingService,
    ) {
        this.logger = logging.getLogger("auth:service");

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
            } else if (!loggedInAs && this.redirectPage && this.redirectPage !== this.loginPage) {
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

    public checkLogin(url: string, role?: AuthRole): Observable<boolean> | boolean {
        let authed = this.isLoggedIn();
        if (authed && role) {
            authed = this.loggedInAs.value?.role === role;
        }

        if (authed) {
            return true;
        } else {
            this.redirectPage = url;
            this.requestedRole = role;
            return this.testAuthStatus();
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
            catchError((err, caught) => {
                this.logger.debug("Error while logging in.", err);
                return of(false);
            })
        );
    }

    public logout() {
        this.logger.debug("Logging out");
        this.http.get(environment.webAPI + "auth/logout").subscribe(_ => this.testAuthStatus());
    }

    private testAuthStatus(role?: AuthRole): Observable<boolean> {
        this.logger.debug("Testing authentication");
        return this.http.get<LoggedInAs>(environment.webAPI + "/auth").pipe(
            tap((loggedInAs) => this.loggedInAs.next(loggedInAs)),
            map((loggedInAs) => { // Successfully logged in
                this.logger.debug("Is logged in as ", loggedInAs);
                if (loggedInAs && (role === undefined || role === loggedInAs.role)) {
                    return true;
                }
                return false;
            }),
            catchError((err) => { // Not logged in
                this.logger.debug("Not yet authenticated");
                this.loggedInAs.next(undefined);
                return of(false);
            })
        );
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
