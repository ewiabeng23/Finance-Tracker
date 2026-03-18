from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id           = Column(Integer, primary_key=True, index=True)
    full_name    = Column(String(150), nullable=False)
    phone        = Column(String(30))
    email        = Column(String(100))
    address      = Column(String(255))
    note         = Column(Text)
    company_name = Column(String(150), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=False)

    transactions = relationship("Transaction", back_populates="customer")
