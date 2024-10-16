import prisma
from data.trackers import sync_trackers
from processing.notifier import sync_initial_positions
from data import logger

_db = prisma.Prisma()
prisma.register(_db)

async def connect():
    # Open connection
    await _db.connect()
    # Sync data
    await synchronize()

async def disconnect():
    # Close connection
    await _db.disconnect()

async def synchronize():
    logger.info("DB synchronization triggered")

    # Synchronize caches with db
    await sync_trackers()
    await sync_initial_positions()
