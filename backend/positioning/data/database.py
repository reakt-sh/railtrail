"""Database lifecycle functions"""

import prisma

from data import logger
from data.trackers import sync_trackers
from processing.notifier import sync_initial_positions

_db = prisma.Prisma()
prisma.register(_db)

async def connect():
    """Set up database connection"""
    # Open connection
    await _db.connect()
    # Sync data
    await synchronize()

async def disconnect():
    """Close database connection"""
    # Close connection
    await _db.disconnect()

async def synchronize():
    """Synchronize local caches with database entries"""
    logger.info("DB synchronization triggered")

    # Synchronize caches with db
    await sync_trackers()
    await sync_initial_positions()
