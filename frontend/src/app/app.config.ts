import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";

import { provideHttpClient } from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { routes } from "./app.routes";
import { WindowProvider } from "./shared/window.provider";

export const appConfig: ApplicationConfig = {
    providers: [provideRouter(routes), provideAnimationsAsync(), provideHttpClient(), WindowProvider]
};
