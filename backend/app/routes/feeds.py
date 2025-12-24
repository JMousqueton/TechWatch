from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.feed import FeedCreate, FeedResponse, FeedUpdate
from app.models import Feed
from app.utils.auth import verify_token
from app.services.article import ArticleService
from app.scrapers import RSSFeedReader, WebScraper

router = APIRouter(prefix="/feeds", tags=["feeds"])

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
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

@router.post("/", response_model=FeedResponse)
def create_feed(feed_data: FeedCreate, 
                user = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Create a new feed"""
    
    db_feed = Feed(
        user_id=user.id,
        name=feed_data.name,
        url=feed_data.url,
        feed_type=feed_data.feed_type,
        description=feed_data.description,
        autostarred=feed_data.autostarred if hasattr(feed_data, 'autostarred') else False
    )
    db.add(db_feed)
    db.commit()
    db.refresh(db_feed)
    # Return a dict with article_count=0 for FeedResponse
    feed_dict = db_feed.__dict__.copy()
    feed_dict['article_count'] = 0
    return feed_dict

@router.get("/", response_model=List[FeedResponse])
def list_feeds(user = Depends(get_current_user),
               db: Session = Depends(get_db)):
    """Get all feeds for current user"""
    
    feeds = db.query(Feed).filter(Feed.user_id == user.id).all()
    # For each feed, add article_count
    result = []
    import datetime
    now = datetime.datetime.utcnow()
    STALE_DAYS = 3
    BROKEN_DAYS = 7
    for feed in feeds:
        article_count = db.query(Feed).filter(Feed.id == feed.id).first().articles
        count = len(article_count) if article_count else 0
        feed_dict = feed.__dict__.copy()
        feed_dict['article_count'] = count
        # Feed health logic
        last_fetched = feed.last_fetched
        # Immediate error if last sync failed
        if hasattr(feed, 'last_sync_status') and feed.last_sync_status == 'failed':
            health = 'broken'
        elif not last_fetched:
            health = 'broken'
        else:
            days_since = (now - last_fetched).days
            if days_since >= BROKEN_DAYS:
                health = 'broken'
            elif days_since >= STALE_DAYS:
                health = 'stale'
            else:
                health = 'healthy'
        feed_dict['health'] = health
        result.append(feed_dict)
    return result

@router.get("/{feed_id}", response_model=FeedResponse)
def get_feed(feed_id: int,
             user = Depends(get_current_user),
             db: Session = Depends(get_db)):
    """Get a specific feed"""
    
    feed = db.query(Feed).filter(
        Feed.id == feed_id,
        Feed.user_id == user.id
    ).first()
    
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    return feed

@router.put("/{feed_id}", response_model=FeedResponse)
def update_feed(feed_id: int,
                feed_data: FeedUpdate,
                user = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Update a feed"""
    
    feed = db.query(Feed).filter(
        Feed.id == feed_id,
        Feed.user_id == user.id
    ).first()
    
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    if feed_data.name:
        feed.name = feed_data.name
    if feed_data.url:
        feed.url = feed_data.url
    if feed_data.description is not None:
        feed.description = feed_data.description
    if feed_data.is_active is not None:
        feed.is_active = feed_data.is_active
    if feed_data.autostarred is not None:
        feed.autostarred = feed_data.autostarred
    if feed_data.last_fetched is not None:
        feed.last_fetched = feed_data.last_fetched
    
    db.commit()
    db.refresh(feed)
    # Compose response dict with required fields
    feed_dict = feed.__dict__.copy()
    # Compute article_count
    article_count = db.query(Feed).filter(Feed.id == feed.id).first().articles
    count = len(article_count) if article_count else 0
    feed_dict['article_count'] = count
    # Ensure last_sync_status is present
    if 'last_sync_status' not in feed_dict:
        feed_dict['last_sync_status'] = None
    return feed_dict

@router.delete("/{feed_id}")
def delete_feed(feed_id: int,
                user = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Delete a feed"""
    
    feed = db.query(Feed).filter(
        Feed.id == feed_id,
        Feed.user_id == user.id
    ).first()
    
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    db.delete(feed)
    db.commit()
    
    return {"detail": "Feed deleted"}

@router.post("/{feed_id}/sync/")
def sync_feed(feed_id: int,
              user = Depends(get_current_user),
              db: Session = Depends(get_db)):
    """Sync feed (fetch new articles)"""
    
    feed = db.query(Feed).filter(
        Feed.id == feed_id,
        Feed.user_id == user.id
    ).first()
    
    if not feed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feed not found")
    
    count = 0
    
    try:
        if feed.feed_type == "rss":
            result = RSSFeedReader.fetch_feed(feed.url)
            if not result or not result.get("articles"):
                feed.last_sync_status = "failed"
                db.commit()
                raise HTTPException(status_code=400, detail="Feed is unreachable, invalid, or contains no articles.")
            last_fetched = feed.last_fetched
            if last_fetched is not None and last_fetched.tzinfo is not None:
                # Convert last_fetched to naive UTC
                last_fetched = last_fetched.replace(tzinfo=None)
            for article_data in result["articles"]:
                pub_date = article_data.get("published_date")
                if pub_date is not None and hasattr(pub_date, 'tzinfo') and pub_date.tzinfo is not None:
                    # Convert pub_date to naive UTC
                    pub_date = pub_date.replace(tzinfo=None)
                # Only add if published_date is newer than last_fetched (or if last_fetched is None)
                if last_fetched is not None and pub_date is not None:
                    if pub_date <= last_fetched:
                        continue
                article = ArticleService.create_article(
                    db,
                    feed.id,
                    article_data["title"],
                    article_data["url"],
                    article_data["description"],
                    article_data["content"],
                    article_data["author"],
                    pub_date
                )
                ArticleService.score_article(db, article, user.id)
                count += 1
        elif feed.feed_type == "scraper":
            result = WebScraper.scrape_page(feed.url)
            if result:
                article = ArticleService.create_article(
                    db,
                    feed.id,
                    result["title"],
                    result["url"],
                    result["description"],
                    result["content"]
                )
                ArticleService.score_article(db, article, user.id)
                count = 1
        feed.last_fetched = __import__('datetime').datetime.utcnow()
        feed.last_sync_status = "success"
        db.commit()
        return {"detail": f"Synced {count} articles"}
    except Exception as e:
        feed.last_sync_status = "failed"
        db.commit()
        raise
