
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.services.article import ArticleService
from app.models import User, Feed, Article
from app.utils.auth import verify_token
from app.config import settings

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

# Place purge endpoint after router is defined
@router.post("/purge/")
def purge_old_articles(days: int = 30, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Purge articles older than the specified number of days."""
    user = get_current_user(authorization=authorization, db=db)
    allowed_admins: List[str] = settings.admin_users or []
    if (not settings.debug) and (user.username not in allowed_admins):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to run maintenance")

    cutoff = datetime.utcnow() - timedelta(days=days)
    # Only delete if published_date is older than cutoff
    old_articles = db.query(Article).filter(Article.published_date != None, Article.published_date < cutoff).all()
    # For legacy: only delete if published_date is NULL and created_at is older than cutoff
    legacy_articles = db.query(Article).filter(Article.published_date == None, Article.created_at < cutoff).all()
    purged_count = 0
    for article in old_articles + legacy_articles:
        db.delete(article)
        purged_count += 1
    db.commit()
    return {"purged_articles": purged_count}


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token"""
    from app.services import UserService

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    username = payload.get("sub")
    user = UserService.get_user_by_username(db, username)

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


@router.post("/rescore/")
def rescore_all(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Rescore all articles for all users.

    Protected: only callable by configured admin users in settings.admin_users or when debug=True.
    Returns number of articles rescored and any errors encountered.
    """
    # Validate user and admin rights
    user = get_current_user(authorization=authorization, db=db)

    allowed_admins: List[str] = settings.admin_users or []
    if (not settings.debug) and (user.username not in allowed_admins):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to run maintenance")

    total = 0
    errors = []

    users = db.query(User).all()
    for u in users:
        feeds = db.query(Feed).filter(Feed.user_id == u.id).all()
        for f in feeds:
            articles = db.query(Article).filter(Article.feed_id == f.id).all()
            for a in articles:
                try:
                    ArticleService.score_article(db, a, u.id)
                    total += 1
                except Exception as e:
                    errors.append({"article_id": a.id, "error": str(e)})

    return {"rescored_articles": total, "errors": errors}
