from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime

class ArticleKeywordResponse(BaseModel):
    id: int
    keyword_id: int
    keyword: str
    match_count: int
    points: float
    
    @field_serializer('keyword')
    def serialize_keyword(self, value):
        # If value is a Keyword object, extract the keyword attribute
        if hasattr(value, 'keyword'):
            return value.keyword
        return value
    
    class Config:
        from_attributes = True

class ArticleBase(BaseModel):
    title: str
    url: str
    description: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None

class ArticleResponse(ArticleBase):
    id: int
    feed_id: int
    base_score: float
    published_date: Optional[datetime]
    created_at: datetime
    keywords: List[ArticleKeywordResponse] = []

    @field_serializer('published_date', 'created_at')
    def serialize_datetime(self, value):
        if value:
            return value.strftime('%Y-%m-%d %H:%M')
        return value

    class Config:
        from_attributes = True

class ArticleWithScores(ArticleResponse):
    keyword_score: float
    user_boost_score: float
    total_score: float
    age_days: int = 0
    age_penalty: float = 0.0

    is_liked: bool = False
    is_starred: bool = False
