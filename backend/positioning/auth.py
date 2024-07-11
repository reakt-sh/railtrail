import os
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

_api_key_header = APIKeyHeader(name="X-API-Key")


def get_api_key(api_key_header: str = Security(_api_key_header)) -> str:
    """Retrieve and check the API key from the header"""
    if api_key_header == os.environ.get("API_KEY", "secret"):
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API Key",
    )
