from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Article(Base):
    __tablename__ = "articles"
    
    id = Column(Integer, primary_key=True, index=True)
    feed_id = Column(Integer, ForeignKey("feeds.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    content = Column(Text)
    url = Column(String(500), nullable=False, unique=True, index=True)
    author = Column(String(100))
    published_date = Column(DateTime)
    base_score = Column(Float, default=0.0)  # Score from keyword matches
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    feed = relationship("Feed", back_populates="articles")
    keywords = relationship("ArticleKeyword", back_populates="article", cascade="all, delete-orphan")
    interactions = relationship("UserArticleInteraction", back_populates="article", cascade="all, delete-orphan")
