from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_current_user, require_manager
from app.models.user import User
from app.models.transaction import Transaction
from app.models.reference_counter import ReferenceCounter
from app.schemas.schemas import TransactionCreate, TransactionUpdate, TransactionOut

router = APIRouter()


def next_reference(db: Session, tx_type, tx_date: date) -> str:
    """Return the next sequential reference, e.g. INV-2026-001 or EXP-2026-001.
    The counter row is locked so two simultaneous saves cannot get the same number.
    If a number is somehow already used, keep counting until a free one is found."""
    prefix = "INV" if str(getattr(tx_type, "value", tx_type)) == "income" else "EXP"
    year = tx_date.year
    counter = (
        db.query(ReferenceCounter)
        .filter(ReferenceCounter.prefix == prefix, ReferenceCounter.year == year)
        .with_for_update()
        .first()
    )
    if not counter:
        counter = ReferenceCounter(prefix=prefix, year=year, last_number=0)
        db.add(counter)
        db.flush()
    while True:
        counter.last_number += 1
        reference = f"{prefix}-{year}-{counter.last_number:03d}"
        exists = db.query(Transaction.id).filter(Transaction.reference == reference).first()
        if not exists:
            return reference


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
    # The server always assigns the reference; any value sent by the client is ignored.
    data = payload.model_dump(exclude={"reference"})
    reference = next_reference(db, payload.type, payload.date)
    tx = Transaction(**data, reference=reference, created_by=current_user.id)
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
    _: User = Depends(require_manager),
):
    # Deleting would leave gaps in the sequential numbering, so it is disabled.
    # Corrections are made by editing the transaction instead.
    raise HTTPException(
        status_code=405,
        detail="Transactions cannot be deleted. Edit the transaction to correct it.",
    )
