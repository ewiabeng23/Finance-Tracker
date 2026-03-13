from sqlalchemy import Column, Integer, Float, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class DailyCash(Base):
    __tablename__ = "daily_cash"

    id              = Column(Integer, primary_key=True, index=True)
    date            = Column(Date, unique=True, nullable=False, index=True)
    opening_balance = Column(Float, default=0.0)
    closing_balance = Column(Float, nullable=True)   # set by manager at end of day
    note            = Column(Text)
    set_by          = Column(Integer, ForeignKey("users.id"))
