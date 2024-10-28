import { config } from "./config";
import app from "./app";

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
    console.log(
        "Server is running at http://localhost:%d in %s mode",
        app.get("port"),
        config.debug ? "debug" : "production"
    );
});

export default server;
