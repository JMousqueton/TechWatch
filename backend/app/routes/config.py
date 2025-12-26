

from fastapi import APIRouter, Response, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import AppConfig
from app.schemas.app_config import AppConfigSetRequest, AppConfigResponse

router = APIRouter(prefix="/config", tags=["config"])

@router.options("/")
def options_config():
    return Response(status_code=200)


@router.get("/")
def get_config():
    """Return minimal runtime config for the frontend UI"""
    return {"allow_register": getattr(settings, "allow_register", True)}


# --- OpenAI API Key Management ---
@router.get("/openai-key", response_model=AppConfigResponse)
def get_openai_api_key(db: Session = Depends(get_db)):
    config = db.query(AppConfig).filter(AppConfig.key == "openai_api_key").first()
    if not config:
        raise HTTPException(status_code=404, detail="OpenAI API key not set")
    return {"key": config.key, "value": config.value}

@router.post("/openai-key", response_model=AppConfigResponse)
def set_openai_api_key(req: AppConfigSetRequest, db: Session = Depends(get_db)):
    if req.key != "openai_api_key":
        raise HTTPException(status_code=400, detail="Invalid key name")
    config = db.query(AppConfig).filter(AppConfig.key == req.key).first()
    if config:
        config.value = req.value
    else:
        config = AppConfig(key=req.key, value=req.value)
        db.add(config)
    db.commit()
    db.refresh(config)
    return {"key": config.key, "value": config.value}
