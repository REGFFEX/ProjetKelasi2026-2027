# Deploying Kelasi to a VPS

Topology: MySQL in Docker, backend (FastAPI/gunicorn) and frontend (Next.js)
running natively via systemd, Caddy in front handling TLS and routing
`/api/*` to the backend and everything else to the frontend on one domain.

Assumes a Debian/Ubuntu VPS. Run all `sudo` steps as a user with sudo access;
the app itself runs as a dedicated unprivileged `kelasi` user.

## 1. Prerequisites

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # log out/in after this

# Python 3.12, Node 20, Caddy, git
sudo apt update
sudo apt install -y python3.12 python3.12-venv git curl debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## 2. Create the app user and directory

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin kelasi
sudo mkdir -p /opt/kelasi
sudo chown kelasi:kelasi /opt/kelasi
```

## 3. Get the code onto the VPS

```bash
sudo -u kelasi git clone <your-repo-url> /opt/kelasi
cd /opt/kelasi
```

(Or `rsync`/`scp` the repo if you're not pulling from a remote.)

## 4. Backend

```bash
cd /opt/kelasi/backend

# venv + deps
sudo -u kelasi python3.12 -m venv .venv
sudo -u kelasi .venv/bin/pip install -r requirements.txt

# secrets — edit these values, do not commit the result
sudo -u kelasi cp .env.production.example .env
sudo -u kelasi nano .env          # set JWT_SECRET (openssl rand -hex 32), DB password, CORS_ORIGIN

# also change the MySQL passwords in docker-compose.yml to match .env's DATABASE_URL
sudo -u kelasi nano docker-compose.yml

# start MySQL
sudo -u kelasi docker compose up -d
# wait for it to report healthy:
docker compose ps

# schema + (optional) demo data
sudo -u kelasi .venv/bin/alembic upgrade head
sudo -u kelasi .venv/bin/python -m app.seed   # skip this in a real prod DB you don't want demo rows in
```

## 5. Frontend

```bash
cd /opt/kelasi

sudo -u kelasi cp .env.production.example .env.production
sudo -u kelasi nano .env.production   # confirm NEXT_PUBLIC_API_URL (default /api/v1 is correct for same-domain Caddy setup)

sudo -u kelasi npm ci
sudo -u kelasi npm run build          # NEXT_PUBLIC_* vars are baked in here — must run after .env.production is correct
```

## 6. systemd services

```bash
sudo cp deploy/kelasi-backend.service deploy/kelasi-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kelasi-backend kelasi-frontend
sudo systemctl status kelasi-backend kelasi-frontend
```

## 7. Caddy (reverse proxy + TLS)

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # replace kelasi.example.com with your real domain
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy
sudo systemctl reload caddy
```

Point your domain's DNS A record at the VPS's IP before this step, or Caddy's
automatic Let's Encrypt cert request will fail.

## 8. Verify

```bash
curl -s https://your-domain/api/v1/auth/schools   # should return {"success":true,...}
```

Then open `https://your-domain` in a browser and log in.

## Updating a deployed instance

```bash
cd /opt/kelasi
sudo -u kelasi git pull

cd backend
sudo -u kelasi .venv/bin/pip install -r requirements.txt
sudo -u kelasi .venv/bin/alembic upgrade head

cd /opt/kelasi
sudo -u kelasi npm ci
sudo -u kelasi npm run build

sudo systemctl restart kelasi-backend kelasi-frontend
```

## Logs

```bash
journalctl -u kelasi-backend -f
journalctl -u kelasi-frontend -f
tail -f /var/log/caddy/kelasi.log
```

## Backups

MySQL data lives in the `kelasi_mysql_data` Docker volume. A simple daily
dump via cron:

```bash
# /etc/cron.d/kelasi-backup
0 3 * * * kelasi docker exec backend-mysql-1 mysqldump -u root -pCHANGE_ME_DB_PASSWORD kelasi > /opt/kelasi/backups/kelasi-$(date +\%F).sql
```

Create `/opt/kelasi/backups` and rotate/offsite these dumps — a local dump
next to the DB it's backing up isn't a real backup by itself.
