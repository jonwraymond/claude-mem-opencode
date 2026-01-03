#!/bin/bash

set -e

echo "=========================================="
echo "Removing claude-mem and claude-mem-opencode"
echo "=========================================="
echo ""

echo "[1/3] Uninstalling claude-mem..."
npm uninstall -g claude-mem 2>/dev/null || echo "  ℹ️  claude-mem not installed"
npm uninstall -g @thedotmack/claude-mem 2>/dev/null || echo "  ℹ️  @thedotmack/claude-mem not installed"

echo ""
echo "[2/3] Uninstalling claude-mem-opencode..."
npm uninstall -g claude-mem-opencode 2>/dev/null || echo "  ℹ️  claude-mem-opencode not installed"

echo ""
echo "[3/3] Verifying removal..."
INSTALLED_CLAUDE=$(npm list -g --depth=0 2>/dev/null | grep -E "claude-mem|opencode" || echo "")
if [ -z "$INSTALLED_CLAUDE" ]; then
    echo "✅ All packages removed successfully"
else
    echo "⚠️  Some packages still installed:"
    echo "$INSTALLED_CLAUDE"
    echo ""
    echo "Run: npm list -g | grep -E 'claude-mem|opencode'"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Cleanup complete!"
echo "=========================================="
echo ""
echo "All npm packages have been removed."
echo ""
echo "To install from source:"
echo "  bash scripts/install-from-source.sh"
echo ""
echo "Or install from npm (when published):"
echo "  npm install -g claude-mem-opencode"
