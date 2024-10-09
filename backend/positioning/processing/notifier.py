from asyncio import Queue, QueueFull
from fastapi import WebSocket, WebSocketDisconnect
from data.analyses import retrieve_latest_analysis_per_vehicle
from processing.custom_types import AnalysisData
from processing import logger as parent_logger
from traceback import print_exc

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


async def notify_subscribers(ana: AnalysisData):
    if ana.map_pos:
      # Convert to Json
      data = ana.map_pos.model_dump(exclude_unset=True, exclude_defaults=True)

      # Store new position in initial state for new connections
      global _initial_data
      _initial_data[ana.map_pos.vehicle] = data

      # Push data to all update queues
      for q in _update_queues:
          try:
              q.put_nowait(data)
          except QueueFull:
              logger.warning("Dropped map position data because of high load in update queue!")
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


### INTERNAL

_update_queues = []
_initial_data = {}
