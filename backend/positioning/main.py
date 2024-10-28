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
from processing.infrastructure import setup_processing
from processing.notifier import handle_subscription


# Init api
@asynccontextmanager
async def lifespan(_: FastAPI):
    """Startup and shutdown hook"""
    # Connect to db
    await connect()
    # Analysis worker
    setup_processing()

    yield  # normal operation

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

    uvicorn.run(app, host="localhost", port=5010, log_config="log_conf.yaml")
