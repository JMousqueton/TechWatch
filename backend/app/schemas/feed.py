from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime

class FeedBase(BaseModel):
    name: str
    url: str
    feed_type: str = "rss"
    description: Optional[str] = None
    autostarred: Optional[bool] = False

class FeedCreate(FeedBase):
    pass

class FeedUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    autostarred: Optional[bool] = None
    last_fetched: Optional[datetime] = None

class FeedResponse(FeedBase):
    id: int
    user_id: int
    is_active: bool
    autostarred: bool
    last_fetched: Optional[datetime]
    created_at: datetime
    article_count: int
    last_sync_status: Optional[str] = None

    @field_serializer('last_fetched', 'created_at')
    def serialize_datetime(self, value):
        if value:
            return value.strftime('%Y-%m-%d %H:%M')
        return value

    class Config:
        from_attributes = True
