from pydantic import BaseModel

class SearchRequest(BaseModel):
    query: str
    feed_id: int = None
    min_score: float = 0.0
    is_starred: bool = None
    is_read: bool = None
    limit: int = 50
    offset: int = 0
