# Diko's Assurances — Finance Tracker

Full-stack finance tracking app for Diko's Assurances SARL.
Built to give management full visibility into income, expenses, and staff spending — preventing unauthorised cash handling.

## Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React + Vite                      |
| Backend  | FastAPI (Python)                  |
| Database | PostgreSQL                        |
| Auth     | JWT — Manager / Worker roles      |
| Deploy   | EC2 (backend) + Vercel (frontend) |

---

## Roles & Permissions

| Action                            | Worker | Manager |
|-----------------------------------|--------|---------|
| Add income & expense transactions | ✓      | ✓       |
| Add new customers                 | ✓      | ✓       |
| View all transactions             | ✓      | ✓       |
| Edit transactions                 | ✗      | ✓       |
| Delete transactions               | ✗      | ✓       |
| Manage worker accounts            | ✗      | ✓       |
| View analytics & reports          | ✗      | ✓       |
| Export PDF / Excel                | ✗      | ✓       |
| Set daily cash balance            | ✗      | ✓       |

---

## Local Development

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # edit DATABASE_URL + SECRET_KEY
python seed.py                # creates tables + demo accounts
uvicorn app.main:app --reload
# API running at http://localhost:8000
# Swagger docs at http://localhost:8000/api/docs
```

### Frontend
```bash
cd frontend
npm install
# .env is pre-configured to proxy /api → localhost:8000 via Vite
npm run dev
# App running at http://localhost:5173
```

---

## EC2 Deployment (one-time setup)

### 1. SSH into your server
```bash
ssh -i your-key.pem ubuntu@13.222.3.79
```

### 2. Clone the repo
```bash
git clone https://github.com/ewiabeng23/dikos-finance.git
cd dikos-finance
```

### 3. Run the deploy script
```bash
chmod +x deploy/deploy.sh
bash deploy/deploy.sh
```

That's it. The script will:
- Install Python, Node, PostgreSQL, Nginx
- Create the database and user
- Install all dependencies
- Build the React frontend
- Configure systemd service (auto-restart on crash)
- Configure Nginx (serves frontend + proxies API)
- Seed demo accounts

**App URL:** http://13.222.3.79

### Updating after code changes
```bash
cd /home/ubuntu/dikos-finance
git pull
source venv/bin/activate
pip install -r backend/requirements.txt   # if dependencies changed
cd frontend && npm install && npm run build
sudo systemctl restart dikos-finance
sudo systemctl reload nginx
```

### Useful commands
```bash
sudo systemctl status dikos-finance       # service health
sudo journalctl -u dikos-finance -f       # live backend logs
sudo nginx -t                             # test nginx config
sudo systemctl reload nginx
```

---

## Vercel Deployment (frontend only)

When ready to move the frontend to Vercel:

### 1. Set backend URL in frontend/.env
```
VITE_API_URL=http://13.222.3.79
```

### 2. Deploy to Vercel
```bash
cd frontend
npm i -g vercel
vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard:
- **Framework:** Vite
- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_URL=http://YOUR_EC2_IP`

The `vercel.json` already handles SPA routing — no extra config needed.

### Important: CORS
When the frontend moves to Vercel, update `backend/app/main.py`:
```python
allow_origins=["https://your-app.vercel.app"]
```

---

## Default Accounts

| Username | Password    | Role    |
|----------|-------------|---------|
| manager  | Dikos2024!  | Manager |
| kamga    | Worker123!  | Worker  |
| sylvie   | Worker123!  | Worker  |
| mbida    | Worker123!  | Worker  |

**⚠ Change all passwords immediately after first deployment.**

---

## Project Structure

```
dikos-finance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS + routes
│   │   ├── core/
│   │   │   ├── config.py        # Settings (env vars)
│   │   │   ├── database.py      # SQLAlchemy session
│   │   │   └── security.py      # JWT + password hashing
│   │   ├── models/              # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── transaction.py
│   │   │   ├── customer.py
│   │   │   └── daily_cash.py
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic request/response schemas
│   │   └── routers/
│   │       ├── auth.py          # Login, /me
│   │       ├── users.py         # Manager: CRUD on user accounts
│   │       ├── transactions.py  # Add (all) / Edit+Delete (manager only)
│   │       ├── customers.py     # Add (all) / Edit (manager only)
│   │       └── reports.py       # Analytics + daily cash register
│   ├── seed.py                  # Demo data + account setup
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + protected routes
│   │   ├── index.css            # Global design system (navy/gold)
│   │   ├── api/
│   │   │   ├── client.js        # Axios instance + interceptors
│   │   │   ├── endpoints.js     # All API calls
│   │   │   └── utils.js         # Formatters + category config
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # JWT auth state
│   │   ├── hooks/
│   │   │   └── useToast.js      # Toast notifications
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── TransactionModal.jsx
│   │   │   └── CustomerModal.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── TransactionsPage.jsx
│   │       ├── ExpensesPage.jsx
│   │       ├── CustomersPage.jsx
│   │       ├── StaffPage.jsx    # Manager only
│   │       └── ReportsPage.jsx  # Manager only — PDF/Excel export
│   ├── vercel.json
│   └── vite.config.js
└── deploy/
    ├── deploy.sh                # One-command EC2 setup
    ├── dikos-finance.service    # systemd unit
    └── nginx.conf               # Nginx reverse proxy
```
