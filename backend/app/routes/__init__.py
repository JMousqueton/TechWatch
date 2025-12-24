from .auth import router as auth_router
from .feeds import router as feeds_router
from .keywords import router as keywords_router
from .articles import router as articles_router
from .config import router as config_router
from .users import router as users_router

__all__ = ["auth_router", "feeds_router", "keywords_router", "articles_router", "config_router", "users_router"]
