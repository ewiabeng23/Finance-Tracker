from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user, require_manager
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from app.models.daily_cash import DailyCash
from app.schemas.schemas import (
    SummaryReport, CategoryBreakdown, WorkerBreakdown,
    DailyCashCreate, DailyCashClose, DailyCashOut
)

router = APIRouter()

# ── Summary ────────────────────────────────────────
@router.get("/summary", response_model=SummaryReport)
def get_summary(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Transaction)
    if date_from: q = q.filter(Transaction.date >= date_from)
    if date_to:   q = q.filter(Transaction.date <= date_to)

    all_tx = q.all()
    income   = [t for t in all_tx if t.type == TransactionType.income]
    expenses = [t for t in all_tx if t.type == TransactionType.expense]
    staff    = [t for t in expenses if t.worker_name]

    total_in  = sum(t.amount for t in income)
    total_out = sum(t.amount for t in expenses)

    return SummaryReport(
        total_income=total_in,
        total_expenses=total_out,
        net_balance=total_in - total_out,
        staff_spending=sum(t.amount for t in staff),
        transaction_count=len(all_tx),
        income_count=len(income),
        expense_count=len(expenses),
    )

# ── Expense breakdown by category ─────────────────
@router.get("/expenses/by-category", response_model=List[CategoryBreakdown])
def expenses_by_category(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.type == TransactionType.expense)
    if date_from: q = q.filter(Transaction.date >= date_from)
    if date_to:   q = q.filter(Transaction.date <= date_to)
    txs = q.all()
    total = sum(t.amount for t in txs) or 1

    cats: dict = {}
    for t in txs:
        if t.category not in cats:
            cats[t.category] = {"total": 0, "count": 0}
        cats[t.category]["total"] += t.amount
        cats[t.category]["count"] += 1

    return [
        CategoryBreakdown(
            category=k,
            total=v["total"],
            count=v["count"],
            percent=round(v["total"] / total * 100, 1)
        )
        for k, v in sorted(cats.items(), key=lambda x: -x[1]["total"])
    ]

# ── Expense breakdown by worker ────────────────────
@router.get("/expenses/by-worker", response_model=List[WorkerBreakdown])
def expenses_by_worker(
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(
        Transaction.type == TransactionType.expense,
        Transaction.worker_name.isnot(None)
    )
    if date_from: q = q.filter(Transaction.date >= date_from)
    if date_to:   q = q.filter(Transaction.date <= date_to)
    txs = q.all()

    workers: dict = {}
    for t in txs:
        w = t.worker_name
        if w not in workers:
            workers[w] = {"total": 0, "count": 0, "cats": {}}
        workers[w]["total"]  += t.amount
        workers[w]["count"]  += 1
        if t.category not in workers[w]["cats"]:
            workers[w]["cats"][t.category] = {"total": 0, "count": 0}
        workers[w]["cats"][t.category]["total"] += t.amount
        workers[w]["cats"][t.category]["count"] += 1

    result = []
    for name, data in sorted(workers.items(), key=lambda x: -x[1]["total"]):
        wt = data["total"] or 1
        cats = [
            CategoryBreakdown(category=k, total=v["total"], count=v["count"], percent=round(v["total"]/wt*100,1))
            for k, v in sorted(data["cats"].items(), key=lambda x: -x[1]["total"])
        ]
        result.append(WorkerBreakdown(worker_name=name, total=data["total"], count=data["count"], categories=cats))
    return result

# ── Daily cash register ────────────────────────────
@router.get("/daily-cash", response_model=List[DailyCashOut])
def list_daily_cash(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(DailyCash).order_by(DailyCash.date.desc()).limit(30).all()

@router.post("/daily-cash", response_model=DailyCashOut)
def open_day(
    payload: DailyCashCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    existing = db.query(DailyCash).filter(DailyCash.date == payload.date).first()
    if existing:
        existing.opening_balance = payload.opening_balance
        existing.note = payload.note
        db.commit()
        db.refresh(existing)
        return existing
    record = DailyCash(**payload.model_dump(), set_by=current_user.id)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.patch("/daily-cash/{record_date}/close", response_model=DailyCashOut)
def close_day(
    record_date: date,
    payload: DailyCashClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    record = db.query(DailyCash).filter(DailyCash.date == record_date).first()
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No opening balance for this date")
    record.closing_balance = payload.closing_balance
    if payload.note:
        record.note = payload.note
    record.set_by = current_user.id
    db.commit()
    db.refresh(record)
    return record
