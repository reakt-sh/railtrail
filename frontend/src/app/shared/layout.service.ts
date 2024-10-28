import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Subscription } from "rxjs";
import { auditTime, share } from "rxjs/operators";

@Injectable({
    providedIn: "root"
})
export class LayoutService implements OnDestroy {

    private readonly sideBySideWidthThreshold = 800; // Threshold in window width to switch to overlay side menu and disable constent margins
    private readonly topMenuWidthOffset = 300; // Offset size by hamburger and home button

    private windowHeight = 0;
    private windowWidth = 0;
    private toolbarHeight = 0;
    private topMenuWidth = 0;
    private footerHeight = 0;

    private maxContentArea = false;

    private _headerHeight = 0;
    get headerHeight() { return this._headerHeight; }
    private _contentHeight = 0;
    get contentHeight() { return this._contentHeight; }
    private _mainContentHeight = 0;
    get mainContentHeight() { return this._mainContentHeight; }
    private _sideBySide = true;
    get sideBySide() { return this._sideBySide; }
    private _topMenuVisible = true;
    // get topMenuVisible() { return this._topMenuVisible; }
    // private _contentMargin = 10;
    // get contentMargin() { return this._contentMargin; }
    // private _maximizedContentArea = false;
    // get maximizedContentArea() { return this._maximizedContentArea; }

    private _change = new BehaviorSubject<LayoutService>(this);
    readonly change$ = this._change.pipe(auditTime(100), share());

    private recalculate = false;
    private readonly subscription = new Subscription();

    constructor() {
        this.calculateLayout();
        // this.subscription.add(settings.darktheme$.subscribe(() => this.recalculate = true));
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private calculateLayout() {
        this._headerHeight = this.toolbarHeight;
        this._contentHeight = this.windowHeight - this.toolbarHeight;
        this._mainContentHeight = this.contentHeight - this.footerHeight;
        this._sideBySide = this.windowWidth > this.sideBySideWidthThreshold;
        this._topMenuVisible = this.topMenuWidth + this.topMenuWidthOffset < this.windowWidth;
        // if (this.settings.darktheme) {
        //   this._contentBackgroundAlpha = this.settings.contentBackgroundAlpha * this.contentBackgroundDarkthemeAlphaModifier;
        // } else {
        //   this._contentBackgroundAlpha = this.settings.contentBackgroundAlpha;
        // }
        // if (this.sideBySide && !this.maxContentArea) {
        //   this._contentMargin = 10;
        // } else {
        //   this._contentMargin = 0;
        // }
        // this._maximizedContentArea = this.maxContentArea;
        // Notify
        this._change.next(this);
    }

    updateLayout() {
        if (this.recalculate) {
            this.calculateLayout();
            this.recalculate = false;
        }
    }

    updateWindowSize(height: number, width: number, updateNow = false) {
        this.windowHeight = height;
        this.windowWidth = width;
        if (updateNow) {
            this.calculateLayout();
        } else {
            this.recalculate = true;
        }
    }

    updateToolbarSize(height: number, width: number, updateNow = false) {
        if (this.toolbarHeight !== height) {
            this.toolbarHeight = height;
            if (updateNow) {
                this.calculateLayout();
            } else {
                this.recalculate = true;
            }
        }
    }

    updateTopmenuSize(height: number, width: number, updateNow = false) {
        if (this.topMenuWidth !== width) {
            this.topMenuWidth = width;
            if (updateNow) {
                this.calculateLayout();
            } else {
                this.recalculate = true;
            }
        }
    }

    updateFooterSize(height: number, width: number, updateNow = false) {
        if (this.footerHeight !== height) {
            this.footerHeight = height;
            if (updateNow) {
                this.calculateLayout();
            } else {
                this.recalculate = true;
            }
        }
    }

    disableContentBackground(disable: boolean, updateNow = false) {
        if (updateNow) {
            this.calculateLayout();
        } else {
            this.recalculate = true;
        }
    }

    maximizeContentArea(maximize: boolean, updateNow = false) {
        this.maxContentArea = maximize;
        if (updateNow) {
            this.calculateLayout();
        } else {
            this.recalculate = true;
        }
    }

}

