from asyncio import create_task, wait
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from data.analyses import retrieve_latest_analysis_per_vehicle
from processing.custom_types import AnalysisData
from processing import logger as parent_logger
from traceback import print_exc

logger = parent_logger.getChild("notifier")


async def handle_subscription(websocket: WebSocket):
    try:
        await websocket.accept()
        logger.info("Subscriber connected.")

        # Register connection
        _connections.append(websocket)

        # Send initial state of all vehicles
        for data in _initial_data.values():
            await websocket.send_json(data)

        # Send updates
        while websocket.client_state == WebSocketState.CONNECTED:
            # Wait for incoming message and discard it to keep connection alive
            await websocket.receive()
        logger.info("Subscriber connection ended.")
    except WebSocketDisconnect:
        logger.info("Subscriber disconnected.")
    except Exception:
        logger.error("Websocket error! Subscriber connection failed.")
        print_exc()
    finally:
        # De-Register connection
        _connections.remove(websocket)


async def notify_subscribers(ana: AnalysisData):
    if ana.map_pos:
        # Convert to Json
        data = ana.map_pos.model_dump(exclude_unset=True, exclude_defaults=True)

        # Store new position in initial state for new connections
        global _initial_data
        _initial_data[ana.map_pos.vehicle] = data

        # Send data to all clients
        for c in _connections:
            logger.info("Broadcasting new map position.")
            try:
                await c.send_json(data)
            except Exception:
                logger.error("Failed to send message to client", c)
                print_exc()
    else:
        logger.warning("Given AnalysisData does not contain a MapPosition!")


async def sync_initial_positions():
    new_data = {}

    records = await retrieve_latest_analysis_per_vehicle()
    for vehicle, analysis in records:
        if analysis.mapPosition:
            # Update label in case of recent changes
            if "label" in vehicle.info:
                analysis.mapPosition.label = str(vehicle.info["label"])

            new_data[vehicle.uid] = analysis.mapPosition.model_dump(exclude_unset=True, exclude_defaults=True)

    # Set new state
    global _initial_data
    _initial_data = new_data
    logger.info("Loaded %d map positions for vehicles", len(new_data.values()))


async def close_connections():
    """Close all connections"""
    closes = [create_task(c.close()) for c in _connections if c.client_state != WebSocketState.DISCONNECTED]
    if len(closes) > 0:
        await wait(closes, timeout=2.0)
        logger.info("All subscriber connections closed.")
    else:
        logger.info("All subscriber connections already closed.")


### INTERNAL

_connections: list[WebSocket] = []
_initial_data = {}
