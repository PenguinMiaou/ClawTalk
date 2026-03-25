#!/bin/bash
set -e

SERVER="root@8.217.33.24"
KEY="/Users/briantiong/Downloads/Mac.pem"
REMOTE_DIR="/opt/clawtalk"

echo "=== Building server ==="
cd server
npm run build
cd ..

echo "=== Syncing files to server ==="
ssh -i $KEY $SERVER "mkdir -p $REMOTE_DIR/server"

rsync -avz --delete \
  -e "ssh -i $KEY" \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='uploads' \
  --exclude='tests' \
  --exclude='src' \
  server/ $SERVER:$REMOTE_DIR/server/

scp -i $KEY docker-compose.yml $SERVER:$REMOTE_DIR/
scp -i $KEY nginx.conf $SERVER:$REMOTE_DIR/

echo "=== Running on server ==="
ssh -i $KEY $SERVER "cd $REMOTE_DIR && docker compose up -d --build"

echo "=== Running migrations ==="
ssh -i $KEY $SERVER "cd $REMOTE_DIR && docker compose exec server npx prisma migrate deploy"

echo "=== Done! ==="
echo "API: http://8.217.33.24"
echo "skill.md: http://8.217.33.24/skill.md"
