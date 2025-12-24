import feedparser
import requests
from typing import List, Dict, Optional
from datetime import datetime
from bs4 import BeautifulSoup
import ssl

# Workaround for SSL certificate issues
ssl._create_default_https_context = ssl._create_unverified_context

class RSSFeedReader:
    """RSS Feed reader"""
    
    @staticmethod
    def fetch_feed(url: str) -> Optional[Dict]:
        """Fetch and parse RSS feed"""
        try:
            feed = feedparser.parse(url)
            
            if feed.bozo:
                # Feed has parsing issues but might still be usable
                pass
            
            articles = []
            for entry in feed.entries:
                article = {
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "description": entry.get("description", entry.get("summary", "")),
                    "author": entry.get("author", ""),
                    "published_date": RSSFeedReader._parse_date(entry.get("published", "")),
                    "content": entry.get("content", [{}])[0].get("value", "") if entry.get("content") else ""
                }
                articles.append(article)
            
            return {
                "title": feed.feed.get("title", ""),
                "articles": articles
            }
        except Exception as e:
            print(f"Error fetching RSS feed {url}: {e}")
            return None
    
    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        """Parse RFC date string to datetime"""
        if not date_str:
            return None
        try:
            from email.utils import parsedate_to_datetime
            return parsedate_to_datetime(date_str)
        except:
            return None


class WebScraper:
    """Web page scraper"""
    
    @staticmethod
    def scrape_page(url: str) -> Optional[Dict]:
        """Scrape a web page and extract content"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title = ""
            if soup.title:
                title = soup.title.string
            
            # Extract meta description
            description = ""
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc:
                description = meta_desc.get("content", "")
            
            # Extract main content (simple extraction)
            content = ""
            article = soup.find("article")
            if article:
                content = article.get_text()
            else:
                # Fallback: get main content area
                main = soup.find("main")
                if main:
                    content = main.get_text()
                else:
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    content = soup.get_text()
            
            return {
                "title": title,
                "url": url,
                "description": description,
                "content": content[:5000],  # Limit content size
            }
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None
