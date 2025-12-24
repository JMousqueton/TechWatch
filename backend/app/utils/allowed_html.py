"""Allowed HTML tags and attributes for article content.

Keep this list in a separate module so it can be edited without touching
sanitization logic.
"""

ALLOWED_TAGS = [
    "p",
    "a",
    "strong",
    "br",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "target", "rel"]
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]
