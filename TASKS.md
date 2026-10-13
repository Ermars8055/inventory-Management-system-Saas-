# StockPilot — Open Tasks

Track progress here. Solve one at a time, check off when done.

---

## ✅ Already Safe (investigated)

### Subdomain Uniqueness
- `organizations.subdomain` has `unique=True` in models.py (line 18)
- Safe — two orgs cannot get the same subdomain at DB level

### Migration Safety
- `migrate.py` uses `ALTER TABLE ADD COLUMN` wrapped in try/except
- Ignores "duplicate column" / "already exists" errors — safe on existing DBs
- Runs before seed on every startup — data is never wiped
- Safe to deploy ✅

---

## 🔴 Task 1 — Fee Receipts + Receipt History in Reports
**Priority: High**

### Problem
After a staff member collects a fee payment, there is no receipt generated.
Parents have no proof of payment. No way to view receipt history.

### Plan

#### Backend
- Add `GET /fees/{fee_id}/receipt` endpoint that returns receipt data
  (student name, class, items, amount paid, date, issued by, receipt number)
- Generate a unique receipt number (e.g. `RCP-2026-0001`) per org, auto-incrementing
- Add `receipt_number` column to `fee_records` table via migrate.py

#### Frontend — Receipt Modal
- After "Record Payment" succeeds → show a print-ready receipt modal
- Receipt includes: org name/logo, student name, class, item list, amount, date, receipt no.
- "Print" button triggers `window.print()` with print-only CSS
- "Download PDF" — use browser print-to-PDF or a lib like `html2canvas` + `jsPDF`

#### Frontend — Reports Section
- Add "Receipts" tab in Reports page
- Table: receipt no. | student | class | amount | date | issued by | actions
- Filter by: date range, class, academic year
- Each row has "View / Print" button that opens the receipt modal

#### Files to touch
- `backend/app/models.py` — add `receipt_number` to `FeeRecord`
- `backend/app/migrate.py` — ADD COLUMN receipt_number
- `backend/app/routers/fees.py` — generate receipt number on pay, add receipt endpoint
- `backend/app/schemas.py` — add receipt schema
- `src/pages/Reports.tsx` — add Receipts tab
- `src/services/index.ts` — add receipt API calls
- `src/types/index.ts` — add Receipt type

- [x] Backend: receipt_number column + migration
- [x] Backend: auto-increment receipt number per org
- [x] Backend: GET /fees/{id}/receipt endpoint
- [x] Frontend: print-ready receipt modal (ClassDetail + Reports)
- [x] Frontend: Reports → Receipts table + fee summary cards
- [ ] Test: pay fee → receipt appears → print works

---

## 🟠 Task 2 — Partial Payments (Settings Toggle, Per Tenant)
**Priority: Medium**

### Problem
We locked the Amount Received field to prevent staff from editing prices.
But some schools legitimately need partial payments (e.g. pay ₹500 now, ₹500 next month).
This needs to be optional, controlled per organization by admin.

### Current State
- `fee_status` already has `partial` value in DB and types — backend supports it
- `FeeRecord.paid_amount` tracks partial payments already
- Only the UI is locked (Amount Received is read-only display)

### Plan

#### Backend
- Add `allowPartialPayments` boolean to org `config` JSON (default: `false`)
- No schema change needed — config is already a JSON column

#### Frontend — Settings Page
- Under "Fee Settings" section in org Settings page
- Toggle: "Allow Partial Payments" — when ON, staff can enter any amount ≤ total
- Saves to org config via PATCH /organizations/{id}

#### Frontend — Collect Fee Dialog (ClassDetail.tsx)
- Read `currentOrg.config.allowPartialPayments`
- If `false` (default): Amount Received = read-only display (current behavior)
- If `true`: Amount Received = editable number input, max = outstanding balance
- Show remaining balance after partial: "Remaining: ₹X"

#### Files to touch
- `src/pages/Settings.tsx` — add toggle under fee settings
- `src/pages/ClassDetail.tsx` — conditionally render input vs display
- `src/types/index.ts` — add `allowPartialPayments` to OrgConfig type
- `src/context/OrganizationContext.tsx` — ensure config is available

- [x] Settings page: add Allow Partial Payments toggle
- [x] ClassDetail: read config and conditionally show editable input
- [ ] Test: toggle ON → can enter partial → status shows "partial" → toggle OFF → locked again
- [ ] Verify: partial payment accumulates (pay ₹50 twice = ₹100 paid)

---

## 🟠 Task 3 — DB Backups (Automated, VPS)
**Priority: High — data loss risk**

### Problem
SQLite DB lives in a Docker volume. If the volume is deleted or VPS crashes, all data is gone.
No backup system exists.

### Current Setup
- SQLite file in Docker volume
- VPS has multiple apps — shared server

### Plan

#### Option A — Simple: Daily backup script on VPS (recommended)
- Cron job on VPS copies SQLite file to a backup directory + timestamps it
- Keep last 7 days of backups
- Optionally rsync/scp to a remote location (another VPS, S3, Google Drive)

```bash
# /opt/stockpilot/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M)
docker exec inv-backend-1 sqlite3 /app/data/stockpilot.db ".backup /tmp/backup_$DATE.db"
docker cp inv-backend-1:/tmp/backup_$DATE.db /opt/backups/stockpilot/
find /opt/backups/stockpilot/ -name "*.db" -mtime +7 -delete
```

#### Option B — Backend endpoint: POST /admin/backup
- Triggers SQLite `.backup` command
- Returns the file as a download
- Protected by super-admin role

### Steps
- [x] Write backup.sh script → `scripts/backup.sh`
- [ ] **VPS**: Copy script: `scp scripts/backup.sh root@VPS:/opt/stockpilot/scripts/backup.sh`
- [ ] **VPS**: `chmod +x /opt/stockpilot/scripts/backup.sh && mkdir -p /opt/backups/stockpilot`
- [ ] **VPS**: Test run: `bash /opt/stockpilot/scripts/backup.sh`
- [ ] **VPS**: Add cron: `echo "0 2 * * * /opt/stockpilot/scripts/backup.sh >> /var/log/stockpilot-backup.log 2>&1" | crontab -`

---

## 🟡 Task 4 — OOM / No Swap on VPS
**Priority: Medium — server stability**

### Problem
VPS has 0 swap. When RAM fills up (7GB used of 7.9GB), Linux OOM killer
randomly kills processes — could kill the DB or app containers.

### Plan
Add a swap file on the VPS (does not require reinstall):

```bash
# Run on VPS as root
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab  # persist on reboot
```

Also set swappiness to prefer RAM but fall back gracefully:
```bash
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

- [ ] **VPS** (run as root):
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf && sysctl -p
  free -h  # verify swap shows 2G
  ```

---

## 🔵 Task 5 — Reports Page Audit
**Priority: Low**

### Problem
Reports page tracks some things but needs a full review of what's shown
vs what's available in the DB.

### Checklist
- [x] Fee Collection Summary (total due, collected, paid/pending student counts)
- [x] Fee Receipts table (receipt no., student, class, amount, status, date, print button)
- [x] CSV export for receipts
- [ ] Optional: monthly fee collection bar chart (group by month)

---

## Notes
- Partial payment backend already works — only UI was locked
- Receipt number should be org-scoped and sequential (not global)
- Backup must be tested before considering it "done"
- Swap is a VPS change — must be done manually on the server
