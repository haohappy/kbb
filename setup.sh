#!/usr/bin/env bash
set -euo pipefail

# KBB - Knowledge Base Builder Setup Script
# Supports: macOS, Linux

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Status tracking
STATUS_CLAUDE=""
STATUS_NODE=""
STATUS_PYTHON=""
STATUS_MARKITDOWN=""
STATUS_KBB=""
STATUS_DRAWIO=""
STATUS_FLOWMIND=""

info()  { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⬜ $1${NC}"; }
fail()  { echo -e "${RED}❌ $1${NC}"; }

required_fail() {
  fail "$1"
  echo ""
  echo "This is a required step. Setup cannot continue."
  echo "Please fix the issue above and re-run ./setup.sh"
  exit 1
}

echo ""
echo "========================================="
echo "  KBB - Knowledge Base Builder Setup"
echo "========================================="
echo ""

# ──────────────────────────────────────────────
# Step 0: Check Claude Code CLI
# ──────────────────────────────────────────────
echo "Checking prerequisites..."

if ! command -v claude &>/dev/null; then
  required_fail "Claude Code CLI not found. Install from: https://claude.ai/download"
fi
CLAUDE_VER=$(claude --version 2>/dev/null || echo "unknown")
STATUS_CLAUDE="$CLAUDE_VER"
info "Claude Code: $CLAUDE_VER"

# ──────────────────────────────────────────────
# Step 1: Check Node.js >= 18
# ──────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  required_fail "Node.js not found. Install from: https://nodejs.org/"
fi

NODE_VER=$(node -v)
NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  required_fail "Node.js >= 18 required (found $NODE_VER). Please upgrade."
fi
STATUS_NODE="$NODE_VER"
info "Node.js: $NODE_VER"

# ──────────────────────────────────────────────
# Step 2: Detect Python >= 3.10
# ──────────────────────────────────────────────
PYTHON=""
for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$candidate" &>/dev/null; then
    PY_VER=$("$candidate" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>/dev/null || true)
    PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
    PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
    if [ "${PY_MAJOR:-0}" -ge 3 ] && [ "${PY_MINOR:-0}" -ge 10 ]; then
      PYTHON="$candidate"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  required_fail "Python >= 3.10 not found. Install from: https://www.python.org/"
fi
STATUS_PYTHON="$PYTHON ($PY_VER)"
info "Python: $PYTHON ($PY_VER)"

# ──────────────────────────────────────────────
# Step 3: Create venv and install MarkItDown
# ──────────────────────────────────────────────
if [ -d ".venv" ] && ".venv/bin/python" -c "import markitdown" &>/dev/null; then
  MIDOWN_VER=$(".venv/bin/python" -c "import importlib.metadata; print(importlib.metadata.version('markitdown'))" 2>/dev/null || echo "installed")
  STATUS_MARKITDOWN="$MIDOWN_VER (cached)"
  info "MarkItDown: $MIDOWN_VER (already installed)"
else
  echo "Creating Python virtual environment..."
  "$PYTHON" -m venv .venv

  echo "Installing MarkItDown..."
  if ! .venv/bin/pip install markitdown==0.1.5 --quiet; then
    required_fail "Failed to install markitdown. Check Python/pip setup."
  fi

  MIDOWN_VER=$(".venv/bin/python" -c "import importlib.metadata; print(importlib.metadata.version('markitdown'))" 2>/dev/null || echo "0.1.5")
  STATUS_MARKITDOWN="$MIDOWN_VER"
  info "MarkItDown: $MIDOWN_VER"
fi

# ──────────────────────────────────────────────
# Step 4: npm install && build
# ──────────────────────────────────────────────
echo "Installing Node.js dependencies..."
if ! npm install --silent 2>/dev/null; then
  required_fail "npm install failed."
fi

echo "Building KBB..."
if ! npm run build --silent 2>/dev/null; then
  required_fail "TypeScript build failed."
fi
info "KBB built successfully"

# ──────────────────────────────────────────────
# Step 5: Register KBB MCP server (idempotent)
# ──────────────────────────────────────────────
echo "Registering KBB MCP server..."
claude mcp remove kbb 2>/dev/null || true
if claude mcp add kbb -- node "$SCRIPT_DIR/dist/index.js" 2>/dev/null; then
  STATUS_KBB="registered"
  info "KBB MCP: registered"
else
  required_fail "Failed to register KBB MCP server."
fi

# ──────────────────────────────────────────────
# Step 6 (optional): Register Draw.io MCP
# ──────────────────────────────────────────────
echo ""
echo "── Optional integrations ──"
echo ""

read -p "Install Draw.io MCP for diagram generation? [Y/n] " -n 1 -r REPLY
echo ""
if [[ ! "$REPLY" =~ ^[Nn]$ ]]; then
  claude mcp remove drawio 2>/dev/null || true
  if claude mcp add drawio --transport sse https://mcp.draw.io/mcp 2>/dev/null; then
    STATUS_DRAWIO="registered"
    info "Draw.io MCP: registered"
  else
    STATUS_DRAWIO="failed"
    warn "Draw.io MCP: registration failed (optional, you can add it later)"
  fi
else
  STATUS_DRAWIO="skipped"
  warn "Draw.io MCP: skipped"
fi

# ──────────────────────────────────────────────
# Step 7 (optional): Configure FlowMind
# ──────────────────────────────────────────────
FLOWMIND_CONFIG="$HOME/.flowmind/config.json"

if [ -f "$FLOWMIND_CONFIG" ]; then
  STATUS_FLOWMIND="configured"
  info "FlowMind: already configured"
else
  read -p "Configure FlowMind for article publishing? [Y/n] " -n 1 -r REPLY
  echo ""
  if [[ ! "$REPLY" =~ ^[Nn]$ ]]; then
    read -p "FlowMind API Key: " -s FM_KEY
    echo ""
    read -p "FlowMind Base URL [https://flowmind.life/api/v1]: " FM_URL
    FM_URL="${FM_URL:-https://flowmind.life/api/v1}"

    if [ -n "$FM_KEY" ]; then
      mkdir -p "$HOME/.flowmind"
      chmod 700 "$HOME/.flowmind"
      cat > "$FLOWMIND_CONFIG" <<FMEOF
{"api_key":"$FM_KEY","base_url":"$FM_URL"}
FMEOF
      chmod 600 "$FLOWMIND_CONFIG"
      STATUS_FLOWMIND="configured"
      info "FlowMind: configured"
    else
      STATUS_FLOWMIND="skipped (no key)"
      warn "FlowMind: skipped (no API key provided)"
    fi
  else
    STATUS_FLOWMIND="skipped"
    warn "FlowMind: skipped"
  fi
fi

# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Installation Summary"
echo "========================================="
echo ""
info "Claude Code: $STATUS_CLAUDE"
info "Node.js:     $STATUS_NODE"
info "Python:      $STATUS_PYTHON"
info "MarkItDown:  $STATUS_MARKITDOWN"
info "KBB MCP:     $STATUS_KBB"

if [ "$STATUS_DRAWIO" = "registered" ]; then
  info "Draw.io MCP: $STATUS_DRAWIO"
else
  warn "Draw.io MCP: $STATUS_DRAWIO (optional)"
fi

if [ "$STATUS_FLOWMIND" = "configured" ]; then
  info "FlowMind:    $STATUS_FLOWMIND"
else
  warn "FlowMind:    $STATUS_FLOWMIND (optional)"
fi

echo ""
echo "Setup complete! Restart Claude Code to use KBB tools."
echo "Try: kbb_pipeline with a directory of documents."
echo ""
