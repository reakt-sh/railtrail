import express from "express";
import { authOperatorGuard } from "./auth";
import fs from "fs";
import { join } from "path";
import log from "loglevel";

export const apiRouter = express.Router();

// middleware that is specific to this router
apiRouter.use(authOperatorGuard);

/**
 * Loads API modules from file system.
 */
export function loadAPI() {
    const dir = join(__dirname, "./api-routes");
    fs.readdirSync(dir).forEach((file) => {
        const source = join(dir, file);
        const stat = fs.statSync(source);
        if (stat && stat.isFile() && file.endsWith(".js")) {
            log.info("Loading API from %s", file);
            require(source);
        }
    });
}

export default apiRouter;
