import prisma
from data.trackers import sync_trackers

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
    # Synchronize caches with db
    await sync_trackers()