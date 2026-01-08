import { AfterViewChecked, Component, DoCheck, ElementRef, HostListener, OnInit, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { MatToolbar } from "@angular/material/toolbar";
import { MatSidenav, MatSidenavContainer } from "@angular/material/sidenav";
import { OverlayContainer } from "@angular/cdk/overlay";
import { LayoutService } from "./shared/layout.service";
import { MyMaterialModule } from "./shared/my-material.module";

@Component({
    selector: "app-root",
    imports: [
        RouterOutlet,
        MyMaterialModule,
    ],
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss"
})
export class AppComponent implements OnInit, DoCheck, AfterViewChecked {

    @ViewChild("toolbar", { read: ElementRef })
    toolbarRef!: ElementRef;
    // @ViewChild('sidenavcontainer', { static: true })
    // sidenavContainer!: MatSidenavContainer;
    @ViewChild("sidenav")
    sidenav!: MatSidenav;

    constructor(
        readonly layout: LayoutService,
        // private readonly overlayContainer: OverlayContainer
    ) { }

    ngOnInit() {
        this.ngAfterViewChecked(); // Iniital element sizes
        this.layout.updateWindowSize(window.innerHeight, window.innerWidth, true);
    }

    ngDoCheck() {
        this.layout.updateLayout();
    }

    ngAfterViewChecked() {
    }

    @HostListener("window:resize", ["$event.target"])
    onResize(target: EventTarget | null) {
        this.layout.updateWindowSize(window.innerHeight, window.innerWidth, true);

        if (this.layout.sideBySide) {
            this.sidenav.toggle(false);
        }
    }

    get sidebarMode() {
        return this.layout.sideBySide ? "side" : "over";
    }
}
