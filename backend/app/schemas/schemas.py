from pydantic import BaseModel
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
    full_name:  Optional[str] = None
    is_active:  Optional[bool] = None
    role:       Optional[UserRole] = None

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password:     str

# ── Customer ───────────────────────────────────────
class CustomerCreate(BaseModel):
    full_name:    str
    phone:        Optional[str] = None
    email:        Optional[str] = None
    address:      Optional[str] = None
    note:         Optional[str] = None
    company_name: Optional[str] = None

class CustomerUpdate(BaseModel):
    full_name:    Optional[str] = None
    phone:        Optional[str] = None
    email:        Optional[str] = None
    address:      Optional[str] = None
    note:         Optional[str] = None
    company_name: Optional[str] = None
    is_active:    Optional[bool] = None

class CustomerOut(BaseModel):
    id:           int
    full_name:    str
    phone:        Optional[str]
    email:        Optional[str]
    address:      Optional[str]
    note:         Optional[str]
    company_name: Optional[str]
    is_active:    bool
    created_at:   Optional[datetime]
    created_by:   int
    class Config:
        from_attributes = True

# ── Transaction ────────────────────────────────────
class TransactionCreate(BaseModel):
    reference:         str
    date:              date
    type:              TransactionType
    category:          str
    amount:            float
    currency:          Currency = Currency.XAF
    description:       Optional[str] = None
    note:              Optional[str] = None
    customer_id:       Optional[int] = None
    worker_name:       Optional[str] = None
    payment_method:    Optional[str] = "cash"
    attachment_url:    Optional[str] = None
    tva_amount:        Optional[float] = 0
    is_tva_applicable: Optional[bool] = True

class TransactionUpdate(BaseModel):
    date:              Optional[date] = None
    category:          Optional[str] = None
    amount:            Optional[float] = None
    currency:          Optional[Currency] = None
    description:       Optional[str] = None
    note:              Optional[str] = None
    customer_id:       Optional[int] = None
    worker_name:       Optional[str] = None
    payment_method:    Optional[str] = None
    tva_amount:        Optional[float] = None
    is_tva_applicable: Optional[bool] = None

class TransactionOut(BaseModel):
    id:                int
    reference:         str
    date:              date
    type:              TransactionType
    category:          str
    amount:            float
    currency:          Currency
    description:       Optional[str]
    note:              Optional[str]
    customer_id:       Optional[int]
    worker_name:       Optional[str]
    created_by:        int
    customer:          Optional[CustomerOut]
    created_by_user:   Optional[UserOut]
    payment_method:    Optional[str]
    attachment_url:    Optional[str]
    tva_amount:        Optional[float]
    is_tva_applicable: Optional[bool]
    class Config:
        from_attributes = True

# ── Daily Cash ─────────────────────────────────────
class DailyCashCreate(BaseModel):
    date:            date
    opening_balance: float
    note:            Optional[str] = None

class DailyCashClose(BaseModel):
    closing_balance: float
    note:            Optional[str] = None

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
    total_income:      float
    total_expenses:    float
    net_balance:       float
    staff_spending:    float
    transaction_count: int
    income_count:      int
    expense_count:     int
    tva_collected:     float
    tva_deductible:    float
    tva_due:           float

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

class ProfitLossLine(BaseModel):
    category: str
    total:    float

class ProfitLossReport(BaseModel):
    period_from:       date
    period_to:         date
    income_lines:      list[ProfitLossLine]
    total_income:      float
    expense_lines:     list[ProfitLossLine]
    total_expenses:    float
    net_profit:        float
    tva_collected:     float
    tva_deductible:    float
    tva_due:           float
