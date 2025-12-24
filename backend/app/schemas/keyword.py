from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime

class KeywordBase(BaseModel):
    keyword: str
    weight: float = 1.0

class KeywordCreate(KeywordBase):
    pass

class KeywordUpdate(BaseModel):
    keyword: Optional[str] = None
    weight: Optional[float] = None
    is_active: Optional[bool] = None

class KeywordResponse(KeywordBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    @field_serializer('created_at')
    def serialize_datetime(self, value):
        if value:
            return value.strftime('%Y-%m-%d %H:%M')
        return value

    class Config:
        from_attributes = True
