#!/usr/bin/env bash
set -euo pipefail

# KBB - Knowledge Base Builder Setup Script
# Supports: macOS, Linux
# Idempotent: re-running only performs steps that aren't already done.

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Status tracking
STATUS_CLAUDE=""
STATUS_NODE=""
STATUS_PYTHON=""
STATUS_MARKITDOWN=""
STATUS_BUILD=""
STATUS_KBB=""
STATUS_SKILL=""
STATUS_PERMS=""
STATUS_DRAWIO=""
STATUS_FLOWMIND=""

info()  { echo -e "${GREEN}✅ $1${NC}"; }
skip()  { echo -e "${GRAY}✅ $1 (already done)${NC}"; }
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
  STATUS_MARKITDOWN="$MIDOWN_VER"
  skip "MarkItDown: $MIDOWN_VER"
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
if [ -d "node_modules" ] && [ -d "dist" ] && [ -f "dist/index.js" ]; then
  STATUS_BUILD="up to date"
  skip "KBB build: up to date"
else
  echo "Installing Node.js dependencies..."
  if ! npm install --silent 2>/dev/null; then
    required_fail "npm install failed."
  fi

  echo "Building KBB..."
  if ! npm run build --silent 2>/dev/null; then
    required_fail "TypeScript build failed."
  fi
  STATUS_BUILD="built"
  info "KBB built successfully"
fi

# ──────────────────────────────────────────────
# Step 5: Register KBB MCP server (idempotent)
# ──────────────────────────────────────────────
# Check if already registered by looking at claude mcp list output
KBB_REGISTERED=false
if claude mcp list 2>/dev/null | grep -q "kbb"; then
  KBB_REGISTERED=true
fi

if [ "$KBB_REGISTERED" = true ]; then
  STATUS_KBB="registered"
  skip "KBB MCP: registered"
else
  echo "Registering KBB MCP server..."
  claude mcp remove kbb 2>/dev/null || true
  if claude mcp add kbb -- node "$SCRIPT_DIR/dist/index.js" 2>/dev/null; then
    STATUS_KBB="registered"
    info "KBB MCP: registered"
  else
    required_fail "Failed to register KBB MCP server."
  fi
fi

# ──────────────────────────────────────────────
# Step 6: Install /kbb skill
# ──────────────────────────────────────────────
SKILL_DIR="$HOME/.claude/skills/kbb"
SKILL_SRC="$SCRIPT_DIR/skill/SKILL.md"

if [ -f "$SKILL_DIR/SKILL.md" ] && cmp -s "$SKILL_SRC" "$SKILL_DIR/SKILL.md" 2>/dev/null; then
  STATUS_SKILL="installed"
  skip "/kbb skill: installed"
else
  echo "Installing /kbb skill..."
  mkdir -p "$SKILL_DIR"
  cp "$SKILL_SRC" "$SKILL_DIR/SKILL.md" 2>/dev/null
  if [ -f "$SKILL_DIR/SKILL.md" ]; then
    STATUS_SKILL="installed"
    info "/kbb skill: installed"
  else
    STATUS_SKILL="failed"
    warn "/kbb skill: installation failed (you can copy skill/SKILL.md to ~/.claude/skills/kbb/ manually)"
  fi
fi

# ──────────────────────────────────────────────
# Step 6.5: Configure auto-allow permissions
# ──────────────────────────────────────────────
SETTINGS_FILE="$HOME/.claude/settings.json"
PERMS_NEEDED=false

# Quick check: are all kbb permissions already present?
if [ -f "$SETTINGS_FILE" ] && command -v python3 &>/dev/null; then
  PERMS_NEEDED=$(python3 -c "
import json
try:
    with open('$SETTINGS_FILE') as f:
        s = json.load(f)
    allow = s.get('permissions', {}).get('allow', [])
    needed = ['mcp__kbb__kbb_config','mcp__kbb__kbb_research','mcp__kbb__kbb_ingest',
              'mcp__kbb__kbb_extract','mcp__kbb__kbb_pipeline','mcp__kbb__kbb_export_diagram',
              'mcp__kbb__kbb_publish','mcp__kbb__kbb_upload_image','mcp__kbb__kbb_list',
              'mcp__drawio__create_diagram']
    missing = [p for p in needed if p not in allow]
    print('true' if missing else 'false')
except:
    print('true')
" 2>/dev/null || echo "true")
else
  PERMS_NEEDED="true"
fi

if [ "$PERMS_NEEDED" = "false" ]; then
  STATUS_PERMS="configured"
  skip "Tool permissions: configured"
elif command -v python3 &>/dev/null; then
  echo "Configuring tool permissions..."
  python3 -c "
import json, os

settings_file = '$SETTINGS_FILE'
new_perms = [
  'mcp__kbb__kbb_config','mcp__kbb__kbb_research','mcp__kbb__kbb_ingest',
  'mcp__kbb__kbb_extract','mcp__kbb__kbb_pipeline','mcp__kbb__kbb_export_diagram',
  'mcp__kbb__kbb_publish','mcp__kbb__kbb_upload_image','mcp__kbb__kbb_list',
  'mcp__drawio__create_diagram'
]

settings = {}
if os.path.exists(settings_file):
    try:
        with open(settings_file) as f:
            settings = json.load(f)
    except:
        pass

perms = settings.get('permissions', {})
allow = perms.get('allow', [])
for p in new_perms:
    if p not in allow:
        allow.append(p)
perms['allow'] = allow
settings['permissions'] = perms

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)
"
  STATUS_PERMS="configured"
  info "Tool permissions: configured (auto-allow all kbb tools)"
else
  STATUS_PERMS="skipped"
  warn "Tool permissions: skipped (python3 not available for JSON merge)"
fi

# ──────────────────────────────────────────────
# Step 7 (optional): Register Draw.io MCP
# ──────────────────────────────────────────────
DRAWIO_REGISTERED=false
if claude mcp list 2>/dev/null | grep -q "drawio"; then
  DRAWIO_REGISTERED=true
fi

if [ "$DRAWIO_REGISTERED" = true ]; then
  STATUS_DRAWIO="registered"
  skip "Draw.io MCP: registered"
else
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
fi

# ──────────────────────────────────────────────
# Step 8 (optional): Configure FlowMind
# ──────────────────────────────────────────────
FLOWMIND_CONFIG="$HOME/.flowmind/config.json"

if [ -f "$FLOWMIND_CONFIG" ]; then
  STATUS_FLOWMIND="configured"
  skip "FlowMind: configured"
else
  if [ "$DRAWIO_REGISTERED" = true ]; then
    # Draw.io was already done, need to print the optional header
    echo ""
    echo "── Optional integrations ──"
    echo ""
  fi
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
info "KBB build:   $STATUS_BUILD"
info "KBB MCP:     $STATUS_KBB"
info "/kbb skill:  $STATUS_SKILL"
info "Permissions: $STATUS_PERMS"

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
echo "Setup complete! Restart Claude Code to use KBB."
echo ""
echo "Try:"
echo "  /kbb ~/path/to/documents your subject"
echo "  /kbb your subject --auto-share"
echo ""
