import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import compression from "compression";
import errorHandler from "errorhandler";
import express from "express";
import session from "express-session";
import fs from "fs";
import helmet from "helmet";
import passport from "passport";
import path from "path";
import apiRouter, { loadAPI } from "./api";
import { authOperatorGuard, initTestingAuthentication, testingAuthenticationID } from "./auth";
import { config } from "./config";
import { db } from "./db";
import { loadSchemas } from "./validate";
import log from "loglevel";

// Configure logger
if (config.debug) {
    log.setLevel(log.levels.DEBUG);
}

// Create Express server
const app = express();

// Setup DB connection
const prisma = db;

// Prepare session store in DB
const sessionStore = new PrismaSessionStore(
    prisma,
    config.sessionStore
);

// Express configuration
app.set("port", config.port);
// increases HTTP security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            // https://helmetjs.github.io/#content-security-policy
            defaultSrc: ["*"], // ["'self'"],
            baseUri: ["'self'"],
            frameAncestors: ["'self'"],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'", "blob:"],
            // scriptSrcAttr: ["'self'"],
            // imgSrc: ["'*'", "https:", "data:"],
            // fontSrc: ["'self'", "https:", "data:"],
            // styleSrc: ["'self'", "https:", "'unsafe-inline'"],
            upgradeInsecureRequests: [],
        },
    },
}));

if (!config.debug) {
    // compresses responses
    app.use(compression());
}

// Parsers for POST data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session/User management
app.use(session({
    ...config.session,
    store: sessionStore
}));
app.use(passport.initialize());
app.use(passport.session());

// Init authentication strategy
// TODO Add support for OAuth
// FIXME Authentication just for testing
initTestingAuthentication();


// Load Payload validator
loadSchemas();

// -----------
// - ROUTING -
// -----------

// Static distribution directories
const frontendPath = config.debug ? "../../../frontend/dist/frontend/browser" : "./frontend";

// Route for just checking authentication
app.get("/api/auth", authOperatorGuard, (req, res) => {
    res.send(req.user).end(); // Return role FIXME improve
});

// Route for logout
app.get("/api/auth/logout", (req, res) => {
    req.logout(() => res.status(200).end());
});

// Route for login
app.post("/api/auth/login-role", (req, res, next) => {
    passport.authenticate(testingAuthenticationID, (err: unknown, user: unknown, info: unknown, status: unknown) => {
        if (user) {
            req.logIn(user, (err) => {
                if (err) {
                    log.error("Error during user log in processing.", err)
                    res.status(500).end();
                } else {
                    res.send(user).end();
                }
            });
        } else {
            res.status(401).end();
        }
    })(req, res, next)
}); // TODO Change when proper authentication is in place

// Primary api routes.
loadAPI();
app.use("/api", apiRouter);
// Fail for other api routes
app.all("/api/*route", authOperatorGuard, (req, res, next) => {
    res.status(404).end();
});

// Static angular routes
// PUBLIC -> no authGuard
app.use(express.static(path.join(__dirname, frontendPath), config.staticRoute));

// Catch all other routes and return the index file (Angular routing!)
// PUBLIC -> no authGuard
app.get("*route", (req, res) => {
    res.sendFile(path.join(__dirname, frontendPath + "/index.html"));
});

// ---------------------
// - FINAL ADJUSTMENTS -
// ---------------------

// Override base tag in html if server is hosted with a different URL base path.
if (config.urlRootPath) {
    const file = (config.debug ? "../../frontend/dist/frontend/browser" : "./frontend") + "/index.html";
    const data = fs.readFileSync(file, "utf8");
    let basePath = config.urlRootPath;
    if (!basePath.endsWith("/")) {
        basePath += "/";
    }
    const result = data.replace(/<base href=[^>]*>/g, `<base href="${basePath}">`);
    fs.writeFileSync(file, result, "utf8");
    console.log("Replaced base path in index.html with: ", basePath);
}

// Error Handler. Provides full stack (removed for production).
if (!config.debug) {
    app.use(errorHandler());
}

export default app;
