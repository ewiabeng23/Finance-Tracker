#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Diko's Finance Tracker — EC2 Deployment Script
#  Run as: bash deploy.sh
#  Tested on: Ubuntu 22.04 / 24.04
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error
RED='\033[0;31m'; GREEN='\033[0;32m'; GOLD='\033[0;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${GOLD}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Diko's Finance Tracker — Deployment    ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── 1. System dependencies ────────────────────────
log "Installing system packages..."
sudo apt-get update -q
sudo apt-get install -y -q python3 python3-pip python3-venv \
    postgresql postgresql-contrib nginx nodejs npm git curl

# ── 2. PostgreSQL setup ───────────────────────────
log "Setting up PostgreSQL database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='dikos_finance'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE dikos_finance;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='dikos_user'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER dikos_user WITH PASSWORD 'dikos_pass';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dikos_finance TO dikos_user;"
sudo -u postgres psql -c "ALTER DATABASE dikos_finance OWNER TO dikos_user;"
log "PostgreSQL ready — database: dikos_finance, user: dikos_user"

# ── 3. Clone / update repo ────────────────────────
REPO_DIR="/home/ubuntu/dikos-finance"
if [ -d "$REPO_DIR/.git" ]; then
    log "Pulling latest code..."
    cd "$REPO_DIR" && git pull
else
    warn "No git repo found at $REPO_DIR — copying local files instead"
    # If running from the project directory:
    # sudo cp -r . "$REPO_DIR"
fi

# ── 4. Backend setup ──────────────────────────────
log "Setting up Python virtual environment..."
cd "$REPO_DIR/backend"
python3 -m venv /home/ubuntu/dikos-finance/venv
source /home/ubuntu/dikos-finance/venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
log "Python dependencies installed"

# Generate a secure secret key
SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Write .env if it doesn't exist
if [ ! -f .env ]; then
    cat > .env << EOF
DATABASE_URL=postgresql://dikos_user:dikos_pass@localhost:5432/dikos_finance
SECRET_KEY=${SECRET}
ACCESS_TOKEN_EXPIRE_MINUTES=480
EOF
    log ".env created with generated SECRET_KEY"
else
    warn ".env already exists — skipping"
fi

# Run seed script
log "Running database seed..."
python3 seed.py

# ── 5. Frontend build ─────────────────────────────
log "Building React frontend..."
cd "$REPO_DIR/frontend"

# Set API URL — when frontend is served from same origin via Nginx proxy, leave blank
if [ ! -f .env ]; then
    echo "VITE_API_URL=" > .env
fi

npm install -q
npm run build
log "Frontend built → dist/"

# ── 6. Systemd service ────────────────────────────
log "Installing systemd service..."
sudo cp "$REPO_DIR/deploy/dikos-finance.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dikos-finance
sudo systemctl restart dikos-finance
sleep 2

if systemctl is-active --quiet dikos-finance; then
    log "Backend service running ✓"
else
    err "Backend service failed to start. Check: sudo journalctl -u dikos-finance -n 50"
fi

# ── 7. Nginx ──────────────────────────────────────
log "Configuring Nginx..."
sudo cp "$REPO_DIR/deploy/nginx.conf" /etc/nginx/sites-available/dikos-finance
sudo ln -sf /etc/nginx/sites-available/dikos-finance /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
log "Nginx configured ✓"

# ── 8. Firewall ───────────────────────────────────
log "Configuring firewall..."
sudo ufw allow 22   2>/dev/null || true
sudo ufw allow 80   2>/dev/null || true
sudo ufw allow 443  2>/dev/null || true

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment complete!                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  App URL:      ${GOLD}http://13.222.3.79${NC}"
echo -e "  API docs:     ${GOLD}http://13.222.3.79/api/docs${NC}"
echo ""
echo -e "  Manager login: ${GOLD}manager / Dikos2024!${NC}"
echo -e "  Workers:       ${GOLD}kamga, sylvie, mbida / Worker123!${NC}"
echo ""
echo -e "  ${RED}⚠ Change default passwords immediately after first login!${NC}"
echo ""
echo -e "  Useful commands:"
echo -e "    sudo systemctl status dikos-finance    # service status"
echo -e "    sudo journalctl -u dikos-finance -f    # live logs"
echo -e "    sudo systemctl restart dikos-finance   # restart backend"
echo -e "    sudo systemctl reload nginx            # reload nginx"
echo ""
