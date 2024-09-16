import { Prisma } from '@prisma/client';
import deepEqual from "deep-equal";
import http from 'http';
import * as logging from 'loglevel';
import { TrackerInfo, VehicleInfo, VehicleList } from 'schema-gen/vehicle_list';
import { apiRouter } from '../api';
import { authAdminGuard } from '../auth';
import { config } from '../config';
import { db } from "../db";
import checkWithSchema from '../validate';

const logger = logging.getLogger("api:vehicles");

apiRouter.get('/vehicles', async (req, res) => {
  const allVehicles = await db.vehicle.findMany({ include: { tracker: true }, orderBy: { uid: 'asc' } });
  const allTrackers = await db.tracker.findMany({ orderBy: { uid: 'asc' } });
  const list: VehicleList = {
    vehicles: allVehicles.map((v) => {
      return {
        id: v.uid,
        info: v.info as unknown as VehicleInfo,
        trackers: v.tracker?.map((t) => t.uid),
      }
    }),
    trackers: allTrackers.map((t) => {
      return {
        id: t.uid,
        info: t.info as unknown as TrackerInfo,
      }
    }),
  }

  res.send(list).end();
});


apiRouter.post('/vehicles', authAdminGuard, async (req, res) => {
  const newList: VehicleList = req.body;
  const validationErrors = checkWithSchema("vehicle_list", newList);
  if (validationErrors) {
    res.status(400).send(validationErrors).end();
  } else {
    let changes = false;
    const allVehicles = await db.vehicle.findMany();
    const allTrackers = await db.tracker.findMany();
    const association: Record<number, number> = {};

    // Update vehicles
    for (let i = 0; i < newList.vehicles.length; i++) {
      const vehicle = newList.vehicles[i];
      if (vehicle.id >= 0) {
        // Change existing
        const original = allVehicles.find(v => v.uid === vehicle.id);
        if (original) {
          if (!deepEqual(original.info, vehicle.info)) {
            changes = true;
            db.vehicle.update({
              where: {
                uid: vehicle.id
              },
              data: {
                info: vehicle.info as unknown as Prisma.InputJsonValue
              }
            }).catch((err) => logger.error("Failed to update vehicle ", vehicle.id, err));
          }

          if (vehicle.trackers) {
            // store association
            vehicle.trackers.forEach(t => association[t] = vehicle.id);
          }
        } else {
          logger.info("Could not find vehicle for change by user with uid: ", vehicle.id);
        }
      } else {
        changes = true;
        // Add new
        const newVehicle = await db.vehicle.create({
          data: {
            info: vehicle.info as unknown as Prisma.InputJsonValue
          }
        });
        if (!newVehicle) {
          logger.error("Failed to create new vehicle");
        }

        if (vehicle.trackers) {
          // store association
          vehicle.trackers.forEach(t => association[t] = newVehicle.uid);
        }
      }
    }

    // Update tracker association
    for (let i = 0; i < allTrackers.length; i++) {
      const tracker = allTrackers[i];

      if (association[tracker.uid]) {
        if (tracker.vehicleId !== association[tracker.uid]) {
          changes = true;

          // Update association
          db.tracker.update({
            where: {
              uid: tracker.uid
            },
            data: {
              vehicleId: association[tracker.uid]
            }
          }).catch((err) => logger.error("Failed to update tracker ", tracker.uid, err));
        }
      } else if (tracker.vehicleId) {
        changes = true;

        // Remove association
        db.tracker.update({
          where: {
            uid: tracker.uid
          },
          data: {
            vehicleId: null
          }
        }).catch((err) => logger.error("Failed to update tracker ", tracker.uid, err));
      }
    }

    // Respond
    res.send(changes).end();

    if (changes) {
      // Notify positioning server about new associations
      try {
        const req = http.request({
          hostname: config.positioningApiHost,
          port: config.positioningApiPort,
          path: '/admin/sync',
          method: 'GET',
          headers: {
            'X-API-Key': config.positioningApiKey,
          },
        }, (res) => {
          if (res.statusCode === 200) {
            logger.debug("Triggered synchronization event in Positioning server");
          } else {
            logger.error("Failed to trigger synchronization event in Positioning server %s (%d)", res.statusMessage, res.statusCode);
          }
        });
        req.on("error", err => logger.error("Failed to trigger synchronization event in Positioning server", err));
        req.end();
      } catch (error) {
        logger.error("Failed to trigger synchronization event in Positioning server", error);
      }
    }
  }
});
