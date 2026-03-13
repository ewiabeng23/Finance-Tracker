from sqlalchemy import Column, Integer, String, Boolean, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    manager = "manager"
    worker  = "worker"

class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    full_name  = Column(String(100), nullable=False)
    username   = Column(String(50), unique=True, index=True, nullable=False)
    password   = Column(String(200), nullable=False)
    role       = Column(Enum(UserRole), default=UserRole.worker, nullable=False)
    is_active  = Column(Boolean, default=True)

    transactions = relationship("Transaction", back_populates="created_by_user")
