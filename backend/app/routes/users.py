from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.models import User
from app.utils.auth import verify_token
from app.services import UserService
from app.config import settings

router = APIRouter(prefix="/users", tags=["users"])

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    username = payload.get("sub")
    user = UserService.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_admin(user: User):
    allowed_admins = settings.admin_users or []
    if not user.is_admin and user.username not in allowed_admins:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

@router.get("/", response_model=List[UserResponse])
def list_users(user = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(user)
    users = db.query(User).all()
    return users

@router.post("/", response_model=UserResponse)
def create_user(user_data: UserCreate, user = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(user)
    existing_user = UserService.get_user_by_username(db, user_data.username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    existing_email = UserService.get_user_by_email(db, user_data.email)
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    new_user = UserService.create_user(db, user_data)
    return new_user

from fastapi import Body

@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, user_data: dict = Body(...), user = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(user)
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db_user.username = user_data.get("username", db_user.username)
    db_user.email = user_data.get("email", db_user.email)
    if "password" in user_data and user_data["password"]:
        db_user.set_password(user_data["password"])
    if "is_admin" in user_data:
        db_user.is_admin = bool(user_data["is_admin"])
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: int, user = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(user)
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"detail": "User deleted"}
