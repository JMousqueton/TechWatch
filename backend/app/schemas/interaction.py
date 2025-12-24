from pydantic import BaseModel, field_serializer
from datetime import datetime

class UserArticleInteractionBase(BaseModel):
    is_liked: bool = False
    is_starred: bool = False
    is_read: bool = False

class UserArticleInteractionCreate(UserArticleInteractionBase):
    pass

class UserArticleInteractionUpdate(BaseModel):
    is_liked: bool = None
    is_starred: bool = None
    is_read: bool = None

class UserArticleInteractionResponse(UserArticleInteractionBase):
    id: int
    user_id: int
    article_id: int
    user_score_boost: float
    created_at: datetime
    updated_at: datetime

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, value):
        if value:
            return value.strftime('%Y-%m-%d %H:%M')
        return value

    class Config:
        from_attributes = True
