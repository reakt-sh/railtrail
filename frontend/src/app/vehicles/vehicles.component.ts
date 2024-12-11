import { Component, OnInit } from "@angular/core";
import { MyMaterialModule } from "../shared/my-material.module";
import { NotificationService } from "../shared/notification.service";
import { AuthService } from "../auth/auth.service";
import { LoggingService } from "../shared/logging.service";
import { VehiclesService } from "../shared/vehicles.service";
import { Logger } from "loglevel";
import { VehicleList } from "../../../schema-gen/vehicle_list";

@Component({
    selector: "app-vehicles",
    standalone: true,
    imports: [MyMaterialModule],
    templateUrl: "./vehicles.component.html",
    styleUrl: "./vehicles.component.scss"
})
export class VehiclesComponent implements OnInit {

    private readonly logger: Logger;
    protected vehicleList?: VehicleList;
    protected loaded = false;

    constructor(
        protected readonly notifier: NotificationService,
        protected readonly auth: AuthService,
        protected readonly vehicles: VehiclesService,
        readonly logging: LoggingService,
    ) {
        this.logger = logging.getLogger("vehicles:component");
    }

    ngOnInit(): void {
        this.requestList();
    }

    private requestList() {
        this.vehicles.requestList().subscribe({
            next: (list: VehicleList) => {
                this.loaded = true;
                this.vehicleList = list;
            },
            error: (err) => {
                this.logger.error(err);
                this.notifier.showError($localize`Could not load vehicle list!`);
            }
        });
    }
}
