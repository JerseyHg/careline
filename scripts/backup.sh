#!/bin/bash
# CareLine 数据库备份脚本
# 建议加入 crontab: 0 3 * * * /path/to/backup.sh

set -e

BACKUP_DIR="/home/ubuntu/careline-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="careline-db-1"  # docker compose 生成的容器名

mkdir -p "$BACKUP_DIR"

# Dump database
docker exec "$CONTAINER_NAME" pg_dump -U careline careline | gzip > "$BACKUP_DIR/careline_${TIMESTAMP}.sql.gz"

# Keep only last 30 backups
cd "$BACKUP_DIR" && ls -tp | grep -v '/$' | tail -n +31 | xargs -I {} rm -- {}

echo "✅ Backup completed: careline_${TIMESTAMP}.sql.gz"
