from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from typing import List, Optional
from datetime import datetime
from app.models import Article, Feed, Keyword, ArticleKeyword, UserArticleInteraction
from app.schemas.article import ArticleWithScores
from app.utils.scoring import extract_keywords_from_text
from app.utils.sanitize import sanitize_html

class ArticleService:
    """Service for article operations"""
    
    @staticmethod
    def create_article(db: Session, feed_id: int, title: str, url: str, 
                      description: str = "", content: str = "", author: str = "",
                      published_date: Optional[datetime] = None) -> Article:
        """Create or get existing article, removing 'The post ... appeared first on ...' from description/content"""
        import re
        # Check if article already exists
        existing = db.query(Article).filter(Article.url == url).first()
        if existing:
            return existing

        def remove_footer(text):
            # Remove 'The post ... appeared first on ...' and similar patterns
            return re.sub(r'The post .*? appeared first on .*?\.?', '', text, flags=re.DOTALL)

        # Remove unwanted footer from description/content
        description = remove_footer(description)
        content = remove_footer(content)

        # Sanitize HTML content/description using allowed tags
        clean_description = sanitize_html(description)
        clean_content = sanitize_html(content)

        article = Article(
            feed_id=feed_id,
            title=title,
            url=url,
            description=clean_description,
            content=clean_content,
            author=author,
            published_date=published_date
        )
        db.add(article)
        db.commit()
        db.refresh(article)

        # Autostarred logic: if feed.autostarred, create UserArticleInteraction with is_starred=True for the feed owner
        feed = db.query(Feed).filter(Feed.id == feed_id).first()
        if feed and getattr(feed, 'autostarred', False):
            # Find the feed owner
            user_id = feed.user_id
            from app.models.user_article_interaction import UserArticleInteraction
            interaction = db.query(UserArticleInteraction).filter_by(user_id=user_id, article_id=article.id).first()
            if not interaction:
                interaction = UserArticleInteraction(user_id=user_id, article_id=article.id, is_starred=True)
                db.add(interaction)
            else:
                interaction.is_starred = True
            db.commit()

        return article
    
    @staticmethod
    def score_article(db: Session, article: Article, feed_owner_id: int) -> float:
        """Score article based on keyword matches"""
        keywords = db.query(Keyword).filter(
            Keyword.user_id == feed_owner_id,
            Keyword.is_active == True
        ).all()
        
        if not keywords:
            return 0.0
        
        # Extract keyword matches from title, description, and content
        combined_text = f"{article.title} {article.description} {article.content}"
        matches = extract_keywords_from_text(combined_text, keywords)
        
        total_score = 0.0

        # Remove any existing ArticleKeyword rows for this article to avoid duplicates
        db.query(ArticleKeyword).filter(ArticleKeyword.article_id == article.id).delete()
        db.commit()

        # Create new ArticleKeyword entries based on current keywords
        for keyword_id, match_count in matches.items():
            keyword = next(k for k in keywords if k.id == keyword_id)
            # New scoring: first occurrence = keyword.weight, each additional = +0.5
            if match_count > 0:
                points = keyword.weight + (match_count - 1) * 0.5
            else:
                points = 0.0

            article_keyword = ArticleKeyword(
                article_id=article.id,
                keyword_id=keyword_id,
                match_count=match_count,
                points=points
            )
            db.add(article_keyword)
            total_score += points

        article.base_score = total_score
        db.commit()

        return total_score
    
    @staticmethod
    def get_articles_with_scores(db: Session, user_id: int, 
                                  feed_id: Optional[int] = None,
                                  is_starred: Optional[bool] = None,
                                  is_read: Optional[bool] = None,
                                  min_score: float = 0.0,
                                  limit: int = 50, 
                                  offset: int = 0,
                                  sort_by: str = "score") -> List[ArticleWithScores]:
        """Get articles with computed scores - sort by 'score' or 'date'"""
        # Get user's feeds
        feeds = db.query(Feed).filter(Feed.user_id == user_id).all()
        feed_ids = [f.id for f in feeds]
        if not feed_ids:
            return []
        query = db.query(Article).filter(Article.feed_id.in_(feed_ids))
        if feed_id:
            query = query.filter(Article.feed_id == feed_id)
        # If filtering by starred/read, fetch all interactions for this user and filter article IDs
        filter_article_ids = None
        if is_starred is not None or is_read is not None:
            interaction_filters = [UserArticleInteraction.user_id == user_id]
            if is_starred is not None:
                interaction_filters.append(UserArticleInteraction.is_starred == is_starred)
            if is_read is not None:
                interaction_filters.append(UserArticleInteraction.is_read == is_read)
            filtered_interactions = db.query(UserArticleInteraction).filter(*interaction_filters).all()
            filter_article_ids = [i.article_id for i in filtered_interactions]
            if filter_article_ids:
                query = query.filter(Article.id.in_(filter_article_ids))
            else:
                # No matches, return empty
                return []
        # Order and fetch articles
        if sort_by == "date":
            query = query.order_by(desc(Article.published_date or Article.created_at))
            articles = query.offset(offset).limit(limit).all()
        else:
            articles = query.all()
        article_ids = [a.id for a in articles]
        # Bulk fetch all interactions for these articles and this user
        interactions = db.query(UserArticleInteraction).filter(
            UserArticleInteraction.user_id == user_id,
            UserArticleInteraction.article_id.in_(article_ids)
        ).all()
        interaction_map = {i.article_id: i for i in interactions}
        scored_articles = []
        from datetime import datetime
        for article in articles:
            article.keywords  # Ensure relationship is loaded
            interaction = interaction_map.get(article.id)
            user_boost = interaction.get_total_score_boost() if interaction else 0.0
            # Age calculation
            now = datetime.utcnow()
            dt = article.published_date or article.created_at
            age_days = (now - dt).days if dt else 0
            age_penalty = 0.5 * (age_days // 2)
            total_score = article.base_score + user_boost - age_penalty
            scored_articles.append((article, user_boost, total_score, interaction, age_days, age_penalty))
        if sort_by != "date":
            scored_articles.sort(key=lambda tup: (tup[2], tup[0].created_at), reverse=True)
            scored_articles = scored_articles[offset:offset+limit]
        result = []
        for article, user_boost, total_score, interaction, age_days, age_penalty in scored_articles:
            keywords_list = []
            for ak in article.keywords:
                keywords_list.append({
                    'id': ak.id,
                    'keyword_id': ak.keyword_id,
                    'keyword': ak.keyword.keyword if hasattr(ak.keyword, 'keyword') else str(ak.keyword),
                    'match_count': ak.match_count,
                    'points': ak.points
                })
            article_dict = {
                'id': article.id,
                'feed_id': article.feed_id,
                'title': article.title,
                'url': article.url,
                'description': article.description,
                'content': article.content,
                'author': article.author,
                'published_date': article.published_date,
                'created_at': article.created_at,
                'base_score': article.base_score,
                'keywords': keywords_list,
                'keyword_score': article.base_score,
                'user_boost_score': user_boost,
                'total_score': total_score,
                'is_liked': interaction.is_liked if interaction else False,
                'is_starred': interaction.is_starred if interaction else False,
                'age_days': age_days,
                'age_penalty': age_penalty
            }
            article_with_scores = ArticleWithScores(**article_dict)
            result.append(article_with_scores)
        return result
    
    @staticmethod
    def search_articles(db: Session, user_id: int, query_text: str,
                       feed_id: Optional[int] = None,
                       min_score: float = 0.0,
                       limit: int = 50,
                       offset: int = 0) -> List[Article]:
        """Search articles by title, description, or content with complex query support (AND, OR, NOT, parentheses, quoted phrases)"""
        from sqlalchemy import and_, or_, not_
        import re

        feeds = db.query(Feed).filter(Feed.user_id == user_id).all()
        feed_ids = [f.id for f in feeds]
        if not feed_ids:
            return []

        # Tokenize query: support quoted phrases, AND, OR, NOT, parentheses
        def tokenize(query):
            # Match quoted phrases or words/ops/parentheses
            return re.findall(r'"[^"]+"|\(|\)|\bAND\b|\bOR\b|\bNOT\b|\S+', query, re.IGNORECASE)

        # Parse tokens into SQLAlchemy filter
        def parse(tokens):
            def parse_atom():
                token = tokens.pop(0)
                if token == '(':  # Parentheses
                    expr = parse_expr()
                    tokens.pop(0)  # Remove ')'
                    return expr
                elif token.upper() == 'NOT':
                    return not_(parse_atom())
                elif token.startswith('"') and token.endswith('"'):
                    val = token[1:-1]
                    return or_(
                        Article.title.ilike(f"%{val}%"),
                        Article.description.ilike(f"%{val}%"),
                        Article.content.ilike(f"%{val}%")
                    )
                else:
                    val = token
                    return or_(
                        Article.title.ilike(f"%{val}%"),
                        Article.description.ilike(f"%{val}%"),
                        Article.content.ilike(f"%{val}%")
                    )

            def parse_expr():
                expr = parse_atom()
                while tokens and tokens[0].upper() in ('AND', 'OR'):
                    op = tokens.pop(0).upper()
                    right = parse_atom()
                    if op == 'AND':
                        expr = and_(expr, right)
                    else:
                        expr = or_(expr, right)
                return expr
            return parse_expr()

        tokens = tokenize(query_text)
        if tokens:
            search_filter = parse(tokens)
        else:
            search_filter = None

        query = db.query(Article).filter(
            Article.feed_id.in_(feed_ids),
            Article.base_score >= min_score
        )
        if search_filter is not None:
            query = query.filter(search_filter)
        if feed_id:
            query = query.filter(Article.feed_id == feed_id)
        query = query.order_by(desc(Article.base_score), desc(Article.created_at))
        return query.offset(offset).limit(limit).all()
