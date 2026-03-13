from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class TransactionType(str, enum.Enum):
    income  = "income"
    expense = "expense"

class Currency(str, enum.Enum):
    XAF = "XAF"
    EUR = "EUR"
    GBP = "GBP"
    USD = "USD"

class Transaction(Base):
    __tablename__ = "transactions"

    id           = Column(Integer, primary_key=True, index=True)
    reference    = Column(String(50), unique=True, index=True, nullable=False)
    date         = Column(Date, nullable=False)
    type         = Column(Enum(TransactionType), nullable=False)
    category     = Column(String(50), nullable=False)
    amount       = Column(Float, nullable=False)
    currency     = Column(Enum(Currency), default=Currency.XAF)
    description  = Column(String(255))
    note         = Column(Text)

    # For income: who paid
    customer_id  = Column(Integer, ForeignKey("customers.id"), nullable=True)
    customer     = relationship("Customer", back_populates="transactions")

    # For expenses: which worker spent
    worker_name  = Column(String(100))  # denormalised for simplicity

    # Audit trail — who entered this record
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by_user = relationship("User", back_populates="transactions")
