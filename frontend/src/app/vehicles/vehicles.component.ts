import { Component, inject, OnInit } from "@angular/core";
import { MyMaterialModule } from "../shared/my-material.module";
import { NotificationService } from "../shared/notification.service";
import { AuthService } from "../auth/auth.service";
import { LoggingService } from "../shared/logging.service";
import { VehiclesService } from "../shared/vehicles.service";
import { Logger } from "loglevel";
import { VehicleList } from "../../../schema-gen/vehicle_list";

@Component({
    selector: "app-vehicles",
    imports: [MyMaterialModule],
    templateUrl: "./vehicles.component.html",
    styleUrl: "./vehicles.component.scss"
})
export class VehiclesComponent implements OnInit {

    private readonly logger: Logger = inject(LoggingService).getLogger("vehicles:component");
    private readonly notificationService: NotificationService = inject(NotificationService);
    private readonly vehiclesService: VehiclesService = inject(VehiclesService);
    private readonly authService: AuthService = inject(AuthService);

    protected vehicleList?: VehicleList;
    protected loaded = false;

    ngOnInit(): void {
        this.requestList();
    }

    private requestList() {
        this.vehiclesService.requestList().subscribe({
            next: (list: VehicleList) => {
                this.loaded = true;
                this.vehicleList = list;
            },
            error: (err) => {
                this.logger.error(err);
                this.notificationService.showError($localize`Could not load vehicle list!`);
            }
        });
    }
}
