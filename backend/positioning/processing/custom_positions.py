from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from schema_gen.position import Position
from prisma.models import Tracker, Vehicle

class ParsedPosition(BaseModel):
    position: Position
    timestamp: datetime
    processed: datetime
    tracker: Tracker
    vehicle: Optional[Vehicle] = None

class ProjectedPosition(BaseModel):
    position: Position
    timestamp: datetime
    created: datetime
    vehicle: Vehicle