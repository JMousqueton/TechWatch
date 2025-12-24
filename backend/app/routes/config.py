
from fastapi import APIRouter, Response
from app.config import settings

router = APIRouter(prefix="/config", tags=["config"])

@router.options("/")
def options_config():
    return Response(status_code=200)

@router.get("/")
def get_config():
    """Return minimal runtime config for the frontend UI"""
    return {"allow_register": getattr(settings, "allow_register", True)}
