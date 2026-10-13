#!/bin/bash
# StockPilot SQLite backup script
# Copies the live DB from the running backend container to a timestamped file.
# Set up as a cron job on VPS: 0 2 * * * /opt/stockpilot/scripts/backup.sh >> /var/log/stockpilot-backup.log 2>&1

BACKUP_DIR="/opt/backups/stockpilot"
CONTAINER="inv-backend-1"
DATE=$(date +%Y%m%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/stockpilot_$DATE.db"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

# Use SQLite .backup command (safe on live DB — no locking issues)
docker exec "$CONTAINER" sqlite3 /app/data/stockpilot.db ".backup /tmp/backup_$DATE.db"
docker cp "$CONTAINER:/tmp/backup_$DATE.db" "$BACKUP_FILE"
docker exec "$CONTAINER" rm -f "/tmp/backup_$DATE.db"

if [ -f "$BACKUP_FILE" ]; then
  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup OK: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ERROR: Backup failed" >&2
  exit 1
fi

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "*.db" -mtime +$KEEP_DAYS -delete
