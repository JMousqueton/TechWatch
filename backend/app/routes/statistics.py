from fastapi import APIRouter, Depends, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models import Article, UserArticleInteraction, ArticleKeyword, Keyword, Feed
from app.utils.auth import verify_token
from app.services import UserService

router = APIRouter(prefix="/statistics", tags=["statistics"])

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        return None
    username = payload.get("sub")
    user = UserService.get_user_by_username(db, username)
    return user

@router.get("/most_read_articles")
def most_read_articles(limit: int = 5, user = Depends(get_current_user), db: Session = Depends(get_db)):
    if user:
        feeds = db.query(Feed).filter(Feed.user_id == user.id).all()
        feed_ids = [f.id for f in feeds]
    else:
        feed_ids = db.query(Feed.id).all()
        feed_ids = [f[0] for f in feed_ids]
    results = (
        db.query(Article, func.count(UserArticleInteraction.id).label("read_count"))
        .join(UserArticleInteraction, Article.id == UserArticleInteraction.article_id)
        .filter(Article.feed_id.in_(feed_ids), UserArticleInteraction.is_read == True)
        .group_by(Article.id)
        .order_by(func.count(UserArticleInteraction.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "read_count": read_count
        } for a, read_count in results
    ]

@router.get("/keyword_trends")
def keyword_trends(limit: int = 5, user = Depends(get_current_user), db: Session = Depends(get_db)):
    if user:
        feeds = db.query(Feed).filter(Feed.user_id == user.id).all()
        feed_ids = [f.id for f in feeds]
    else:
        feed_ids = db.query(Feed.id).all()
        feed_ids = [f[0] for f in feed_ids]
    results = (
        db.query(Keyword.keyword, func.sum(ArticleKeyword.match_count).label("total_matches"))
        .join(ArticleKeyword, Keyword.id == ArticleKeyword.keyword_id)
        .join(Article, ArticleKeyword.article_id == Article.id)
        .filter(Article.feed_id.in_(feed_ids))
        .group_by(Keyword.id)
        .order_by(func.sum(ArticleKeyword.match_count).desc())
        .limit(limit)
        .all()
    )
    return [
        {"keyword": k, "total_matches": total} for k, total in results
    ]
