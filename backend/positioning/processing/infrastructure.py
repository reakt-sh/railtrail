import asyncio
import traceback
from datetime import datetime

from processing import logger
from schema_gen.position import Position
from processing.custom_types import AnalysisData, DeviceStats, ParsedPosition
from processing.constants import BLOCK_REPROCESSING_ANALYSES_TIMESPAN
from processing.position_processing import process_new_position, reprocess_latest_analyses
from data.positions import store_raw_data, store_stats
from data.analyses import store_analysis

### INTERNAL Variables

_workers: set[asyncio.Task] = set()
_processing_queue = asyncio.Queue(maxsize=1000)
_writeback_queue = asyncio.Queue(maxsize=1000)
_reprocessing: asyncio.Task | None = None

### Public API

def setup_processing():
    """Spawn worker task to handle processing of position data"""
    processing_worker = asyncio.create_task(_processor_loop())
    _workers.add(processing_worker)  # Keep reference to prevent garbage collection
    writeback_worker = asyncio.create_task(_writeback_loop())
    _workers.add(writeback_worker)  # Keep reference to prevent garbage collection


def shutdown_processing():
    """Stop all workers by shutting down queues"""
    _processing_queue.shutdown()
    _writeback_queue.shutdown()
    if _reprocessing is not None and not _reprocessing.done():
        _reprocessing.cancel()


def process_position(pos: Position):
    """Add a new position to the processing queue"""
    try:
        _processing_queue.put_nowait(pos)
    except asyncio.QueueFull:
        logger.warning("Dropped position data because of high load in queue!")


def store_data(data):
    """Add a new data record to the storage queue"""
    try:
        _writeback_queue.put_nowait(data)
    except asyncio.QueueFull:
        logger.warning("Dropped data because of high load in writeback queue!")


def start_reprocessing_analyses() -> bool:
    """Issues reprocessing of analyses for all vehicles."""
    global _reprocessing
    if _reprocessing is not None:
        if not _reprocessing.done():
            logger.info("Blocked reprocessing analyses because a previous run is still in progress.")
            return False
        else:
            try:
                timestamp = _reprocessing.result()
                if (datetime.now() - timestamp).total_seconds() < BLOCK_REPROCESSING_ANALYSES_TIMESPAN:
                    logger.info("Blocked reprocessing analyses because a previous run was finished only %s seconds ago.", (datetime.now() - timestamp).total_seconds())
                    return False
                # continue and start new one
            except Exception as e:
                logger.warning("Previous reprocessing analyses failed: %s", e)
                # continue and start new one

    logger.info("Starting new reprocessing of analyses.")
    _reprocessing = asyncio.create_task(reprocess_latest_analyses())
    return True


### INTERNAL API

async def _processor_loop():
    try:
        while True:
            pos: Position = await _processing_queue.get()
            try:
                processed = await process_new_position(pos)
                if not processed:
                    logger.warning("Discarded invalid data: %s", pos)
            except Exception:
                traceback.print_exc()
                logger.error("Processing failed!")
    except asyncio.QueueShutDown:
        logger.info("Position worker terminated due to queue shutdown.")


async def _writeback_loop():
    try:
        while True:
            data = await _writeback_queue.get()
            try:
                if isinstance(data, ParsedPosition):
                    await store_raw_data(data)
                elif isinstance(data, AnalysisData):
                    await store_analysis(data)
                elif isinstance(data, DeviceStats):
                    await store_stats(data)
                else:
                    logger.warning("Discarded writeback data because of unknown type: %s", type(data))
            except Exception:
                traceback.print_exc()
                logger.error("Database writeback failed!")
    except asyncio.QueueShutDown:
        logger.info("Writeback worker terminated due to queue shutdown.")
