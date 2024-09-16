import * as env from "env-var";
import * as dotenv from "dotenv";
import { existsSync } from "fs"

/**
 * See example.env file.
 */
export class Config {

  readonly debug: boolean = env.get("NODE_ENV").default("debug").asString() !== "production";
  readonly port = env.get("PORT").default("3000").asPortNumber();
  readonly dbUrl = env.get("DB_URL").required().asUrlString(); // PostgresURL with credentials
  readonly urlRootPath = env.get("URL_ROOT_PATH").default("").asString(); // Adjusted value for base href in index.html
  readonly staticRoute = {
    maxAge: 31557600000
  };
  readonly session = {
    resave: true,
    saveUninitialized: false, // only store after login
    secret: env.get("SESSION_SECRET").required().asString(), // Always change for production!
    name: "sessionID"
  };
  readonly sessionStore = {
    checkPeriod: env.get("SESSION_EXPIRATION").asInt() || (12 * 60 * 60 * 1000),  //ms
    dbRecordIdIsSessionId: true,
    dbRecordIdFunction: undefined,
  };
  readonly positioningApiHost = env.get("POS_API_HOST").required().asString();
  readonly positioningApiPort = env.get("POS_API_PORT").required().asString();
  readonly positioningApiKey = env.get("POS_API_KEY").required().asString();
}

const init = function () {
  // Fill environment with .env file
  if (existsSync("./../../dev/.env")) {
    // Developer mode
    dotenv.config({ path: "./../../dev/.env" });
  } else {
    dotenv.config();
  }
  // Parse config
  try {
    const conf = new Config();
    return conf;
  } catch (e) {
    if (e instanceof env.EnvVarError) {
      console.error("Error in configuration via environment variables. %s", e.message);
    } else {
      console.error("Unexpected error parsing environment variables.");
      console.log(e);
    }
    process.exit(-1);
  }
};

export const config: Config = init();
