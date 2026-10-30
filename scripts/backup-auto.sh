#!/bin/bash
set -e
cd /root/mega-lanches
mkdir -p backups
cp data/mega-lanches.db "backups/auto-$(date +%Y%m%d-%H%M%S).db"
find backups -name 'auto-*.db' -mtime +7 -delete
