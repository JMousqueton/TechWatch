from sqlalchemy.orm import Session
from app.models import User
from app.schemas.user import UserCreate

class UserService:
    """Service for user operations"""
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user"""
        db_user = User(
            username=user_data.username,
            email=user_data.email
        )
        db_user.set_password(user_data.password)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> User:
        """Get user by username (case-insensitive)"""
        return db.query(User).filter(User.username.ilike(username.lower())).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """Get user by email (case-insensitive)"""
        return db.query(User).filter(User.email.ilike(email.lower())).first()
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> User:
        """Authenticate user with password (case-insensitive username)"""
        user = UserService.get_user_by_username(db, username.lower())
        if not user or not user.verify_password(password):
            return None
        return user
