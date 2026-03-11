import { AfterViewChecked, Component, DoCheck, ElementRef, HostListener, inject, OnInit, ViewChild } from "@angular/core";
import { MatSidenav } from "@angular/material/sidenav";
import { RouterOutlet } from "@angular/router";
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

    protected readonly layoutService = inject(LayoutService);

    @ViewChild("toolbar", { read: ElementRef }) toolbarRef!: ElementRef;
    // @ViewChild('sidenavcontainer', { static: true })
    // sidenavContainer!: MatSidenavContainer;
    @ViewChild("sidenav") sidenav!: MatSidenav;

    ngOnInit() {
        this.ngAfterViewChecked(); // Iniital element sizes
        this.layoutService.updateWindowSize(window.innerHeight, window.innerWidth, true);
    }

    ngDoCheck() {
        this.layoutService.updateLayout();
    }

    // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
    ngAfterViewChecked() {
        // TODO
    }

    @HostListener("window:resize", ["$event.target"]) // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onResize(target: EventTarget | null) {
        this.layoutService.updateWindowSize(window.innerHeight, window.innerWidth, true);

        if (this.layoutService.sideBySide) {
            this.sidenav.toggle(false);
        }
    }

    get sidebarMode() {
        return this.layoutService.sideBySide ? "side" : "over";
    }
}
