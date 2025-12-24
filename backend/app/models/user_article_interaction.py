from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class UserArticleInteraction(Base):
    __tablename__ = "user_article_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    article_id = Column(Integer, ForeignKey("articles.id"), nullable=False)
    is_liked = Column(Boolean, default=False)
    is_starred = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    user_score_boost = Column(Float, default=0.0)  # +5 for like, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="interactions")
    article = relationship("Article", back_populates="interactions")
    
    def get_total_score_boost(self) -> float:
        """Calculate total score boost from interactions"""
        boost = 0.0
        if self.is_liked:
            boost += 5.0
        return boost
