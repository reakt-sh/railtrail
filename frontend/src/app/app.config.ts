import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";

import { provideHttpClient, withXhr } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { routes } from "./app.routes";
import { WindowProvider } from "./shared/window.provider";
import { provideMaplibreWorker } from "@maplibre/ngx-maplibre-gl/config";

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideAnimationsAsync(),
        provideHttpClient(withXhr()),
        WindowProvider,
        provideMaplibreWorker("maplibre-gl-worker.mjs"),
    ],
};
