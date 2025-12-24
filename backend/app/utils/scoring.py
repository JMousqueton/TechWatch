import re
from typing import List, Set
from sqlalchemy.orm import Session
from app.models import Keyword

def extract_keywords_from_text(text: str, keywords: List[Keyword]) -> dict:
    """
    Extract keyword matches from text.
    Returns dict with keyword_id -> match count mapping
    """
    if not text or not keywords:
        return {}
    
    # Use re.IGNORECASE for robust case-insensitive matching
    matches = {}
    for keyword in keywords:
        if not keyword.is_active:
            continue
        # Use word boundaries for whole word matching, ignore case
        pattern = r'\b' + re.escape(keyword.keyword) + r'\b'
        count = len(re.findall(pattern, text, flags=re.IGNORECASE))
        if count > 0:
            matches[keyword.id] = count
    return matches

def calculate_article_score(article_id: int, db: Session) -> float:
    """
    Calculate total keyword score for an article.
    Sum of all keyword match points.
    """
    from app.models import ArticleKeyword
    
    total_score = db.query(ArticleKeyword).filter(
        ArticleKeyword.article_id == article_id
    ).with_entities(func.sum(ArticleKeyword.points)).scalar() or 0.0
    
    return total_score

def get_user_score_boost(user_id: int, article_id: int, db: Session) -> float:
    """Get user's interaction-based score boost for article"""
    from app.models import UserArticleInteraction
    
    interaction = db.query(UserArticleInteraction).filter(
        UserArticleInteraction.user_id == user_id,
        UserArticleInteraction.article_id == article_id
    ).first()
    
    if not interaction:
        return 0.0
    
    return interaction.get_total_score_boost()

from sqlalchemy import func
