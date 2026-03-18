from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from enum import Enum

# ── Enums ──────────────────────────────────────────
class UserRole(str, Enum):
    manager = "manager"
    worker  = "worker"

class TransactionType(str, Enum):
    income  = "income"
    expense = "expense"

class Currency(str, Enum):
    XAF = "XAF"
    EUR = "EUR"
    GBP = "GBP"
    USD = "USD"

# ── User ───────────────────────────────────────────
class UserCreate(BaseModel):
    full_name: str
    username:  str
    password:  str
    role:      UserRole = UserRole.worker

class UserUpdate(BaseModel):
    full_name:  Optional[str]
    is_active:  Optional[bool]
    role:       Optional[UserRole]

class UserOut(BaseModel):
    id:        int
    full_name: str
    username:  str
    role:      UserRole
    is_active: bool
    class Config:
        from_attributes = True

# ── Auth ───────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type:   str
    user:         UserOut

class LoginRequest(BaseModel):
    username: str
    password: str

# ── Customer ───────────────────────────────────────
class CustomerCreate(BaseModel):
    full_name: str
    phone:     Optional[str]
    email:     Optional[str]
    address:   Optional[str]
    note:      Optional[str]
    company_name: Optional[str]

class CustomerOut(BaseModel):
    id:         int
    full_name:  str
    phone:      Optional[str]
    email:      Optional[str]
    address:    Optional[str]
    note:       Optional[str]
    created_at: Optional[datetime]
    created_by: int
    company_name: Optional[str]
    is_active:    bool
    class Config:
        from_attributes = True

# ── Transaction ────────────────────────────────────
class TransactionCreate(BaseModel):
    reference:   str
    date:        date
    type:        TransactionType
    category:    str
    amount:      float
    currency:    Currency = Currency.XAF
    description: Optional[str]
    note:        Optional[str]
    customer_id: Optional[int]
    worker_name: Optional[str]
    payment_method: Optional[str] = "cash"
    attachment_url: Optional[str]

class TransactionUpdate(BaseModel):
    date:        Optional[date]
    category:    Optional[str]
    amount:      Optional[float]
    currency:    Optional[Currency]
    description: Optional[str]
    note:        Optional[str]
    customer_id: Optional[int]
    worker_name: Optional[str]

class TransactionOut(BaseModel):
    id:           int
    reference:    str
    date:         date
    type:         TransactionType
    category:     str
    amount:       float
    currency:     Currency
    description:  Optional[str]
    note:         Optional[str]
    customer_id:  Optional[int]
    worker_name:  Optional[str]
    created_by:   int
    customer:     Optional[CustomerOut]
    created_by_user: Optional[UserOut]
    payment_method: Optional[str]
    attachment_url: Optional[str]
    class Config:
        from_attributes = True

# ── Daily Cash ─────────────────────────────────────
class DailyCashCreate(BaseModel):
    date:            date
    opening_balance: float
    note:            Optional[str]

class DailyCashClose(BaseModel):
    closing_balance: float
    note:            Optional[str]

class DailyCashOut(BaseModel):
    id:              int
    date:            date
    opening_balance: float
    closing_balance: Optional[float]
    note:            Optional[str]
    set_by:          Optional[int]
    class Config:
        from_attributes = True

# ── Reports ────────────────────────────────────────
class SummaryReport(BaseModel):
    total_income:   float
    total_expenses: float
    net_balance:    float
    staff_spending: float
    transaction_count: int
    income_count:   int
    expense_count:  int

class CategoryBreakdown(BaseModel):
    category: str
    total:    float
    count:    int
    percent:  float

class WorkerBreakdown(BaseModel):
    worker_name: str
    total:       float
    count:       int
    categories:  list[CategoryBreakdown]
class CustomerUpdate(BaseModel):
    full_name:    Optional[str]
    phone:        Optional[str]
    email:        Optional[str]
    address:      Optional[str]
    note:         Optional[str]
    company_name: Optional[str]
    is_active:    Optional[bool]
