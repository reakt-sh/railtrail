"""Main entry point for positioning server that receives location information and processes and distributes all position related data."""

# If in debug mode, populate environment first
import os

if not os.path.isdir("../../dev/.env"):
    from dotenv import load_dotenv

    load_dotenv(dotenv_path="../../dev/.env")


from fastapi import FastAPI, WebSocket
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from data.database import connect, disconnect
from apis import router
from processing.infrastructure import setup_processing, shutdown_processing
from processing.notifier import close_connections, handle_subscription


# Init api
@asynccontextmanager
async def lifespan(_: FastAPI):
    """Startup and shutdown hook"""
    # Connect to db
    await connect()
    # Analysis worker
    setup_processing()

    yield  # normal operation

    # Close websocket connections
    close_connections()
    # Stop async workers
    shutdown_processing()
    # Close connection
    await disconnect()


# Setup FastAPI
app = FastAPI(lifespan=lifespan)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)


# Register websocket endpoint
@app.websocket("/position-updates")
async def position_updates(ws: WebSocket):
    await handle_subscription(ws)


# Dev Start
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=os.environ.get("HOST", "localhost"),
        port=int(os.environ.get("PORT", "5010")),
        root_path=os.environ.get("URL_ROOT_PATH", ""),
        log_config="log_conf.yaml",
    )
