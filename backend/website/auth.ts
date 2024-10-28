import { Request, Response, NextFunction } from "express";
import * as env from "env-var";
import passport from "passport";
import { Strategy } from "passport-local";
import * as logging from "loglevel";

const logger = logging.getLogger("auth");

export enum AuthRole {
    Admin = "admin",
    Operator = "operator"
}

// Simple middleware to ensure user is authenticated.

/**
 * Only lets users logged in as admins pass.
 */
export function authOperatorGuard(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && ((req.user as any).role === AuthRole.Operator || (req.user as any).role === AuthRole.Admin)) {
        return next();
    }
    res.status(403).end();
}

/**
 * Only lets users logged in as admins pass.
 */
export function authAdminGuard(req: Request, res: Response, next: NextFunction) {
    if (req.isAuthenticated() && (req.user as any).role === AuthRole.Admin) {
        return next();
    }
    res.status(403).end();
}

// FIXME Authentication just for testing
export let testingAuthenticationID = "local";

/**
 * Registers the authentication strategy.
 */
export function initTestingAuthentication() {
    const s = new Strategy((username, password, done) => {
        logger.debug("New log in", username, password);
        // FIXME Do not identify role by name
        switch (username) {
        case AuthRole.Admin: {
            const pw = env.get("PW_ADMIN").asString()
            if (pw && password === pw) {
                done(null, { role: AuthRole.Admin });
                break;
            }
            done(null, false);
            break;
        }
        case AuthRole.Operator: {
            const pw = env.get("PW_OPERATOR").asString()
            if (pw && password === pw) {
                done(null, { role: AuthRole.Operator });
                break;
            }
            done(null, false);
            break;
        }
        default:
            done(null, false);
            break;
        }
    });
    passport.use(s);

    testingAuthenticationID = s.name;

    // FIXME Do not identify role by name
    passport.serializeUser((user: any, done) => {
        done(null, user.role);
    });
    // FIXME Do not identify role by name
    passport.deserializeUser((user: any, done) => {
        done(null, { role: user });
    });
}
