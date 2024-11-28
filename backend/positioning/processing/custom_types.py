"""Custom types used internally (non API).
   API must be specified via JSON Schema!"""

from datetime import datetime
from typing import Any, Optional, List

from pydantic import BaseModel
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

class DeviceStats(BaseModel):
    deviceID: str
    timestamp: datetime
    data: Any

