from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import Base, engine
from app.routes import auth_router, feeds_router, keywords_router, articles_router, config_router, users_router
from app.routes.openai import router as openai_router
from app.routes.statistics import router as statistics_router
from app.routes.maintenance import router as maintenance_router
# Import models to register them with Base
from app.models import User, Feed, Keyword, Article, ArticleKeyword, UserArticleInteraction

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Tech Watch Portal",
    description="RSS reader and web scraper with keyword-based scoring",
    version="1.0.0"
)

# Add CORS middleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins + ["*"],
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(feeds_router, prefix="/api")
app.include_router(keywords_router, prefix="/api")
app.include_router(articles_router, prefix="/api")
app.include_router(config_router, prefix="/api")
app.include_router(users_router, prefix="/api")

app.include_router(maintenance_router, prefix="/api")
app.include_router(statistics_router, prefix="/api")
app.include_router(openai_router, prefix="/api")

@app.get("/")
def root():
    """Health check endpoint"""
    return {"message": "Tech Watch Portal API", "status": "running"}

@app.get("/api/health")
def health_check():
    """API health check"""
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
        reload=False
    )
