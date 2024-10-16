from schema_gen.position import Position
from typing import Any


def convert_ttn_to_position(data: Any) -> Position:
    pos = Position.model_validate({"timestamp": "", "longitude": 0, "latitude": 0, "deviceID": "unknown"})

    pos.deviceType = "oyster-3-lorawan"
    pos.original = data

    # Fail if not provided
    pos.deviceID = data["end_device_ids"]["dev_eui"]

    if "received_at" in data:
        pos.timestamp = data["received_at"]
    if "uplink_message" in data:
        uplink = data["uplink_message"]
        if "received_at" in uplink:
            pos.timestamp = uplink["received_at"]
        if "decoded_payload" in uplink:
            payload = uplink["decoded_payload"]
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
    return pos
