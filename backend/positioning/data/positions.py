"""Functions for storing position related data """

from prisma import Json
from prisma.models import RawData
from prisma.types import RawDataCreateInput

from schema_gen.position import Position
from processing.constants import FIND_POSITION_FOR_STATS_AGE_DAYS
from processing.custom_types import DeviceStats, ParsedPosition
from data import logger
from data.trackers import get_tracker


async def store_raw_data(ppos: ParsedPosition):
    """Store the ParsedPosition as RawData entry in the database"""
    entry: RawDataCreateInput = {
        "trackerId": ppos.tracker.uid,
        "timestamp": ppos.timestamp,
        "processed": ppos.processed,
        "data": Json(ppos.position.model_dump(exclude_unset=True, exclude_defaults=True)),
    }
    if ppos.vehicle is not None:
        entry["vehicleId"] = ppos.vehicle.uid

    # Save
    db_entry = await RawData.prisma().create(entry)
    ppos.dbID = db_entry.uid


async def store_stats(stats: DeviceStats):
    """Store the DeviceStats as auxiliary data entry in the latest position entry"""

    # Find track in DB
    tracker = get_tracker(stats.deviceID, None)

    if tracker:
        # Search position to attach to
        latest = await RawData.prisma().find_first(
            where={
                "trackerId": tracker.uid,
            },
            order={
                "timestamp": "desc",
            },
        )
        if latest:
            # Check age
            if abs((latest.timestamp - stats.timestamp).days) < FIND_POSITION_FOR_STATS_AGE_DAYS:
                pos = Position.model_validate(latest.data)

                # Attach
                if pos.additions:
                    pos.additions["stats"] = stats.data
                else:
                    pos.additions = {"stats": stats.data}

                # Update
                await RawData.prisma().update(
                    where={
                        "uid": latest.uid,
                    },
                    data={
                        "data": Json(pos.model_dump(exclude_unset=True, exclude_defaults=True)),
                    },
                )
            else:
                logger.info(
                    "Device statistics for device %s will not be store because latest position data entry is %d days old.",
                    stats.deviceID,
                    (latest.timestamp - stats.timestamp).days,
                )
        else:
            logger.warning(
                "Unable to store device statistics for device %s because no position data can be found to attach them.", stats.deviceID
            )
    else:
        logger.warning("No tracker registered for device ID %s for storing device statistics.", stats.deviceID)
