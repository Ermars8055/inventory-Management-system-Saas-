#!/bin/bash
# Daily database backup script
# Add to crontab: 0 2 * * * /path/to/backup.sh

BACKUP_DIR="/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# SQLite backup
if [ -f "/data/stockpilot.db" ]; then
    cp /data/stockpilot.db "$BACKUP_DIR/stockpilot_$DATE.db"
fi
if [ -f "/data/admin.db" ]; then
    cp /data/admin.db "$BACKUP_DIR/admin_$DATE.db"
fi

# PostgreSQL backup (if using postgres)
if [ ! -z "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgresql* ]]; then
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/stockpilot_$DATE.sql" 2>/dev/null
fi

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete 2>/dev/null
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete 2>/dev/null

echo "Backup completed: $DATE"
