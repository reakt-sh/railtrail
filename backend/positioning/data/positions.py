from prisma.models import RawData
from prisma import Json
from processing.custom_types import ParsedPosition
from prisma.types import RawDataCreateInput

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
