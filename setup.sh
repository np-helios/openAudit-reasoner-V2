#!/bin/bash
# setup.sh — One-shot setup for OpenAudit-Reasoner v2
set -e

echo ""
echo "  ◈ OpenAudit-Reasoner v2 — Setup"
echo "  ─────────────────────────────────"
echo ""

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "✗ Python 3 not found. Install from https://python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "✗ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v ollama >/dev/null 2>&1 || { echo "✗ Ollama not found. Install from https://ollama.com"; exit 1; }

echo "✓ Python: $(python3 --version)"
echo "✓ Node:   $(node --version)"
echo "✓ Ollama: $(ollama --version 2>/dev/null || echo 'installed')"
echo ""

# Backend
echo "── Setting up backend…"
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt --quiet
if [ ! -f .env ]; then
  cp .env .env.backup 2>/dev/null || true
  echo "OLLAMA_BASE_URL=http://localhost:11434" > .env
  echo "MODEL_NAME=llama3" >> .env
fi
echo "✓ Backend ready"
cd ..

# Frontend
echo "── Setting up frontend…"
cd frontend
npm install --silent
echo "✓ Frontend ready"
cd ..

echo ""
echo "  ◈ Setup complete!"
echo ""
echo "  Start:"
echo "    1. ollama serve                              (terminal 1)"
echo "    2. cd backend && source venv/bin/activate"
echo "       uvicorn main:app --reload --port 8000    (terminal 2)"
echo "    3. cd frontend && npm run dev               (terminal 3)"
echo ""
echo "  Open: http://localhost:3000"
echo ""
