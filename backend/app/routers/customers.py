from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_manager
from app.models.user import User
from app.models.customer import Customer
from app.schemas.schemas import CustomerCreate, CustomerOut

router = APIRouter()

@router.get("/", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Customer)
    if search:
        q = q.filter(Customer.full_name.ilike(f"%{search}%"))
    return q.order_by(Customer.full_name).all()

@router.post("/", response_model=CustomerOut)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # any logged-in user
):
    customer = Customer(**payload.model_dump(), created_by=current_user.id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return customer
