import re
import traceback
from typing import Dict, cast
from prisma import Json
from prisma.models import Tracker, Vehicle
from pydantic import ValidationError
from schema_gen.tracker import TrackerInfo
from schema_gen.position import Position
from prisma.types import TrackerCreateInput
from data import logger as parent_logger


logger = parent_logger.getChild("analysis")

_tracker_cache: Dict[str, Tracker] = {}
_tracker_info_cache: Dict[str, TrackerInfo] = {}
_vehicle_map: Dict[str, Vehicle] = {}


def all_trackers():
    return _tracker_cache.values()


def all_vehicles():
    return _vehicle_map.values()


def get_tracker(deviceID: str, deviceType: str | None) -> Tracker | None:
    """Get the Tracker db entry for the given device"""
    # TODO handle mobile devices differently
    if deviceID in _tracker_cache:
        return _tracker_cache[deviceID]
    else:
        return None


def tracker_info(tracker: Tracker) -> TrackerInfo:
    """Get TrackerInfo for tracker entry"""
    if "deviceID" in tracker.info and tracker.info["deviceID"] in _tracker_info_cache:
        return _tracker_info_cache[cast(str, tracker.info["deviceID"])]
    else:
        return TrackerInfo.model_validate(tracker.info)


async def register_tracker(message: Position) -> Tracker:
    """Create a new Tracker for the received massage and register it in the database"""
    # TODO handle mobile devices differently
    info = TrackerInfo(
        deviceID=message.deviceID,
        deviceType=message.deviceType,
        batteryV=message.batteryV,
        devEUI=None,
    )

    # Special case for bad id in testing
    if re.search(r"^reakt-oyster3-draisine-[0-9]+-[0-9a-fA-F]{16}$", message.deviceID) is not None:
        eui = message.deviceID.split("-")[-1]
        info.devEUI = eui
        info.deviceID = eui

    # Create entry
    entry: TrackerCreateInput = {
        "info": Json(info.model_dump(exclude_unset=True, exclude_defaults=True)),
    }
    tracker = await Tracker.prisma().create(entry)

    # Register in cache
    _tracker_cache[message.deviceID] = tracker
    if info.devEUI:
        _tracker_cache[info.devEUI] = tracker

    return tracker


def find_vehicle_by_id(trackerID: str) -> Vehicle | None:
    """Get the vehicle via device id of associated tracker"""
    if trackerID in _vehicle_map:
        return _vehicle_map[trackerID]
    return None


async def sync_trackers():
    """Retrieve tracker and vehicle data from the database and update caches"""
    trackers = await Tracker.prisma().find_many(include={"vehicle": True})

    # Clear caches
    global _tracker_cache
    global _tracker_info_cache
    global _vehicle_map
    _tracker_cache = {}
    _tracker_info_cache = {}
    _vehicle_map = {}

    # Update caches
    for tracker in trackers:
        try:
            info = TrackerInfo.model_validate(tracker.info)
            _tracker_cache[info.deviceID] = tracker
            _tracker_info_cache[info.deviceID] = info

            if info.devEUI:
                _tracker_cache[info.devEUI] = tracker
                _tracker_info_cache[info.devEUI] = info

            if tracker.vehicle is not None:
                _vehicle_map[info.deviceID] = tracker.vehicle
                if info.devEUI:
                    _vehicle_map[info.devEUI] = tracker.vehicle
        except ValidationError as ve:
            logger.error("Tracker record (%d) in database contains invalid data object: %s", tracker.uid, ve)
            traceback.print_exc()
    logger.info(
        "Synchronized %d trackers associated with %d vehicles",
        len(_tracker_cache.values()),
        len(set(map(lambda v: v.uid, _vehicle_map.values()))),
    )
