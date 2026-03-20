from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas.schemas import Token, LoginRequest, UserOut, ChangePasswordRequest

router = APIRouter()

@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    token = create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )
    current_user.password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.post("/setup")
def setup(db: Session = Depends(get_db)):
    from app.core.security import hash_password
    from app.models.user import User
    from app.models.transaction import Transaction
    from app.models.customer import Customer
    from app.models.daily_cash import DailyCash
    from datetime import date, timedelta
    from app.core.database import Base, engine
    Base.metadata.create_all(bind=engine)
    if db.query(User).first():
        return {"message": "Already seeded"}
    manager = User(full_name="Diko Manager", username="manager", password=hash_password("Dikos2024!"), role="manager")
    db.add(manager)
    db.flush()
    for name, username in [("Kamga Rodrigue","kamga"),("Ngo Biyong Sylvie","sylvie"),("Mbida Eric","mbida")]:
        db.add(User(full_name=name, username=username, password=hash_password("Worker123!"), role="worker"))
    db.commit()
    return {"message": "Database seeded successfully", "manager": "manager / Dikos2024!", "workers": "kamga, sylvie, mbida / Worker123!"}
