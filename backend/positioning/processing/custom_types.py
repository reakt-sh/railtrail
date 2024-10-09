from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List
from schema_gen.map_position import MapPosition
from schema_gen.position import Position
from prisma.models import Tracker, Vehicle

class ParsedPosition(BaseModel):
    position: Position
    timestamp: datetime
    processed: datetime
    tracker: Tracker
    vehicle: Optional[Vehicle] = None
    dbID: Optional[int] = None

class Projection(BaseModel):
    created: datetime
    positions: List[ParsedPosition]

class AnalysisData(BaseModel):
    start: datetime
    end: datetime
    vehicle: Optional[Vehicle] = None
    map_pos: Optional[MapPosition] = None
    projection_source: Optional[Projection] = None
    dbID: Optional[int] = None


