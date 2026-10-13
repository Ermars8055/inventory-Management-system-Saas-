<style>
  @page {
    size: A4 portrait;
    margin: 8mm 10mm 8mm 10mm;
  }
  body, p, li, table {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    font-size: 8.5pt;
    line-height: 1.35;
    color: #1a1a1a;
  }
  pre, code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 7.5pt !important;
    white-space: pre-wrap !important;
    word-break: break-all !important;
    overflow-wrap: anywhere !important;
  }
  pre {
    background-color: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 4px;
    padding: 4px 6px !important;
    margin: 3px 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt !important;
    margin: 3px 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  th, td {
    border: 1px solid #d0d7de;
    padding: 3px 4px;
    text-align: left;
  }
  th {
    background-color: #f6f8fa;
    font-weight: 600;
  }
  h1, h2, h3, h4 {
    page-break-after: avoid !important;
    break-after: avoid !important;
    color: #0969da;
  }
  h1 { font-size: 13pt; margin: 0 0 3px 0; }
  h2 { font-size: 10pt; margin: 6px 0 2px 0; border-bottom: 1px solid #d0d7de; padding-bottom: 1px; }
  h3 { font-size: 8.5pt; margin: 4px 0 1px 0; }
  blockquote {
    border-left: 3px solid #0969da;
    background: #f6f8fa;
    padding: 3px 6px;
    margin: 3px 0;
    font-size: 7.5pt;
  }
  .page-break {
    page-break-before: always !important;
    break-before: page !important;
  }
  .no-break {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
</style>

# 🚀 StockPilot — Production Deployment Manual
**Target:** Ubuntu 22.04 / 24.04 LTS VPS  
**Stack:** Docker Compose (FastAPI + React + Nginx + SQLite)  
**DNS:** GoDaddy (Registrar) ➔ Cloudflare (DNS) ➔ VPS  
**Layout:** Strict sub-38 char code blocks. Zero margin overflow.

---

## 📑 Table of Contents
1. [Architecture & System Flow](#1-architecture--system-flow)
2. [DNS Strategy: GoDaddy + Cloudflare](#2-dns-strategy-godaddy--cloudflare-bypass-api-limits)
3. [VPS Initial Setup & Docker](#3-vps-initial-setup--docker-installation)
4. [Deployment & Configuration (.env)](#4-project-deployment--configuration-env)
5. [Docker Compose Launch](#5-docker-compose-launch)
6. [Wildcard SSL via Cloudflare](#6-wildcard-ssl-generation-via-cloudflare-plugin)
7. [Host Nginx Reverse Proxy Setup](#7-host-nginx-reverse-proxy-setup)
8. [Initial Logins & Admin Accounts](#8-initial-logins--admin-credentials)
9. [Automated Daily Database Backups](#9-automated-daily-database-backups)
10. [Maintenance & Routine Commands](#10-maintenance--zero-downtime-updates)

---

## 1. Architecture & System Flow

<div class="no-break">

```text
[ GoDaddy Registrar ]
  │ Nameservers
  ▼
[ Cloudflare DNS (Free) ]
  │
  ├── stockpilot.yourdomain.com
  ├── *.stockpilot.yourdomain.com
  └── stockpilot-admin.yourdomain.com
  │
  ▼ A Records ➔ VPS IP
[ VPS Host Nginx (:443 SSL) ]
  │
  ├──► Port 8060: Tenant App
  │    (stockpilot.*)
  │
  └──► Port 8061: Admin App
      (stockpilot-admin.*)
  │
  ▼ Shared Volume /data
[ stockpilot.db / admin.db ]
```

### Container Port Summary:
| Service | Internal | Host | Route |
| :--- | :--- | :--- | :--- |
| `frontend` | 80 | 8060 | `stockpilot.*` & `*.stockpilot.*` |
| `backend` | 8000 | Int | `/api/` on port 8060 |
| `admin-fe` | 80 | 8061 | `stockpilot-admin.*` |
| `admin-be` | 8001 | Int | `/api/` on port 8061 |
| `translate` | 5000 | Int | Translation engine |

</div>

<div class="page-break"></div>

## 2. DNS Strategy: GoDaddy + Cloudflare (Bypass API Limits)

> **Why Cloudflare DNS is required:**  
> GoDaddy requires paid developer tiers to use their DNS API for wildcard SSL (`*.stockpilot`). By delegating nameservers to Cloudflare (Free), you bypass GoDaddy restrictions entirely and get free automated wildcard renewals.

### Step 2.1: Add Domain to Cloudflare
1. Create a free account at [Cloudflare](https://dash.cloudflare.com/).
2. Click **Add a Site** and enter root domain (e.g. `ermarscastar.in`).
3. Select **Free Plan** and continue.
4. Cloudflare gives 2 nameservers (e.g. `aria.ns.cloudflare.com`, `bob.ns.cloudflare.com`).

### Step 2.2: Point GoDaddy to Cloudflare Nameservers
1. Go to **GoDaddy** ➔ **Domain Portfolio** ➔ Click domain.
2. Select **DNS** ➔ **Nameservers** ➔ **Change Nameservers**.
3. Choose **"I'll use my own nameservers"**.
4. Paste the 2 Cloudflare nameservers and save.  
   *(Propagation takes 5 to 15 minutes).*

### Step 2.3: Add DNS Records in Cloudflare
Under Cloudflare ➔ **DNS** ➔ **Records**, add these 3 records:

| Type | Name | Value | Proxy | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `stockpilot` | `VPS_IP` | **DNS Only** | Main Tenant App |
| **A** | `stockpilot-admin` | `VPS_IP` | **DNS Only** | Admin Panel |
| **A** | `*.stockpilot` | `VPS_IP` | **DNS Only** | Wildcard Subdomains |

*(Set Proxy Status to **DNS Only** / Grey Cloud so Certbot verifies challenges directly).*

### Step 2.4: Create Cloudflare API Token for Wildcard SSL
1. In Cloudflare ➔ **My Profile** ➔ **API Tokens**.
2. Click **Create Token** ➔ Select **Edit zone DNS** template.
3. Under **Zone Resources**:
   - **Include** ➔ **Specific Zone** ➔ Select domain (`ermarscastar.in`).
4. Click **Continue to summary** ➔ **Create Token**.
5. Copy the generated API token. You will paste this into VPS in Step 6.

<div class="page-break"></div>

## 3. VPS Initial Setup & Docker Installation

SSH into the VPS as root:
```bash
ssh root@YOUR_VPS_IP
```

### 3.1: Update Packages & Install Tools
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  curl git ufw nginx sqlite3 \
  certbot python3-certbot-nginx \
  python3-certbot-dns-cloudflare
```

### 3.2: Install Docker Engine
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
```

### 3.3: Configure Firewall (UFW)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 4. Project Deployment & Configuration (.env)

### 4.1: Clone the Codebase
```bash
sudo mkdir -p /opt/stockpilot
sudo chown -R \
  $USER:$USER /opt/stockpilot
git clone <YOUR_GIT_REPO_URL> \
  /opt/stockpilot
cd /opt/stockpilot
```

### 4.2: Generate Secrets & Configure `.env`
Generate two secure random secrets:
```bash
openssl rand -hex 32
openssl rand -hex 32
```

Create `/opt/stockpilot/.env`:
```bash
cp .env.example .env
nano .env
```

Fill `.env` with values:
```env
APP_PORT=8060
ADMIN_PORT=8061
JWT_SECRET=your_secret_1
ADMIN_JWT_SECRET=your_secret_2
SEED_DB=true
TENANT_DOMAIN=ermarscastar.in
SUBDOMAIN_BASE=stockpilot
APP_URL=https://\
stockpilot.ermarscastar.in
VPS_IP=YOUR_VPS_IP
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

---

## 5. Docker Compose Launch

From `/opt/stockpilot`:
```bash
docker compose up -d --build
```

Verify containers are running:
```bash
docker compose ps
```

<div class="page-break"></div>

## 6. Wildcard SSL Generation via Cloudflare Plugin

Certbot creates a single wildcard certificate covering the main domain, admin domain, and all tenant subdomains with automated 60-day renewals.

### 6.1: Store Cloudflare Credentials Securely
```bash
sudo mkdir -p /etc/letsencrypt
cd /etc/letsencrypt
sudo nano cloudflare.ini
```

Paste your API token from Step 2.4:
```ini
dns_cloudflare_api_token=\
YOUR_CLOUDFLARE_TOKEN
```

Restrict file permissions:
```bash
sudo chmod 600 cloudflare.ini
```

### 6.2: Obtain Wildcard Certificate
<div class="no-break">

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials \
    /etc/letsencrypt/cloudflare.ini \
  --dns-cloudflare-propagation-seconds \
    30 \
  -d "stockpilot.ermarscastar.in" \
  -d "*.stockpilot.ermarscastar.in" \
  -d \
    "stockpilot-admin.ermarscastar.in" \
  --agree-tos \
  -m admin@ermarscastar.in \
  --no-eff-email
```

</div>

### 6.3: Create SSL Symlinks (Prevents Line Clipping)
Create short symlinks so Nginx configuration lines remain short and never overflow:
```bash
sudo mkdir -p /etc/nginx/ssl
cd /etc/nginx/ssl
sudo ln -sf /etc/letsencrypt/live/\
stockpilot.ermarscastar.in/\
fullchain.pem fullchain.pem

sudo ln -sf /etc/letsencrypt/live/\
stockpilot.ermarscastar.in/\
privkey.pem privkey.pem
```

---

## 7. Host Nginx Reverse Proxy Setup

### 7.1: Main App + Wildcard Subdomains Config
Open config in editor:
```bash
cd /etc/nginx/sites-available
sudo nano stockpilot.conf
```

<div class="no-break">

```nginx
# 1. HTTP to HTTPS Redirect
server {
  listen 80;
  server_name
    stockpilot.ermarscastar.in
    *.stockpilot.ermarscastar.in;
  return 301 https://$host$request_uri;
}

# 2. HTTPS Main App + Wildcard Tenants
server {
  listen 443 ssl http2;
  server_name
    stockpilot.ermarscastar.in
    *.stockpilot.ermarscastar.in;

  ssl_certificate
    /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key
    /etc/nginx/ssl/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:8060;
    proxy_http_version 1.1;
    proxy_set_header
      Host $host;
    proxy_set_header
      X-Forwarded-Host $host;
    proxy_set_header
      X-Real-IP $remote_addr;
    proxy_set_header
      X-Forwarded-For
      $proxy_add_x_forwarded_for;
    proxy_set_header
      X-Forwarded-Proto $scheme;
    proxy_set_header
      Upgrade $http_upgrade;
    proxy_set_header
      Connection "upgrade";
  }
}
```

</div>

<div class="page-break"></div>

### 7.2: Super Admin Panel Config
Open config in editor:
```bash
cd /etc/nginx/sites-available
sudo nano stockpilot-admin.conf
```

<div class="no-break">

```nginx
# 1. HTTP to HTTPS Redirect
server {
  listen 80;
  server_name
    stockpilot-admin.ermarscastar.in;
  return 301 https://$host$request_uri;
}

# 2. HTTPS Admin Panel
server {
  listen 443 ssl http2;
  server_name
    stockpilot-admin.ermarscastar.in;

  ssl_certificate
    /etc/nginx/ssl/fullchain.pem;
  ssl_certificate_key
    /etc/nginx/ssl/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;

  client_max_body_size 50M;

  location / {
    proxy_pass http://127.0.0.1:8061;
    proxy_http_version 1.1;
    proxy_set_header
      Host $host;
    proxy_set_header
      X-Real-IP $remote_addr;
    proxy_set_header
      X-Forwarded-For
      $proxy_add_x_forwarded_for;
    proxy_set_header
      X-Forwarded-Proto $scheme;
  }
}
```

</div>

### 7.3: Activate Sites and Reload Nginx
<div class="no-break">

```bash
cd /etc/nginx/sites-enabled
sudo ln -sf \
  ../sites-available/stockpilot.conf .
sudo ln -sf \
  ../sites-available/\
stockpilot-admin.conf .
sudo rm -f default

# Test syntax and reload
sudo nginx -t
sudo systemctl reload nginx
```

</div>

---

## 8. Initial Logins & Admin Credentials

When the system boots for the first time with `SEED_DB=true`:

### 🏢 Main Application: `https://stockpilot.ermarscastar.in`
| Role | Email | Password |
| :--- | :--- | :--- |
| **School Org Admin** | `priya@abcinternationalschool.edu` | `password123` |
| **School Manager** | `rajesh@abcinternationalschool.edu` | `password123` |
| **Pharmacy Admin** | `vikram@apollomedical.in` | `password123` |

### 🛡️ Super Admin Panel: `https://stockpilot-admin.ermarscastar.in`
| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@stockpilot.com` | `admin123` |
| **Support Staff** | `support@stockpilot.com` | `support123` |

*(Change default passwords immediately after initial login).*

<div class="page-break"></div>

## 9. Automated Daily Database Backups

The project includes an integrated SQLite backup script in [`scripts/backup.sh`](/opt/stockpilot/scripts/backup.sh) that safely copies live databases without locking.

1. Make backup script executable:
   ```bash
   chmod +x /opt/stockpilot/scripts/backup.sh
   ```
2. Run manual test:
   ```bash
   /opt/stockpilot/scripts/backup.sh
   ```
3. Set up automated nightly cron job (create symbolic link so cron line stays ultra-short):
   ```bash
   sudo ln -sf \
     /opt/stockpilot/scripts/backup.sh \
     /usr/local/bin/sp-backup
   ```
4. In `crontab -e`, add this short line:
   ```cron
   0 2 * * * sp-backup
   ```
   *(Runs daily at 2:00 AM. Backups older than 7 days are automatically pruned).*

---

## 10. Maintenance & Zero-Downtime Updates

Whenever code updates are pushed to Git:

<div class="no-break">

```bash
cd /opt/stockpilot
git pull origin main
docker compose up -d --build
docker image prune -f
```

</div>

### Handy CLI Commands:
- **Check Status:** `docker compose ps`
- **Backend Logs:**  
  `docker compose logs -f backend --tail=50`
- **Admin Logs:**  
  `docker compose logs -f admin-backend --tail=50`
- **Restart Stack:** `docker compose restart`
- **Test SSL Renewal:** `sudo certbot renew --dry-run`
- **Live DB Volume:**  
  `/var/lib/docker/volumes/`
