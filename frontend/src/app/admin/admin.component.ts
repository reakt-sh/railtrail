import { Component, ChangeDetectionStrategy } from "@angular/core";
import { RouterLink } from "@angular/router";
import { MyMaterialModule } from "../shared/my-material.module";

@Component({
    selector: "app-admin",
    imports: [RouterLink, MyMaterialModule],
    templateUrl: "./admin.component.html",
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: "./admin.component.scss",
})
export class AdminComponent {}
