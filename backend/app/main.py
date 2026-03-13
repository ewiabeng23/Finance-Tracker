from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.routers import auth, users, transactions, customers, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Diko's Assurances Finance API",
    description="Finance tracking for Diko's Assurances SARL",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(users.router,        prefix="/api/users",        tags=["Users"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(customers.router,    prefix="/api/customers",    tags=["Customers"])
app.include_router(reports.router,      prefix="/api/reports",      tags=["Reports"])

@app.get("/")
def root():
    return {"status": "ok", "app": "Diko's Finance Tracker"}
