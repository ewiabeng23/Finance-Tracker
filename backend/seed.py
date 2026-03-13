"""
Run once to set up the database with a manager account and sample data.
Usage: python seed.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, timedelta
from app.core.database import SessionLocal, engine, Base
from app.models import User, Transaction, Customer, DailyCash
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def seed():
    # ── Manager account ───────────────────────────
    if not db.query(User).filter(User.username == "manager").first():
        manager = User(
            full_name="Diko Manager",
            username="manager",
            password=hash_password("Dikos2024!"),
            role="manager",
        )
        db.add(manager)
        db.flush()
        print("✓ Manager account created  →  username: manager  password: Dikos2024!")
    else:
        manager = db.query(User).filter(User.username == "manager").first()
        print("✓ Manager account already exists")

    # ── Worker accounts ───────────────────────────
    workers_data = [
        ("Kamga Rodrigue",    "kamga"),
        ("Ngo Biyong Sylvie", "sylvie"),
        ("Mbida Eric",        "mbida"),
    ]
    workers = []
    for full_name, username in workers_data:
        if not db.query(User).filter(User.username == username).first():
            w = User(full_name=full_name, username=username, password=hash_password("Worker123!"), role="worker")
            db.add(w)
            db.flush()
            workers.append(w)
            print(f"✓ Worker created  →  {username} / Worker123!")
        else:
            workers.append(db.query(User).filter(User.username == username).first())
            print(f"✓ Worker {username} already exists")

    # ── Sample customers ──────────────────────────
    customers_data = [
        ("Mbarga Jean-Paul",  "+237 699 001 234", None),
        ("Société CAMAIR-Co", "+237 222 001 000", "info@camairco.cm"),
        ("Hôpital Central",   "+237 222 230 101", None),
        ("Etoga Pierre",      "+237 677 443 221", None),
        ("Fono Marie-Claire", "+237 655 778 990", None),
    ]
    customers = []
    for name, phone, email in customers_data:
        if not db.query(Customer).filter(Customer.full_name == name).first():
            c = Customer(full_name=name, phone=phone, email=email, created_by=manager.id)
            db.add(c)
            db.flush()
            customers.append(c)
        else:
            customers.append(db.query(Customer).filter(Customer.full_name == name).first())

    print(f"✓ {len(customers)} customers ready")

    # ── Sample transactions ───────────────────────
    if db.query(Transaction).count() == 0:
        today = date.today()
        def d(n): return today - timedelta(days=n)

        txs = [
            # Income
            Transaction(reference="TX-001", date=d(2),  type="income",  category="prime",      amount=185000,  currency="XAF", description="Auto — renouvellement annuel",      customer_id=customers[0].id, created_by=workers[0].id),
            Transaction(reference="TX-002", date=d(5),  type="income",  category="prime",      amount=4200000, currency="XAF", description="Assurance flotte véhicules",        customer_id=customers[1].id, created_by=workers[1].id),
            Transaction(reference="TX-003", date=d(12), type="income",  category="commission", amount=630000,  currency="XAF", description="Commission Q3 2024",                customer_id=customers[2].id, created_by=manager.id),
            Transaction(reference="TX-004", date=d(25), type="income",  category="prime",      amount=8500,    currency="EUR", description="Couverture santé employés",          customer_id=customers[2].id, created_by=workers[1].id),
            Transaction(reference="TX-005", date=d(18), type="income",  category="prime",      amount=95000,   currency="XAF", description="Assurance habitation",              customer_id=customers[3].id, created_by=workers[2].id),
            # Expenses
            Transaction(reference="EXP-001", date=d(3),  type="expense", category="transport",  amount=15000,   currency="XAF", description="Taxi bureau — visite client",   worker_name="Kamga Rodrigue",    created_by=workers[0].id),
            Transaction(reference="EXP-002", date=d(4),  type="expense", category="food",       amount=22500,   currency="XAF", description="Déjeuner réunion client",        worker_name="Ngo Biyong Sylvie", created_by=workers[1].id),
            Transaction(reference="EXP-003", date=d(6),  type="expense", category="electric",   amount=48000,   currency="XAF", description="Facture ENEO — bureau principal",worker_name="Kamga Rodrigue",    created_by=workers[0].id),
            Transaction(reference="EXP-004", date=d(8),  type="expense", category="wifi",       amount=35000,   currency="XAF", description="Abonnement MTN Wifi mensuel",    worker_name="Mbida Eric",        created_by=workers[2].id),
            Transaction(reference="EXP-005", date=d(10), type="expense", category="commission", amount=85000,   currency="XAF", description="Commission prospection",         worker_name="Ngo Biyong Sylvie", created_by=workers[1].id),
            Transaction(reference="EXP-006", date=d(14), type="expense", category="transport",  amount=55000,   currency="XAF", description="Mission Douala aller-retour",    worker_name="Mbida Eric",        created_by=workers[2].id),
            Transaction(reference="EXP-007", date=d(18), type="expense", category="salary",     amount=250000,  currency="XAF", description="Salaire octobre — Kamga",        worker_name="Kamga Rodrigue",    created_by=manager.id),
            Transaction(reference="EXP-008", date=d(18), type="expense", category="salary",     amount=220000,  currency="XAF", description="Salaire octobre — Sylvie",       worker_name="Ngo Biyong Sylvie", created_by=manager.id),
            Transaction(reference="EXP-009", date=d(20), type="expense", category="office",     amount=18500,   currency="XAF", description="Papeterie et fournitures",       worker_name="Mbida Eric",        created_by=workers[2].id),
            Transaction(reference="EXP-010", date=d(22), type="expense", category="sinistre",   amount=380000,  currency="XAF", description="Règlement sinistre — Fono M.",   worker_name="Mbida Eric",        created_by=manager.id),
        ]
        for tx in txs:
            db.add(tx)
        print(f"✓ {len(txs)} sample transactions created")

    # ── Daily cash ────────────────────────────────
    if db.query(DailyCash).count() == 0:
        today = date.today()
        dc = DailyCash(date=today, opening_balance=500000, note="Caisse d'ouverture", set_by=manager.id)
        db.add(dc)
        print("✓ Today's opening balance set to 500,000 XAF")

    db.commit()
    print("\n✅ Seed complete. Login at /api/auth/login")
    print("   Manager:  manager  /  Dikos2024!")
    print("   Workers:  kamga, sylvie, mbida  /  Worker123!")

if __name__ == "__main__":
    seed()
    db.close()
