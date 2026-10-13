# ⚡ StockPilot — Multi-Tenant Inventory & Operations SaaS

> **Built with obsession, precision, and relentless speed.**  
> StockPilot is a high-performance, multi-tenant inventory, asset tracking, recipient distribution, and procurement management platform engineered to outperform bloated legacy enterprise software.

---

## 🛡️ MANDATORY PROTOCOL FOR AI AGENTS & DEVELOPERS

> ### ⚠️ READ THIS BEFORE TOUCHING A SINGLE LINE OF CODE
> Most development on this codebase leverages AI coding assistants and autonomous agents (*Claude, Cursor, Windsurf, Antigravity, Aider*). Agents move fast, but **uncontrolled automated edits destroy production stability**.  
> The following rules are **strictly enforced by team policy and branch protection**.

### 1. The Sacred `main` Branch
* **`main` IS PRODUCTION.**
* **NEVER** push, commit, or run automated migrations directly against `main`.
* Direct pushes to `main` are blocked.

### 2. The "One Branch, One Feature" Rule
* Every new feature or fix **MUST** be developed inside its own dedicated, isolated branch:
  ```bash
  # For features:
  git checkout -b feature/<descriptive-name>
  # Example: git checkout -b feature/classes-filter-options

  # For bug fixes:
  git checkout -b fix/<descriptive-name>
  # Example: git checkout -b fix/rbac-staff-mutation-gating
  ```
* **Strict Scope:** Exactly **ONE** feature or fix per branch. Do not combine multiple unrelated tasks into a single branch.

### 3. Isolated Branch Testing (Zero Tolerance for Broken Code)
Before requesting a review or merging, the feature branch **MUST** pass all local verification gates:
1. **TypeScript Typecheck:** Must pass with zero errors:
   ```bash
   npm run typecheck
   ```
2. **Production Bundle Build:** Must compile cleanly:
   ```bash
   npm run build
   ```
3. **Backend Health Check:** FastAPI backend must boot and respond healthy:
   ```bash
   python -c "import urllib.request; assert urllib.request.urlopen('http://localhost:8000/health').getcode() == 200"
   ```
4. **RBAC Safety Verification:** Ensure non-admin roles (`staff`, `viewer`) cannot execute mutations.

### 4. Tech Lead / Senior Approval Gate
* **No AI agent or developer may self-merge into `main`.**
* Only the **Tech Lead** or **Senior Engineer** has merge authorization after:
  - Verifying the pull request against the original requirements.
  - Reviewing the diff for breaking schema changes or permission regressions.
  - Testing the isolated branch build.

---

## 🎯 What is StockPilot?

StockPilot is an all-in-one institutional operations SaaS tailored for schools, colleges, medical stores, and enterprises. It replaces disconnected spreadsheets with a unified, real-time operating system.

### 🌟 Core Capabilities:
- 🏢 **Multi-Tenant Architecture:** Fully isolated organizations with custom subdomains (`*.stockpilot.yourdomain.com`).
- 🔐 **Granular Role-Based Access Control (RBAC):** Strict permissions matrix (`org_admin`, `manager`, `staff`, `viewer`) gating every UI button and REST endpoint.
- 👕 **Specialized Inventory Modules:**
  - **Uniforms:** Gender, sizes, stock levels, reorder points.
  - **Books:** ISBN, subjects, publishers, editions.
  - **Pharmacy / Healthcare:** Batch numbers, expiry tracking, expiry alert thresholds.
- 🎓 **Classes & Academics:**
  - Class enrollment, student rosters, academic year management.
  - Material package assignment, fee collection, distribution status, payment receipt exports.
- 👥 **Recipients & Asset Assignment:** Issuance, return workflows, loss logging, fine tracking, barcode/QR identification.
- 📦 **Procurement & Vendors:** Purchase orders (PO), quotation comparisons, goods received notes (GRN), vendor evaluation.
- 🌐 **Real-Time Machine Translation:** Instant multi-language UI localization (English, Hindi, Bengali) powered by self-hosted LibreTranslate.

---

## 🏗️ Architecture & Tech Stack

```
                     Public Traffic (HTTPS :443)
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
       https://stockpilot.domain.com   https://stockpilot-admin.domain.com
             (Tenant Main App)               (Super Admin Panel)
                   │                                   │
             Host Port 8060                      Host Port 8061
                   ▼                                   ▼
        [ Docker: frontend ]                [ Docker: admin-frontend ]
        React 18 + Vite + Nginx             React 18 + Vite + Nginx
                   │                                   │
          Proxy /api (internal)               Proxy /api (internal)
                   ▼                                   ▼
        [ Docker: backend ]                 [ Docker: admin-backend ]
        FastAPI + SQLAlchemy                FastAPI + SQLAlchemy
        (Port 8000)                         (Port 8001)
                   │                                   │
                   └───────────► [ Volumes ] ◄─────────┘
                            /data/stockpilot.db
```

### Stack Breakdown:
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Radix UI / Shadcn UI, Lucide Icons, Recharts.
- **Main Backend:** Python 3.11, FastAPI, SQLAlchemy, Pydantic v2, Uvicorn, SQLite (default) / PostgreSQL 16.
- **Admin Backend:** FastAPI (Dedicated super-admin tenant control, domain mapping, billing).
- **Reverse Proxy & Edge:** Nginx, Certbot (Automated Wildcard DNS SSL via Cloudflare).
- **Localization:** LibreTranslate (Self-hosted offline MT container).

---

## 📁 Repository Structure

```text
├── src/                  # Main Tenant Frontend (React + TypeScript)
│   ├── components/       # Shared UI components, layout, dialogs, forms
│   ├── context/          # AuthContext (RBAC), OrganizationContext
│   ├── hooks/            # useTranslation, useOrgConfig, toast hooks
│   ├── pages/            # Inventory, Classes, Recipients, Fees, Assets, Procurement
│   ├── services/         # API service layer (classService, inventoryService, etc.)
│   └── types/            # TypeScript domain interfaces and schemas
├── backend/              # Main Tenant API (FastAPI)
│   ├── app/
│   │   ├── routers/      # auth, inventory, classes, recipients, procurement, etc.
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── migrate.py    # Auto-migration runner
│   │   └── seed.py       # Initial database seed script
│   └── Dockerfile
├── admin/                # Super Admin Frontend (React)
├── backend-admin/        # Super Admin Backend (FastAPI)
├── deploy/               # Host Nginx virtual host configurations
├── scripts/              # Automated database backup and utility scripts
├── docker-compose.yml    # Multi-service stack definition
├── DEPLOYMENT_GUIDE.md   # VPS & Cloudflare Wildcard SSL production manual
└── README.md             # This document
```

---

## 💻 Local Development Setup

### Option A: Running with Docker (Recommended)
```bash
# 1. Clone repository
git clone <REPO_URL>
cd stockpilot

# 2. Configure environment
cp .env.example .env

# 3. Launch stack
docker compose up -d --build

# 4. Access apps:
# Main Tenant App:  http://localhost:8060
# Super Admin:      http://localhost:8061
# Backend API Docs: http://localhost:8000/docs
```

### Option B: Bare Metal Development (No Docker)

#### 1. Backend Setup:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations and seed data
python -m app.migrate
python -m app.seed

# Start FastAPI server on :8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup:
```bash
# In repository root
npm install
npm run dev
# Frontend dev server starts at http://localhost:5173
```

---

## 🔑 Default Credentials (Seed Data)

When `SEED_DB=true`:

| Application | Role | Email | Password |
| :--- | :--- | :--- | :--- |
| **Main App** | School Admin | `priya@abcinternationalschool.edu` | `password123` |
| **Main App** | School Manager | `rajesh@abcinternationalschool.edu` | `password123` |
| **Main App** | Pharmacy Admin | `vikram@apollomedical.in` | `password123` |
| **Super Admin** | Platform Admin | `admin@stockpilot.com` | `admin123` |
| **Super Admin** | Support Staff | `support@stockpilot.com` | `support123` |

---

## 🧪 Testing & Quality Assurance

Before submitting any Pull Request:
```bash
# 1. Static type checking (TypeScript)
npm run typecheck

# 2. Production build verification
npm run build

# 3. Linting
npm run lint
```

---

## 🚀 Production VPS Deployment

Refer to [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) for the complete, step-by-step production runbook, including:
- Delegating GoDaddy to Cloudflare Nameservers (bypassing GoDaddy API limits).
- Automated Wildcard SSL certificate generation (`*.stockpilot.yourdomain.com`).
- Host Nginx reverse proxy configuration.
- Automated daily SQLite database backups via cron (`scripts/backup.sh`).
- Zero-downtime updates with Docker Compose.

---

## 🤝 Code of Conduct for AI Agents & Humans

1. **Be Disciplined:** Don't write code you haven't typechecked.
2. **Be Defensive:** Check permissions with `can('permission:name')` before rendering any action button or mutation endpoint.
3. **Keep Branches Clean:** Delete feature branches after merge. Keep git history linear and meaningful.
4. **No Shortcuts:** An underdog team wins on quality and reliability. Never commit half-tested work.
