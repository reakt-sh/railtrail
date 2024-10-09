import jsonschema
import json
import logging
import os
from fastapi import APIRouter, Security, Body, HTTPException, status
from typing import Any
from auth import get_api_key
from data.database import synchronize
from schema_gen.position import Position
from processing.infrastructure import process_position
from processing.ttn import convert_ttn_to_position
from processing.notifier import _initial_data

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
    try:
        pos = convert_ttn_to_position(body)
    except Exception as e:
        logger.info(f"Error while converting TTN message. Error: {e} Message: {str(body)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Malformed payload",
        )

    # Mark endpoint
    if pos.additions is None:
        pos.additions = {}
    pos.additions["endpoint"] = "ttn"

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
    # Mark endpoint
    if pos.additions is None:
        pos.additions = {}
    pos.additions["endpoint"] = "onboard"

    # Process
    process_position(pos)

    # FIXME just testing
    global _last_received
    _last_received = pos


_last_received = None  # FIXME Just for testing


@router.get("/tracking/test/latest")
async def latest_data(api_key: str = Security(get_api_key)):
    """FIXME Just for testing"""
    return _last_received


@router.get("/positions/test/current")
async def current_data():
    """FIXME Just for testing"""
    return _initial_data


## Route: Administration


@router.get("/admin/sync")
async def synchronize_db(api_key: str = Security(get_api_key)):
    await synchronize()
    return {"synchronized": True}
