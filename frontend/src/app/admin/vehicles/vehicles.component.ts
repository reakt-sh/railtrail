import { Component, OnInit, ViewChild } from "@angular/core";
import { Logger } from "loglevel";
import { VehicleList } from "../../../../schema-gen/vehicle_list";
import { LoggingService } from "../../shared/logging.service";
import { MyMaterialModule } from "../../shared/my-material.module";
import { NotificationService } from "../../shared/notification.service";
import { TrackerInfo } from "../../../../schema-gen/tracker";
import { MatTableDataSource } from "@angular/material/table";
import { MatSort } from "@angular/material/sort";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../auth/auth.service";
import { VehiclesService } from "../../shared/vehicles.service";

@Component({
    selector: "app-admin-vehicles",
    imports: [FormsModule, MyMaterialModule],
    templateUrl: "./vehicles.component.html",
    styleUrl: "./vehicles.component.scss"
})
export class VehiclesComponent implements OnInit {

    private readonly logger: Logger;

    @ViewChild(MatSort) sort?: MatSort;

    protected readonly labelNewEntry = $localize`new`;
    protected readonly viewModeColumns = ["id", "label", "description", "tracker"];
    protected readonly editModeColumns = ["id", "label-edit", "description-edit", "tracker", "tracker-edit"];

    protected loaded = false;
    protected edit = false;
    protected displayedColumns = this.viewModeColumns;
    protected unassignedTrackers: TrackerInfo[] = [];
    protected tableSource = new MatTableDataSource<TableRow>([]);
    protected vehicleList?: VehicleList;

    constructor(
        readonly notifier: NotificationService,
        readonly auth: AuthService,
        readonly vehicles: VehiclesService,
        readonly logging: LoggingService,
    ) {
        this.logger = logging.getLogger("admin::vehicles:component");
    }

    ngOnInit(): void {
        this.tableSource.sort = this.sort ?? null;
        this.requestList();
    }

    enterEditMode() {
        this.displayedColumns = this.editModeColumns;
        this.edit = true;
    }

    addNewRow() {
        const table = this.tableSource.data;
        table.push({
            id: -1,
            label: "",
            newLabel: "",
            description: "",
            newDescription: "",
            trackers: [],
            newTrackers: []
        });
        this.tableSource.data = table;
    }

    addNewTracker(element: TableRow, tracker: TrackerInfo) {
        if (!element.newTrackers.includes(tracker)) {
            element.newTrackers.push(tracker);

            // Remove on other vehicles
            for (const row of this.tableSource.data) {
                if (row !== element) {
                    row.newTrackers = row.newTrackers.filter(t => !element.newTrackers.includes(t));
                }
            }

            // Update unassigned
            this.updateUnassignedTrackers();
        }
    }

    removeNewTracker(element: TableRow, tracker: TrackerInfo) {
        element.newTrackers = element.newTrackers.filter(t => t !== tracker);

        // Update unassigned
        this.updateUnassignedTrackers();
    }

    sendVehicleListUpdate() {
        const newList: VehicleList = {
            vehicles: this.tableSource.data.map(row => {
                return {
                    id: row.id,
                    info: {
                        label: row.newLabel,
                        description: row.newDescription,
                    },
                    trackers: this.vehicleList?.trackers.filter(t => row.newTrackers.includes(t.info)).map(t => t.id),
                }
            }),
            trackers: [],
        };
        this.logger.debug("New vehicle list", newList);
        this.vehicles.saveList(newList).subscribe({
            next: (_: VehicleList) => {
                this.loaded = false;
                this.edit = false;
                this.displayedColumns = this.viewModeColumns;
                this.notifier.showInfo($localize`New vehicle list saved!`);
                this.requestList();
            },
            error: (err) => {
                this.logger.error(err);
                this.notifier.showError($localize`Could not save vehicle list!`);
            }
        });
    }

    private requestList() {
        this.vehicles.requestList().subscribe({
            next: (list: VehicleList) => {
                this.loaded = true;
                this.vehicleList = list;
                this.initTable(list);
                this.updateUnassignedTrackers();
            },
            error: (err) => {
                this.logger.error(err);
                this.notifier.showError($localize`Could not load vehicle list!`);
            }
        });
    }

    private initTable(list: VehicleList) {
        if (this.vehicleList) {
            this.tableSource.data = list.vehicles.map(v => {
                const row: TableRow = {
                    id: v.id,
                    label: v.info.label,
                    newLabel: v.info.label,
                    description: v.info.description ?? "",
                    newDescription: v.info.description ?? "",
                    trackers: [],
                    newTrackers: [],
                }
                if (v.trackers) {
                    row.trackers = v.trackers.map(id => list.trackers.find(t => t.id === id)?.info).filter(t => t !== undefined) ?? [];
                    row.newTrackers = [...row.trackers]; // copy
                }
                return row;
            });
        }
    }

    private updateUnassignedTrackers() {
        if (this.vehicleList) {
            const assigned = this.tableSource.data.flatMap(row => row.newTrackers);
            this.unassignedTrackers = this.vehicleList.trackers.filter(t => !assigned.includes(t.info)).map(t => t.info);
        } else {
            this.unassignedTrackers = [];
        }
    }

}

interface TableRow {
    id: number,
    label: string,
    newLabel: string,
    description: string,
    newDescription: string,
    trackers: TrackerInfo[],
    newTrackers: TrackerInfo[],
    newMultiTracker?: boolean
}
