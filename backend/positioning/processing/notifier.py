from asyncio import Queue, QueueFull
from fastapi import WebSocket, WebSocketDisconnect
from processing.custom_positions import ProjectedPosition
from processing import logger as parent_logger
from traceback import print_exc
from schema_gen.map_position import MapPosition

logger = parent_logger.getChild("notifier")


async def handle_subscription(websocket: WebSocket):
    global _update_queues
    queue = Queue(maxsize=100)
    try:
        await websocket.accept()
        logger.debug("Subscriber connected.")

        # Register queue
        _update_queues.append(queue)

        # Send initial state of all vehicles
        for data in _initial_data.values():
            await websocket.send_json(data)

        # Send updates
        while True:
            data = await queue.get()
            await websocket.send_json(data)
    except WebSocketDisconnect:
        logger.debug("Subscriber disconnected.")
    except Exception:
        logger.error("Websocket error!")
        print_exc()
    finally:
        # De-Register queue
        _update_queues.remove(queue)


async def notify_subscribers(pos: ProjectedPosition):
    # Create notification
    map_pos = _convert_to_notification(pos)

    # Convert to Json
    data = map_pos.model_dump(exclude_unset=True, exclude_defaults=True)

    # Store new position in initial state for new connections
    global _initial_data
    _initial_data[map_pos.vehicle] = data

    # Push data to all update queues
    for q in _update_queues:
        try:
            q.put_nowait(data)
        except QueueFull:
            logger.warning("Dropped map position data because of high load in update queue!")


async def sync_initial_positions():
    data = {}

    # TODO implement
    # Pull latest projected positions from database

    # Set new state
    global _initial_data
    _initial_data = data


### INTERNAL

_update_queues = []
_initial_data = {}


def _convert_to_notification(ppos: ProjectedPosition) -> MapPosition:
    return MapPosition(
        timestamp=ppos.timestamp.isoformat(),
        vehicle=ppos.vehicle.uid if ppos.vehicle is not None else hash(ppos.raw_position.deviceID),
        track=ppos.track,
        position=ppos.track_position,
        heading=ppos.heading,
        speed=ppos.raw_position.speed,
        latitude=ppos.latitude,
        longitude=ppos.longitude,
        label=str(ppos.vehicle.info["label"] if ppos.vehicle is not None else ppos.raw_position.deviceID),
    )
