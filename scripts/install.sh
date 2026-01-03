#!/bin/bash

set -e

VERSION=${1:-latest}

echo "=========================================="
echo "claude-mem-opencode Installation"
echo "=========================================="
echo ""

# Check if claude-mem is installed
echo "[1/5] Checking claude-mem installation..."
if ! command -v claude-mem &> /dev/null; then
    echo "⚠️  claude-mem is not installed globally."
    echo "    Install with: bash scripts/install-from-source.sh"
    echo "    Or continue without claude-mem (memory features will be disabled)"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    CLAUDE_MEM_VERSION=$(claude-mem --version 2>/dev/null || echo "unknown")
    echo "✅ claude-mem v$CLAUDE_MEM_VERSION found"
fi

# Install claude-mem-opencode globally
echo ""
echo "[2/5] Installing claude-mem-opencode v$VERSION..."
npm install -g claude-mem-opencode@$VERSION

# Verify installation
echo ""
echo "[3/5] Verifying installation..."
if ! command -v claude-mem-opencode &> /dev/null; then
    echo "❌ Installation failed"
    exit 1
fi
echo "✅ claude-mem-opencode installed successfully"

# Print next steps
echo ""
echo "[4/5] Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Start claude-mem worker: claude-mem worker start"
echo "  2. Use in OpenCode: (see README.md for integration instructions)"
echo ""
echo "Documentation: https://github.com/mc303/claude-mem-opencode"
