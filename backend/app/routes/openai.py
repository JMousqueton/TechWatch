import openai
import traceback

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AppConfig
from pydantic import BaseModel

router = APIRouter(prefix="/openai", tags=["openai"])

class TranslationRequest(BaseModel):
    title: str
    description: str

class TranslationResponse(BaseModel):
    translation: str


@router.post("/translate", response_model=TranslationResponse)
def translate_article(req: TranslationRequest, db: Session = Depends(get_db)):
    config = db.query(AppConfig).filter(AppConfig.key == "openai_api_key").first()
    if not config or not config.value:
        raise HTTPException(status_code=400, detail="OpenAI API key not set")
    openai.api_key = config.value
    prompt = (
        "You are a journalist and translator. Translate the following article title and description into English. "
        f"Title: {req.title}\nDescription: {req.description}"
    )
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
            temperature=0.3,
        )
        translation = response.choices[0].message.content.strip()
        return {"translation": translation}
    except Exception as e:
        tb = traceback.format_exc()
        print("[OpenAI Translate Error]", tb)
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}\n{tb}")
