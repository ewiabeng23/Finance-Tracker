# Diko's Assurances — Finance Tracker

Full-stack finance tracking app for Diko's Assurances SARL.
Built to give management full visibility into income, expenses, and staff spending — preventing unauthorised cash handling.

---

## Stack

| Layer    | Technology              | Deployed At                                    |
|----------|-------------------------|------------------------------------------------|
| Frontend | React + Vite            | Vercel — `https://dikos-finance.vercel.app`    |
| Backend  | FastAPI (Python)        | Render — `https://dikos-finance-api.onrender.com` |
| Database | PostgreSQL              | Supabase — `jolguqquqzipepgubsur.supabase.co` |
| Auth     | JWT — Manager / Worker  | —                                              |

---

## Roles & Permissions

| Action                            | Worker | Manager |
|-----------------------------------|--------|---------|
| Add income & expense transactions | ✓      | ✓       |
| Add new customers                 | ✓      | ✓       |
| View all transactions             | ✓      | ✓       |
| Generate invoice / receipt PDF    | ✓      | ✓       |
| Edit transactions                 | ✗      | ✓       |
| Delete transactions               | ✗      | ✓       |
| Manage worker accounts            | ✗      | ✓       |
| View analytics & reports          | ✗      | ✓       |
| Export PDF / Excel                | ✗      | ✓       |
| Set daily cash balance            | ✗      | ✓       |

---

## Default Accounts

| Username | Password    | Role    |
|----------|-------------|---------|
| manager  | Dikos2024!  | Manager |
| kamga    | Worker123!  | Worker  |
| sylvie   | Worker123!  | Worker  |
| mbida    | Worker123!  | Worker  |

> ⚠ Change all passwords after first login via the Staff page.

---

## Architecture

```
Browser
  │
  ├── Vercel (React frontend)
  │     └── vercel.json proxies /api/* → Render backend
  │
  └── Render (FastAPI backend)
        └── Supabase PostgreSQL
```

The `vercel.json` proxy is critical — without it, `/api/` requests are caught
by Vercel's SPA rewrite and return `index.html` instead of hitting the backend.

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://dikos-finance-api.onrender.com/api/$1" },
    { "source": "/(.*)",     "destination": "/index.html" }
  ]
}
```

---

## Local Development

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pip install bcrypt==4.0.1        # required — see Known Issues below
cp .env.example .env             # edit DATABASE_URL + SECRET_KEY
python seed.py                   # creates tables + demo accounts
uvicorn app.main:app --reload --port 8000
# API at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
# .env is pre-configured — VITE_API_URL= (empty = use Vite proxy to localhost:8000)
npm run dev
# App at http://localhost:5173
```

---

## Deployment

### Supabase (Database)

- Project ref: `jolguqquqzipepgubsur`
- Region: `West EU (London)`
- Connection: use **Session Pooler** URI (port 5432) — NOT direct connection
  - Direct connection is not IPv4 compatible (Render uses IPv4)
- Connection string format:
  ```
  postgresql://postgres.jolguqquqzipepgubsur:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
  ```
- **Do NOT enable automatic RLS** when creating the project — it blocks FastAPI queries

### Render (Backend)

Settings used:
| Field          | Value                                              |
|----------------|----------------------------------------------------|
| Runtime        | Python 3                                           |
| Root Directory | `backend`                                          |
| Build Command  | `pip install -r requirements.txt`                  |
| Start Command  | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type  | Free                                               |

Environment variables required:
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
SECRET_KEY=your-32-char-hex-secret
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

**After first deploy — seed the database:**
```bash
curl -X POST https://dikos-finance-api.onrender.com/api/auth/setup
```
This creates all tables and demo accounts. Run once only.
If it returns `{"message":"Already seeded"}` — database is ready.

> ⚠ After seeding, remove or protect the `/api/auth/setup` endpoint in production.

**Free tier limitation:** Render spins down after 15 minutes of inactivity.
First request after sleep takes ~30-60 seconds. Upgrade to $7/month Starter
for always-on. Or add a cron job pinging the API every 10 minutes.

### Vercel (Frontend)

Settings used:
| Field           | Value           |
|-----------------|-----------------|
| Framework       | Vite            |
| Root Directory  | `frontend`      |
| Build Command   | `npm run build` |
| Output Dir      | `dist`          |

Environment variable required:
```
VITE_API_URL=https://dikos-finance-api.onrender.com
```

> ⚠ `VITE_API_URL` must be set BEFORE deploying — Vite bakes it into the
> build at compile time. Adding it after and redeploying with cache cleared is required.

> ⚠ `frontend/.env.production` with `VITE_API_URL=https://dikos-finance-api.onrender.com`
> is committed to the repo and takes precedence over Vercel env vars during build.

**Triggering a fresh deploy:**
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## Known Issues & Fixes Applied

### 1. bcrypt / passlib incompatibility
**Problem:** `passlib 1.7.4` throws `AttributeError: module 'bcrypt' has no attribute '__about__'`
with `bcrypt >= 4.1.0`.

**Fix:** Pin bcrypt to `4.0.1` in build command or requirements:
```
bcrypt==4.0.1
```
This is already handled in `requirements.txt`.

### 2. Python version on Render
**Problem:** Render defaults to Python 3.14 which cannot build `pydantic-core 2.18.2`
(requires Rust compilation, read-only filesystem on Render).

**Fix:** Use unpinned versions in `requirements.txt` so pip resolves compatible
wheels for Python 3.14. Do NOT pin `pydantic==2.7.1` — it has no 3.14 wheel.
Current `requirements.txt` uses `>=` ranges, not `==`.

### 3. JWT sub claim type mismatch
**Problem:** `python-jose 3.5.0` (installed on Python 3.14) encodes `sub` as
integer. Decoding then fails with `"Could not validate credentials"`.

**Fix:** In `security.py`, `create_access_token` converts `sub` to string:
```python
if "sub" in to_encode:
    to_encode["sub"] = str(to_encode["sub"])
```
And `get_current_user` converts back to int:
```python
user_id = int(payload.get("sub"))
```

### 4. Vercel SPA rewrite blocking API calls
**Problem:** All `/api/` requests returned `index.html` (200 but wrong content)
because the catch-all rewrite in `vercel.json` intercepted them.

**Fix:** Add API proxy rule BEFORE the SPA fallback in `vercel.json`:
```json
{ "source": "/api/(.*)", "destination": "https://dikos-finance-api.onrender.com/api/$1" }
```

### 5. VITE_API_URL not baked into build
**Problem:** Setting `VITE_API_URL` in Vercel dashboard after initial deploy
had no effect — Vite already built with empty string.

**Fix:** Commit `frontend/.env.production` to the repo with the correct URL.
This file is NOT in `.gitignore` (unlike `.env`) so it gets committed and
picked up at build time.

### 6. React modals not appearing (position: fixed issue)
**Problem:** Modals rendered inside the component tree were clipped or invisible
due to overflow/z-index conflicts with the Vercel deployment environment.

**Fix:** Use `createPortal` from `react-dom` to render modals directly on
`document.body`, bypassing any parent container constraints:
```jsx
import { createPortal } from 'react-dom'
return createPortal(<div className="modal-overlay">...</div>, document.body)
```
Applied to: `TransactionModal.jsx`, `CustomerModal.jsx`, cash modal in `ReportsPage.jsx`.

### 7. useToast.js JSX in .js file
**Problem:** Vite failed to build because `useToast.js` contained JSX syntax
but had a `.js` extension (not `.jsx`).

**Fix:** Rewrote `useToast.js` using `React.createElement` instead of JSX,
avoiding the need to rename the file:
```js
const ToastEl = toast
  ? createElement('div', { className: `toast ${toast.type}` }, ...)
  : null
```

### 8. Supabase direct connection not IPv4 compatible
**Problem:** Render uses IPv4. Supabase direct connection (port 5432 on `db.*.supabase.co`)
is IPv6 only on the free plan.

**Fix:** Use the **Session Pooler** connection string instead
(`aws-1-eu-west-2.pooler.supabase.com` port 5432). Found in Supabase dashboard →
Connect → Connection String → Session Pooler.

### 9. DailyCashClose schema requires note field
**Problem:** Closing the cash register failed silently because the API schema
required a `note` field but the frontend wasn't sending it.

**Fix:** Always send `note: ''` in the close payload:
```js
await reportsAPI.closeDay(cashDate, { closing_balance: parseFloat(closeBal), note: '' })
```

---

## Updating After Code Changes

```bash
# Local changes
git add .
git commit -m "Your message"
git push origin main
# Vercel auto-deploys frontend
# Render auto-deploys backend
```

If Render does not auto-deploy:
- Go to Render dashboard → Manual Deploy → Deploy latest commit

If Vercel shows stale deployment:
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

## Future Migration to Zero-Cost Stack (already on this stack)

Current deployment IS the zero-cost stack:
- **Vercel** — free forever for hobby projects
- **Render** — free tier (sleeps after 15min inactivity)
- **Supabase** — free tier (500MB database, always on)

To eliminate Render sleep, upgrade to Render Starter ($7/month).

### If migrating database to a different provider
Only `DATABASE_URL` needs updating in Render environment variables.
Run `python seed.py` once after migration to recreate tables and accounts.
Or export/import data:
```bash
# Export from Supabase
pg_dump "postgresql://..." > backup.sql
# Import to new provider
psql "postgresql://new-provider..." < backup.sql
```

---

## Project Structure

```
Finance-Tracker/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app + CORS + routes
│   │   ├── core/
│   │   │   ├── config.py         # Settings (env vars)
│   │   │   ├── database.py       # SQLAlchemy session
│   │   │   └── security.py       # JWT + bcrypt — see Known Issues
│   │   ├── models/               # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── transaction.py
│   │   │   ├── customer.py
│   │   │   └── daily_cash.py
│   │   ├── schemas/
│   │   │   └── schemas.py        # Pydantic schemas
│   │   └── routers/
│   │       ├── auth.py           # Login + /setup endpoint
│   │       ├── users.py          # Manager: CRUD on accounts
│   │       ├── transactions.py   # Add (all) / Edit+Delete (manager)
│   │       ├── customers.py      # Add (all) / Edit (manager)
│   │       └── reports.py        # Analytics + daily cash
│   ├── seed.py                   # Creates tables + demo accounts
│   ├── runtime.txt               # Python version pin for Render
│   └── requirements.txt          # Unpinned versions for Python 3.14
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Router + LanguageProvider + AuthProvider
│   │   ├── index.css             # Global design system (navy/gold)
│   │   ├── api/
│   │   │   ├── client.js         # Axios + auto token injection + 401 redirect
│   │   │   ├── endpoints.js      # All API calls
│   │   │   ├── utils.js          # Formatters + category config (getCatLabel takes lang param)
│   │   │   └── translations.js   # Full FR/EN translation strings
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # JWT auth state
│   │   │   └── LanguageContext.jsx # FR/EN language state (persisted to localStorage)
│   │   ├── hooks/
│   │   │   └── useToast.js       # Toast notifications (uses createElement not JSX)
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # FR/EN toggle + role-aware nav links
│   │   │   ├── TransactionModal.jsx  # createPortal — add/edit transactions
│   │   │   └── CustomerModal.jsx     # createPortal — add/edit customers
│   │   └── pages/
│   │       ├── LoginPage.jsx         # FR/EN toggle on login
│   │       ├── DashboardPage.jsx     # Summary cards + 6-month bar chart
│   │       ├── TransactionsPage.jsx  # Full list, date filter, running balance, invoice/receipt PDF
│   │       ├── ExpensesPage.jsx      # Staff spending, pie chart, per-worker breakdown
│   │       ├── CustomersPage.jsx     # Client cards
│   │       ├── StaffPage.jsx         # Manager: create/deactivate accounts
│   │       └── ReportsPage.jsx       # Analytics, PDF/Excel export, cash register
│   ├── .env                      # Local dev (VITE_API_URL= empty, uses Vite proxy)
│   ├── .env.production           # Production (VITE_API_URL=https://dikos-finance-api.onrender.com)
│   ├── vercel.json               # API proxy + SPA fallback
│   └── vite.config.js            # esbuild config for .js JSX support
└── README.md                     # This file
```
