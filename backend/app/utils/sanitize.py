"""HTML sanitization helper using bleach.

This wraps bleach.clean with our allowed tags/attributes and returns safe HTML.
If bleach is not installed, falls back to a very conservative stripper that
removes all tags.
"""
from typing import Optional

from .allowed_html import ALLOWED_TAGS, ALLOWED_ATTRIBUTES, ALLOWED_PROTOCOLS

try:
    import bleach

    def sanitize_html(raw_html: Optional[str]) -> str:
        if not raw_html:
            return ""
        return bleach.clean(
            raw_html,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            protocols=ALLOWED_PROTOCOLS,
            strip=True,
        )

except Exception:
    # Fallback: remove tags by naive approach
    import re

    TAG_RE = re.compile(r"</?[^>]+>")

    def sanitize_html(raw_html: Optional[str]) -> str:
        if not raw_html:
            return ""
        return TAG_RE.sub("", raw_html)
