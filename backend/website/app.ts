import compression from "compression";
import debug from "debug";
import errorHandler from "errorhandler";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import passport from "passport";
import path from "path";
import fs from "fs";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { config } from "./config";
import { PrismaClient } from '@prisma/client'


// Logging
const log = debug("app");

// Create Express server
const app = express();

// Setup DB connection
const prisma = new PrismaClient()

// Prepare session store
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


// Attach userID when authenticated
passport.serializeUser((user: any, done) => { // FIXME Type
  done(null, user.id);
});

// Extend incoming messages by userID
passport.deserializeUser((userId: number, done) => {
  // Requesting the full user each time is far to slow
  done(null, userId);
});


// -----------
// - ROUTING -
// -----------

// Static distribution directories
const frontendPath = config.debug ? "../../../frontend/dist/frontend/browser" : "./frontend";

// Static angular routes
// PUBLIC -> no authGuard
app.use(express.static(path.join(__dirname, frontendPath), config.staticRoute));

// Catch all other routes and return the index file (Angular routing!)
// PUBLIC -> no authGuard
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, frontendPath + "/index.html"));
});

// ---------------------
// - FINAL ADJUSTMENTS -
// ---------------------

// Override base tag in html if server is hosted with a different URL base path.
if (config.urlRootPath) {
  const file = (config.debug ? "../../frontend/dist/frontend/browser" : "./frontend") + "/index.html";
  const data = fs.readFileSync(file, 'utf8');
  var basePath = config.urlRootPath;
  if (!basePath.endsWith("/")) {
    basePath += "/";
  }
  const result = data.replace(/<base href=[^>]*>/g, `<base href="${basePath}">`);
  fs.writeFileSync(file, result, 'utf8');
  console.log('Replaced base path in index.html with: ', basePath);
}

// Error Handler. Provides full stack (removed for production).
if (!config.debug) {
  app.use(errorHandler());
}

export default app;
