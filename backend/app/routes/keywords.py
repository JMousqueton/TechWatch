from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.keyword import KeywordCreate, KeywordResponse, KeywordUpdate
from app.models import Keyword
from app.utils.auth import verify_token
from app.services import UserService

router = APIRouter(prefix="/keywords", tags=["keywords"])

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

@router.post("/", response_model=KeywordResponse)
def create_keyword(keyword_data: KeywordCreate,
                   user = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Create a new keyword"""
    
    db_keyword = Keyword(
        user_id=user.id,
        keyword=keyword_data.keyword,
        weight=keyword_data.weight
    )
    db.add(db_keyword)
    db.commit()
    db.refresh(db_keyword)
    
    return db_keyword

@router.get("/", response_model=List[KeywordResponse])
def list_keywords(user = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    """Get all keywords for current user"""
    
    keywords = db.query(Keyword).filter(Keyword.user_id == user.id).all()
    return keywords

@router.put("/{keyword_id}", response_model=KeywordResponse)
def update_keyword(keyword_id: int,
                   keyword_data: KeywordUpdate,
                   user = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Update a keyword"""
    
    keyword = db.query(Keyword).filter(
        Keyword.id == keyword_id,
        Keyword.user_id == user.id
    ).first()
    
    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
    
    if keyword_data.keyword:
        keyword.keyword = keyword_data.keyword
    if keyword_data.weight is not None:
        keyword.weight = keyword_data.weight
    if keyword_data.is_active is not None:
        keyword.is_active = keyword_data.is_active
    
    db.commit()
    db.refresh(keyword)
    
    return keyword

@router.delete("/{keyword_id}")
def delete_keyword(keyword_id: int,
                   user = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Delete a keyword"""
    
    keyword = db.query(Keyword).filter(
        Keyword.id == keyword_id,
        Keyword.user_id == user.id
    ).first()
    
    if not keyword:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyword not found")
    
    db.delete(keyword)
    db.commit()
    
    return {"detail": "Keyword deleted"}
