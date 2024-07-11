import os
import asyncio
import traceback
from schema_gen.position import Position
from processing.custom_positions import ParsedPosition
from processing import logger


def setup_processing():
    """Spawn worker task to handle processing of position data"""
    global _workers
    processing_worker = asyncio.create_task(_processor_loop())
    _workers.add(processing_worker)  # Keep reference to prevent garbage collection
    writeback_worker = asyncio.create_task(_writeback_loop())
    _workers.add(writeback_worker)  # Keep reference to prevent garbage collection


def process_position(pos: Position):
    """Add a new position to the processing queue"""
    global _processing_queue
    try:
        _processing_queue.put_nowait(pos)
    except asyncio.QueueFull:
        logger.warning("Dropped position data because of high load in queue!")


def store_tracking_data(ppos: ParsedPosition):
    """Add a new data record to the storage queue"""
    global _writeback_queue
    try:
        _writeback_queue.put_nowait(ppos)
    except asyncio.QueueFull:
        logger.warning("Dropped parsed position data because of high load in queue!")


### INTERNAL

from processing.process import process
from data.positions import store_raw_data

_workers = set()
_processing_queue = asyncio.Queue(maxsize=1000)
_writeback_queue = asyncio.Queue(maxsize=1000)


async def _processor_loop():
    while True:
        pos: Position = await _processing_queue.get()
        try:
            processed = await process(pos)
            if not processed:
                logger.warning("Discarded invalid data: %s", pos)
        except Exception:
            traceback.print_exc()
            logger.error("Processing failed!")


async def _writeback_loop():
    while True:
        data = await _writeback_queue.get()
        try:
            if isinstance(data, ParsedPosition):
                await store_raw_data(data)
            else:
                logger.warning("Discarded writeback data because of unknown type: %s", type(data))
        except Exception:
            traceback.print_exc()
            logger.error("Database writeback failed!")
