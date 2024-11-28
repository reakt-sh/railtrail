"""Main API routes"""

import logging
from typing import Any
import jsonschema
from fastapi import APIRouter, Security, Body, HTTPException, status

from auth import get_api_key
from data.database import synchronize
from schema_gen.position import Position
from processing.constants import ENDPOINT_KEY, ENDPOINT_ID_TTN, ENDPOINT_ID_ONBOARD
from processing.infrastructure import process_position
from processing.ttn import handle_ttn_message
from processing.notifier import _initial_data

router = APIRouter()
logger = logging.getLogger("app.api")

## Routes


@router.get("/hello")
async def hello_world():
    """Just for testing availability"""
    return {"hello": "world"}


## Route: Tracking

@router.post("/tracking/ttn")
async def raw_tracker(body: Any = Body(), _api_key: str = Security(get_api_key)):
    """Handles messages directly from the TTN network"""
    logger.info("Received message on '/tracking/ttn' endpoint: %s", str(body))

    try:
        pos = handle_ttn_message(body)
    except jsonschema.exceptions.ValidationError as ve:  # type: ignore
        logger.info(ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Malformed payload: " + ve.message,
        )
    except Exception as e:
        logger.info(f"Error while parsing TTN message. Error: {e} Message: {str(body)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Malformed payload",
        )

    if pos:
        # Mark endpoint
        if pos.additions is None:
            pos.additions = {}
        pos.additions[ENDPOINT_KEY] = ENDPOINT_ID_TTN

        # Process normally
        process_position(pos)

        # FIXME just testing
        global _last_received
        _last_received = pos
    else:
        logger.debug("No position in parsed TTN message.")


@router.post("/tracking/onboard")
async def onboard_tracker(pos: Position, _api_key: str = Security(get_api_key)):
    """Handles messages from clients adhering to the Position API scheme"""
    logger.info("Received message on '/tracking/onboard' endpoint: %s", str(pos))

    # Mark endpoint
    if pos.additions is None:
        pos.additions = {}
    pos.additions[ENDPOINT_KEY] = ENDPOINT_ID_ONBOARD

    # Process
    process_position(pos)

    # FIXME just testing
    global _last_received
    _last_received = pos


# FIXME Just for testing
_last_received = None


@router.get("/tracking/test/latest")
async def latest_data(_api_key: str = Security(get_api_key)):
    """FIXME Just for testing"""
    return _last_received


@router.get("/positions/test/current")
async def current_data():
    """FIXME Just for testing"""
    return _initial_data


## Route: Administration


@router.get("/admin/sync")
async def synchronize_db(_api_key: str = Security(get_api_key)):
    """Internal endpoint for triggering synchronization with db"""
    await synchronize()
    return {"synchronized": True}
