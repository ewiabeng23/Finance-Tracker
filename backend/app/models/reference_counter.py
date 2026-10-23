from sqlalchemy import Column, Integer, String, UniqueConstraint
from app.core.database import Base

class ReferenceCounter(Base):
    __tablename__ = "reference_counters"
    __table_args__ = (UniqueConstraint("prefix", "year", name="uq_reference_prefix_year"),)

    id          = Column(Integer, primary_key=True, index=True)
    prefix      = Column(String(10), nullable=False)
    year        = Column(Integer, nullable=False)
    last_number = Column(Integer, nullable=False, default=0)
