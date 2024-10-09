from dateutil import parser as timestamp_parser
from datetime import datetime
from processing import logger
from data.trackers import *
from schema_gen.position import Position
from processing.projection import perform_projection
from processing.custom_types import AnalysisData, ParsedPosition
from processing.infrastructure import store_data
from prisma.models import Tracker, Vehicle
from processing.constants import TTN_DEVICES

_last_processed_timestamp = {}

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

    # Do not process duplicates
    tracker_data = tracker_info(tracker)
    if tracker_data.deviceID in _last_processed_timestamp:
        last_processed = _last_processed_timestamp[tracker_data.deviceID]
        if last_processed == timestamp:
            logger.info("Duplicate position timestamp. Stopping processing of this one.")
            return True
    _last_processed_timestamp[tracker_data.deviceID] = timestamp

    # Get associated vehicle
    vehicle = _identify_vehicle(pos, tracker, tracker_data)
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
    store_data(ppos)

    # Start analysis
    analysis = AnalysisData(start=datetime.now(),end=datetime.now())
    analysis.vehicle = vehicle

    # Project position to track
    await perform_projection(ppos, analysis)

    # TODO Update battery history
    # TODO Detect events

    # Final timestamp
    analysis.end = datetime.now()

    # Store analysis
    store_data(analysis)

    return True


def _identify_vehicle(pos: Position, tracker: Tracker, info: TrackerInfo) -> Vehicle | None:
    if pos.deviceType in TTN_DEVICES:
        return find_vehicle_by_id(info.deviceID)
    else:
        # TODO Implement association for app-based positions
        # TODO do not trust ALL user association on apps
        return None
