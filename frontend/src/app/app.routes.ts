import { Routes } from "@angular/router";
import { AdminComponent } from "./admin/admin.component";
import { MapComponent } from "./map/map.component";
import { VehiclesComponent } from "./admin/vehicles/vehicles.component";
import { OperatorAuthGuard } from "./auth/operator-auth.guard";
import { LoginComponent } from "./auth/login/login.component";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { OverviewComponent as FeedbackOverviewComponent } from "./feedback/overview/overview.component";
import { SubmitComponent as FeedbackSubmitComponent } from "./feedback/submit/submit.component";

export const routes: Routes = [
    // auth
    {
        path: "login",
        component: LoginComponent
    },
    {
        path: "logout",
        component: LoginComponent
    },
    // admin
    {
        path: "admin",
        component: AdminComponent,
        canActivate: [AdminAuthGuard]
    },
    {
        path: "admin/vehicles",
        component: VehiclesComponent,
        canActivate: [AdminAuthGuard]
    },
    // Map
    {
        path: "map",
        component: MapComponent,
    },
    // Feedback
    {
        path: "feedback",
        redirectTo: "/feedback/all",
        pathMatch: "full"
    },
    {
        path: "feedback/all",
        component: FeedbackOverviewComponent,
        canActivate: [OperatorAuthGuard]
    },
    {
        path: "feedback/submit",
        component: FeedbackSubmitComponent,
        canActivate: [OperatorAuthGuard]
    },
    // Catch all
    {
        path: "",
        redirectTo: "/map",
        pathMatch: "full"
    },
    {
        path: "**",
        redirectTo: "/map",
    }
];
