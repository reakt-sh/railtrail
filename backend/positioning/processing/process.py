from dateutil import parser as timestamp_parser
from datetime import datetime
from processing import logger
from data.trackers import *
from schema_gen.position import Position
from processing.projection import perform_projection
from processing.custom_positions import ParsedPosition
from processing.infrastructure import store_tracking_data
from prisma.models import Tracker, Vehicle
from processing.constants import TTN_DEVICES


async def process(pos: Position) -> bool:
    if pos is None:
        return False

    # Check if timestamp is parsable
    try:
        timestamp = timestamp_parser.isoparse(pos.timestamp)
    except:
        logger.info("Could not parse timestamp: %s", pos.timestamp)
        return False

    # Identify tracking device
    tracker = get_tracker(pos.deviceID, pos.deviceType)
    if tracker is None:
        logger.info("New device detected. Registering %s", pos.deviceID)
        tracker = await register_tracker(pos)
    if tracker is None:
        logger.info("Could not register new tracking device")
        return False

    # Get associated vehicle
    vehicle = _identify_vehicle(pos, tracker)
    if vehicle is None:
        logger.info("Could not find associated vehicle for tracker %s", pos.deviceID)

    # Augment/Fix with original message
    if pos.original and pos.deviceType in TTN_DEVICES:
        if "uplink_message" in pos.original:
            message = pos.original["uplink_message"]
            if "decoded_payload" in message:
                data = message["decoded_payload"]
                if "fixFailed" in data:
                    pos.fixFailed = data["fixFailed"]
                if "inTrip" in data:
                    pos.heartbeat = not data["inTrip"]
                if "batV" in data:
                    pos.batteryV = data["batV"]

    # Store raw data
    ppos = ParsedPosition(position=pos, timestamp=timestamp, processed=datetime.now(), vehicle=vehicle, tracker=tracker)
    store_tracking_data(ppos)

    # Project position to track
    await perform_projection(ppos)

    # TODO Update battery history

    return True


def _identify_vehicle(pos: Position, tracker: Tracker) -> Vehicle | None:
    # TODO do not trust user association on apps
    return None  # FIXME just for testing
