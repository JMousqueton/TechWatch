#!/bin/bash
# Launch Techwatch backend and frontend

# Set project root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Backend
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$ROOT_DIR/venv"
BACKEND_PORT=8001

# Frontend
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_PORT=8080

# Start backend
cd "$BACKEND_DIR"
echo "[Backend] Activating venv and starting FastAPI on port $BACKEND_PORT..."
source "$VENV_DIR/bin/activate"
nohup python -m uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT > "$ROOT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "[Backend] PID: $BACKEND_PID"

# Start frontend (simple Python HTTP server)
cd "$FRONTEND_DIR"
echo "[Frontend] Starting static server on port $FRONTEND_PORT..."
nohup python3 -m http.server $FRONTEND_PORT > "$ROOT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "[Frontend] PID: $FRONTEND_PID"

cd "$ROOT_DIR"
echo "---"
echo "Backend running at: http://localhost:$BACKEND_PORT"
echo "Frontend running at: http://localhost:$FRONTEND_PORT"
echo "Logs: $ROOT_DIR/backend.log, $ROOT_DIR/frontend.log"
echo "---"
sleep 3
open -a "Google Chrome" http://localhost:$FRONTEND_PORT
