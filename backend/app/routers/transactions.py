from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user, require_manager
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.schemas import TransactionCreate, TransactionUpdate, TransactionOut

router = APIRouter()

@router.get("/", response_model=List[TransactionOut])
def list_transactions(
    type: Optional[str]       = Query(None),
    category: Optional[str]   = Query(None),
    date_from: Optional[date]  = Query(None),
    date_to: Optional[date]    = Query(None),
    worker_name: Optional[str] = Query(None),
    search: Optional[str]      = Query(None),
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).options(
        joinedload(Transaction.customer),
        joinedload(Transaction.created_by_user)
    )
    if type:         q = q.filter(Transaction.type == type)
    if category:     q = q.filter(Transaction.category == category)
    if date_from:    q = q.filter(Transaction.date >= date_from)
    if date_to:      q = q.filter(Transaction.date <= date_to)
    if worker_name:  q = q.filter(Transaction.worker_name.ilike(f"%{worker_name}%"))
    if search:
        q = q.filter(
            Transaction.description.ilike(f"%{search}%") |
            Transaction.reference.ilike(f"%{search}%") |
            Transaction.worker_name.ilike(f"%{search}%")
        )
    return q.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=TransactionOut)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(Transaction).filter(Transaction.reference == payload.reference).first():
        raise HTTPException(status_code=400, detail="Reference number already exists")
    tx = Transaction(**payload.model_dump(), created_by=current_user.id)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return db.query(Transaction).options(
        joinedload(Transaction.customer),
        joinedload(Transaction.created_by_user)
    ).filter(Transaction.id == tx.id).first()

@router.patch("/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),   # ← managers only
):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),   # ← managers only
):
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"message": "Transaction deleted"}
