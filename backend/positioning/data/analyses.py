import traceback
from typing import List, Tuple
from prisma.models import Analysis, Vehicle, AnalysisSource
from prisma import Json
from pydantic import ValidationError
from data.trackers import all_vehicles
from schema_gen.analysis import AnalysisInfo
from processing.custom_types import AnalysisData
from data import logger as parent_logger
from prisma.types import AnalysisCreateInput

logger = parent_logger.getChild("analysis")

async def store_analysis(ana: AnalysisData):
    """Store the AnalysisData as Analysis entry in the database"""
    info = AnalysisInfo(
      timestamp=ana.end.isoformat(),
      processingTime=(ana.end - ana.start).total_seconds(),
      mapPosition=ana.map_pos
    )
    entry: AnalysisCreateInput = {
        "timestamp": ana.end,
        "data": Json(info.model_dump(exclude_unset=True, exclude_defaults=True)),
    }
    if ana.vehicle is not None:
        entry["vehicleId"] = ana.vehicle.uid

    # Save
    db_entry = await Analysis.prisma().create(entry)
    ana.dbID = db_entry.uid

    # Add relations
    if ana.projection_source:
      for pos in ana.projection_source.positions:
          if pos.dbID: # Always save position first
              await AnalysisSource.prisma().create({
                  "analysisId": db_entry.uid,
                  "dataId": pos.dbID,
              })


async def retrieve_latest_analysis_per_vehicle() -> List[Tuple[Vehicle, AnalysisInfo]]:
    """Retrieve latest analysis for each vehicle"""
    result = []

    for v in all_vehicles():
        latest = await Analysis.prisma().find_first(
            where={
                'vehicleId': v.uid,
            },
            order={
                'timestamp': 'desc',
            },
        )
        if latest:
            try:
                info = AnalysisInfo.model_validate(latest.data)
                result.append((v, info))
            except ValidationError as ve:
                logger.error("Analysis record (%d) in database contains invalid data object: %s", latest.uid, ve)
                traceback.print_exc()

    return result
