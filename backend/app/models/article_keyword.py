from sqlalchemy import Column, Integer, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ArticleKeyword(Base):
    __tablename__ = "article_keywords"
    
    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    keyword_id = Column(Integer, ForeignKey("keywords.id"), nullable=False)
    match_count = Column(Integer, default=1)  # How many times keyword appears
    points = Column(Float, default=0.0)  # Points awarded for this match
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    article = relationship("Article", back_populates="keywords")
    keyword = relationship("Keyword", back_populates="article_keywords")
