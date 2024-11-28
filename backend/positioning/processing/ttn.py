"""Helper functions to parse and handle TTN messages"""

import json
import os
from typing import Any
from datetime import datetime
import jsonschema
from processing.custom_types import DeviceStats
from processing import logger
from processing.constants import OYSTER_3_LORA
from schema_gen.position import Position
from processing.infrastructure import store_data
from dateutil import parser as timestamp_parser


def handle_ttn_message(data: Any) -> Position | None:
    """Handles a TTN message.
    If it is a location messages it returns a valid Position,
    otherwise None while handling the message effect internally."""

    device_id = data["end_device_ids"]["dev_eui"]  # Fail if not provided
    timestamp = datetime.now()
    if "received_at" in data:
        try:
            timestamp = timestamp_parser.isoparse(data["received_at"])
        except:
            logger.info("Could not parse timestamp: %s", data["received_at"])

    # Main message
    if "uplink_message" in data:
        uplink = data["uplink_message"]

        # Better timestamp
        if "received_at" in uplink:
            try:
                timestamp = timestamp_parser.isoparse(uplink["received_at"])
            except:
                logger.info("Could not parse timestamp: %s", uplink["received_at"])

        # Payload
        if "decoded_payload" in uplink:
            payload = uplink["decoded_payload"]

            # Empty message
            if not payload:
                logger.info("TTN message has no payload. Skipping processing.")
                return None  # End processing now

            if "type" in payload:
                msg_type = payload["type"]
                if msg_type == "stats":
                    store_data(DeviceStats(
                        timestamp=timestamp,
                        deviceID=device_id,
                        data={**payload, "timestamp": timestamp.isoformat()
                    }))
                    return None  # End processing now
                if msg_type == "location" or msg_type == "position":
                    logger.debug("TTN payload type %s.", msg_type)
                    # fallthrough
                else:
                    logger.info("Unknown TTN payload type %s in %s. Trying to parse location anyway.", msg_type, str(payload))
                    # fallthrough anyway
            else:
                logger.info("No TTN payload type in %s. Trying to parse location anyway.", str(payload))
                # fallthrough anyway

            # Parse location payload
            return _parse_position(payload, device_id, timestamp, data)
        else:
            raise Exception("No decoded_payload field")
    else:
        raise Exception("No uplink_message field")

    return None


### Load position json schema
with open(os.path.join(os.getenv("SCHEMA_PATH", "./schema"), "position.json"), encoding="utf-8") as f:
    _position_schema = json.load(f)


def _parse_position(payload: Any, device_id: str, timestamp: datetime, full_message: Any) -> Position:
    pos = Position.model_validate({"timestamp": timestamp.isoformat(), "longitude": 0, "latitude": 0, "deviceID": device_id})
    pos.deviceType = OYSTER_3_LORA
    pos.original = full_message

    pos.batteryV = payload["batV"]
    pos.heartbeat = not bool(payload["inTrip"])
    pos.fixFailed = payload["fixFailed"]
    if not pos.fixFailed:
        pos.latitude = payload["latitudeDeg"]
        pos.longitude = payload["longitudeDeg"]
        pos.heading = payload["headingDeg"]
        pos.speed = payload["speedKmph"]
    elif payload["cached"]:
        pos.latitude = payload["cached"]["latitudeDeg"]
        pos.longitude = payload["cached"]["longitudeDeg"]
        pos.heading = payload["cached"]["headingDeg"]
        pos.speed = payload["cached"]["speedKmph"]

    # Validate against schema (double check values)
    pos_dict = {k: v for k, v in pos.model_dump().items() if v is not None}
    jsonschema.validate(instance=pos_dict, schema=_position_schema)

    return pos
