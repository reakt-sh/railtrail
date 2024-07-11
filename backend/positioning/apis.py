import jsonschema
import json
import logging
import os
from fastapi import APIRouter, Security, Body, HTTPException, status
from typing import Any
from auth import get_api_key
from processing.infrastructure import process_position
from data.database import synchronize
from schema_gen.position import Position
from processing.ttn import convert_ttn_to_position
from processing.projection import current

router = APIRouter()
logger = logging.getLogger("app.api")

## Routes


@router.get("/hello")
async def hello_world():
    return {"hello": "world"}


## Route: Tracking

### Load json schemas
with open(os.path.join(os.getenv("SCHEMA_PATH", "./schema"), "position.json")) as f:
    _position_schema = json.load(f)


@router.post("/tracking/ttn")
async def raw_tracker(body: Any = Body(), api_key: str = Security(get_api_key)):
    pos = convert_ttn_to_position(body)

    # Validate against schema
    try:
        pos_dict = {k: v for k, v in pos.model_dump().items() if v is not None}
        jsonschema.validate(instance=pos_dict, schema=_position_schema)
    except jsonschema.exceptions.ValidationError as ve:  # type: ignore
        logger.info(ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Malformed payload: " + ve.message,
        )

    # Process normally
    process_position(pos)

    # FIXME just testing
    global _last
    _last = pos


@router.post("/tracking/onboard")
async def onboard_tracker(pos: Position, api_key: str = Security(get_api_key)):
    process_position(pos)

    # FIXME just testing
    global _last
    _last = pos


_last = None  # FIXME Just for testing


@router.get("/tracking/test/latest")
async def latest_data(api_key: str = Security(get_api_key)):
    """FIXME Just for testing"""
    return _last


@router.get("/tracking/test/current")
async def current_data():
    """FIXME Just for testing"""
    return current


## Route: Administration


@router.get("/admin/sync")
async def synchronize_db(api_key: str = Security(get_api_key)):
    await synchronize()
    return {"synchronized": True}
