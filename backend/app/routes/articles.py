from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.article import ArticleResponse, ArticleWithScores
from app.schemas.search import SearchRequest
from app.models import Article, UserArticleInteraction, Feed
from app.utils.auth import verify_token
from app.services import UserService
from app.services.article import ArticleService
router = APIRouter(prefix="/articles", tags=["articles"])
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.article import ArticleResponse, ArticleWithScores
from app.schemas.search import SearchRequest
from app.models import Article, UserArticleInteraction, Feed
from app.utils.auth import verify_token
from app.services import UserService
from app.services.article import ArticleService
router = APIRouter(prefix="/articles", tags=["articles"])

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Get current user from JWT token"""
    
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
@router.get("/count")
def get_article_count(user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return total article count for current user"""
    feeds = db.query(Feed).filter(Feed.user_id == user.id).all()
    feed_ids = [f.id for f in feeds]
    count = db.query(Article).filter(Article.feed_id.in_(feed_ids)).count()
    return {"count": count}

@router.get("/", response_model=List[ArticleWithScores])
def list_articles(
    feed_id: int = Query(None),
    is_starred: bool = Query(None),
    is_read: bool = Query(None),
    min_score: float = Query(0.0),
    sort_by: str = Query("score", regex="^(score|date)$"),
    limit: int = Query(50),
    offset: int = Query(0),
    user = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """Get articles with scores - sort by 'score' (default) or 'date'"""
    
    articles = ArticleService.get_articles_with_scores(
        db, user.id, feed_id, is_starred, is_read, min_score, limit, offset, sort_by
    )
    
    return articles

@router.get("/search")
def search_articles(
    query: str = Query(...),
    feed_id: int = Query(None),
    min_score: float = Query(0.0),
    limit: int = Query(50),
    offset: int = Query(0),
    user = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """Search articles"""
    
    # Use the same logic as get_articles_with_scores to include scores and keywords
    articles = ArticleService.search_articles(
        db, user.id, query, feed_id, min_score, limit, offset
    )
    # For each article, build the same response as get_articles_with_scores
    result = []
    for article in articles:
        # Force SQLAlchemy to load the keywords relationship
        article.keywords
        from app.models import UserArticleInteraction
        interaction = db.query(UserArticleInteraction).filter(
            UserArticleInteraction.article_id == article.id,
            UserArticleInteraction.user_id == user.id
        ).first()
        user_boost = interaction.get_total_score_boost() if interaction else 0.0
        total_score = article.base_score + user_boost
        keywords_list = []
        for ak in article.keywords:
            keywords_list.append({
                'id': ak.id,
                'keyword_id': ak.keyword_id,
                'keyword': ak.keyword.keyword if hasattr(ak.keyword, 'keyword') else str(ak.keyword),
                'match_count': ak.match_count,
                'points': ak.points
            })
        article_dict = {
            'id': article.id,
            'feed_id': article.feed_id,
            'title': article.title,
            'url': article.url,
            'description': article.description,
            'content': article.content,
            'author': article.author,
            'published_date': article.published_date,
            'created_at': article.created_at,
            'base_score': article.base_score,
            'keywords': keywords_list,
            'keyword_score': article.base_score,
            'user_boost_score': user_boost,
            'total_score': total_score,
            'is_liked': interaction.is_liked if interaction else False,
            'is_starred': interaction.is_starred if interaction else False
        }
        from app.schemas.article import ArticleWithScores
        article_with_scores = ArticleWithScores(**article_dict)
        result.append(article_with_scores)
    return result
@router.delete("/{article_id}")
def delete_article(article_id: int,
                  user = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Delete an article by ID (only if user owns the feed)."""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    # Only allow deleting if user owns the feed
    if hasattr(article, 'feed_id'):
        feed = db.query(Feed).filter(Feed.id == article.feed_id).first()
        if not feed or feed.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this article")

    db.delete(article)
    db.commit()
    return {"detail": "Article deleted"}

@router.get("/", response_model=List[ArticleWithScores])
def list_articles(
    feed_id: int = Query(None),
    is_starred: bool = Query(None),
    is_read: bool = Query(None),
    min_score: float = Query(0.0),
    sort_by: str = Query("score", regex="^(score|date)$"),
    limit: int = Query(50),
    offset: int = Query(0),
    user = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """Get articles with scores - sort by 'score' (default) or 'date'"""
    
    articles = ArticleService.get_articles_with_scores(
        db, user.id, feed_id, is_starred, is_read, min_score, limit, offset, sort_by
    )
    
    return articles

@router.get("/search")
def search_articles(
    query: str = Query(...),
    feed_id: int = Query(None),
    min_score: float = Query(0.0),
    limit: int = Query(50),
    offset: int = Query(0),
    user = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """Search articles"""
    
    articles = ArticleService.search_articles(
        db, user.id, query, feed_id, min_score, limit, offset
    )
    
    return articles

@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(article_id: int,
                user = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Get a specific article"""
    
    article = db.query(Article).filter(Article.id == article_id).first()
    
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    # Mark as read
    interaction = db.query(UserArticleInteraction).filter(
        UserArticleInteraction.user_id == user.id,
        UserArticleInteraction.article_id == article_id
    ).first()
    
    if not interaction:
        interaction = UserArticleInteraction(
            user_id=user.id,
            article_id=article_id,
            is_read=True
        )
        db.add(interaction)
    else:
        interaction.is_read = True
    
    db.commit()
    
    return article

@router.post("/{article_id}/like/")
def like_article(article_id: int,
                 user = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Like an article (+5 points)"""
    
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    interaction = db.query(UserArticleInteraction).filter(
        UserArticleInteraction.user_id == user.id,
        UserArticleInteraction.article_id == article_id
    ).first()
    
    if not interaction:
        interaction = UserArticleInteraction(
            user_id=user.id,
            article_id=article_id,
            is_liked=True,
            user_score_boost=5.0
        )
        db.add(interaction)
    else:
        interaction.is_liked = True
        interaction.user_score_boost = interaction.get_total_score_boost()
    
    db.commit()
    
    return {"detail": "Article liked", "boost": 5.0}

@router.post("/{article_id}/unlike/")
def unlike_article(article_id: int,
                   user = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Unlike an article"""
    
    interaction = db.query(UserArticleInteraction).filter(
        UserArticleInteraction.user_id == user.id,
        UserArticleInteraction.article_id == article_id
    ).first()
    
    if interaction:
        interaction.is_liked = False
        interaction.user_score_boost = interaction.get_total_score_boost()
        db.commit()
    
    return {"detail": "Article unliked"}

@router.post("/{article_id}/star/")
def star_article(article_id: int,
                 user = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Star an article for bookmarking"""
    
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    
    interaction = db.query(UserArticleInteraction).filter(
        UserArticleInteraction.user_id == user.id,
        UserArticleInteraction.article_id == article_id
    ).first()
    
    if not interaction:
        interaction = UserArticleInteraction(
            user_id=user.id,
            article_id=article_id,
            is_starred=True
        )
        db.add(interaction)
    else:
        interaction.is_starred = True
    
    db.commit()
    
    return {"detail": "Article starred"}

@router.post("/{article_id}/unstar/")
def unstar_article(article_id: int,
                   user = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Unstar an article"""
    
    interaction = db.query(UserArticleInteraction).filter(
        UserArticleInteraction.user_id == user.id,
        UserArticleInteraction.article_id == article_id
    ).first()
    
    if interaction:
        interaction.is_starred = False
        db.commit()
    
    return {"detail": "Article unstarred"}
