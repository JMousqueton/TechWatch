from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path

class Settings(BaseSettings):
    # Database - always use absolute path to project root
    database_url: str = f"sqlite:///{Path(__file__).resolve().parent.parent.parent / 'tech_watch.db'}"
    
    # Authentication
    secret_key: str = "your-secret-key-change-this"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8001
    api_reload: bool = False
    debug: bool = True
    # Allow frontend to disable registration via .env: REGISTER=False
    allow_register: bool = True
    
    # CORS
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8001"]
    # Admin users allowed to run maintenance endpoints (comma-separated in env var ADMIN_USERS)
    admin_users: List[str] = ["admin"]
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

settings = Settings()

# Support legacy/alternate env var name `REGISTER` used in .env files
_reg = os.getenv('REGISTER')
if _reg is not None:
    val = str(_reg).strip().lower()
    settings.allow_register = False if val in ("0", "false", "no") else True

# Parse ADMIN_USERS env var if provided
_admins = os.getenv('ADMIN_USERS')
if _admins is not None:
    settings.admin_users = [u.strip() for u in str(_admins).split(',') if u.strip()]
