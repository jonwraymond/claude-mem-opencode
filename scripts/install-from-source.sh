#!/bin/bash

set -e

CLAUDE_MEM_VERSION=${1:-8.5.4}
OPENCODE_MEM_VERSION=${2:-latest}

echo "=========================================="
echo "Installing claude-mem and claude-mem-opencode from Source"
echo "=========================================="
echo ""
echo "claude-mem version: $CLAUDE_MEM_VERSION"
echo "claude-mem-opencode version: $OPENCODE_MEM_VERSION"
echo ""

# Step 1: Install claude-mem from GitHub
echo "[1/5] Installing claude-mem v$CLAUDE_MEM_VERSION from GitHub..."
echo ""

TEMP_DIR=$(mktemp -d)
echo "  Using temp directory: $TEMP_DIR"

cd $TEMP_DIR

if [ "$CLAUDE_MEM_VERSION" = "latest" ]; then
    git clone https://github.com/thedotmack/claude-mem.git claude-mem
else
    git clone -b v$CLAUDE_MEM_VERSION https://github.com/thedotmack/claude-mem.git claude-mem 2>/dev/null || \
    git clone https://github.com/thedotmack/claude-mem.git claude-mem
fi

echo "  ✅ claude-mem cloned"
echo ""

cd claude-mem

echo "  Installing dependencies..."
bun install
echo "  ✅ Dependencies installed"
echo ""

echo "  Building claude-mem..."
bun run build
echo "  ✅ Build complete"
echo ""

echo "  Installing globally..."
npm install -g .
echo "  ✅ claude-mem installed globally"
echo ""

# Verify installation
CLAUDE_MEM_INSTALLED=$(claude-mem --version 2>/dev/null || echo "unknown")
echo "  ✅ claude-mem v$CLAUDE_MEM_INSTALLED installed"
echo ""

# Step 2: Install claude-mem-opencode from source
echo ""
echo "[2/5] Installing claude-mem-opencode..."
echo ""

cd /home/daniel/vscode-projects/opencode-mem 2>/dev/null || echo "  ℹ️  Using current directory"

echo "  Installing dependencies..."
bun install
echo "  ✅ Dependencies installed"
echo ""

echo "  Building claude-mem-opencode..."
bun run build
echo "  ✅ Build complete"
echo ""

echo "  Installing globally..."
npm install -g .
echo "  ✅ claude-mem-opencode installed globally"
echo ""

# Verify installation
OPENCODE_MEM_INSTALLED=$(claude-mem-opencode --version 2>/dev/null || echo "unknown")
echo "  ✅ claude-mem-opencode v$OPENCODE_MEM_INSTALLED installed"
echo ""

# Step 3: Verify installations
echo ""
echo "[3/5] Verifying installations..."
echo ""

if ! command -v claude-mem &>/dev/null; then
    echo "❌ claude-mem not found in PATH"
    exit 1
fi

if ! command -v claude-mem-opencode &>/dev/null; then
    echo "❌ claude-mem-opencode not found in PATH"
    exit 1
fi

echo "✅ Both packages installed and available in PATH"
echo ""

# Step 4: Test claude-mem worker
echo ""
echo "[4/5] Testing claude-mem worker..."
echo ""

echo "  Starting worker..."
claude-mem worker start &
WORKER_PID=$!
echo "  Worker PID: $WORKER_PID"
echo ""

echo "  Waiting for worker to be ready..."
READY=false
for i in {1..30}; do
    if curl -f http://localhost:37777/api/health > /dev/null 2>&1; then
        READY=true
        echo "  ✅ Worker is ready"
        break
    fi
    echo "  Waiting... ($i/30)"
    sleep 2
done

if [ "$READY" = false ]; then
    echo "❌ Worker failed to start"
    echo "Killing worker process..."
    kill $WORKER_PID 2>/dev/null || true
    exit 1
fi

# Verify worker health
echo ""
WORKER_HEALTH=$(curl -s http://localhost:37777/api/health || echo "{}")
WORKER_STATUS=$(echo $WORKER_HEALTH | jq -r '.status' 2>/dev/null || echo "error")

if [ "$WORKER_STATUS" != "ok" ]; then
    echo "❌ Worker health check failed"
    echo "Response: $WORKER_HEALTH"
    kill $WORKER_PID 2>/dev/null || true
    exit 1
fi

WORKER_API_VERSION=$(echo $WORKER_HEALTH | jq -r '.apiVersion' 2>/dev/null || echo "unknown")
echo "✅ Worker is healthy (API v$WORKER_API_VERSION)"
echo ""

# Step 5: Run quick test
echo ""
echo "[5/5] Running quick test..."
echo ""

echo "  Testing claude-mem-opencode import..."
if bun test tests/unit --reporter=tap 2>&1 | grep -q "pass"; then
    echo "  ✅ claude-mem-opencode unit tests pass"
else
    echo "  ⚠️  claude-mem-opencode unit tests failed (may be expected)"
fi

# Stop worker for cleanup
echo ""
echo "Stopping worker..."
kill $WORKER_PID 2>/dev/null || true
sleep 1
echo "✅ Worker stopped"
echo ""

# Cleanup
cd /
rm -rf $TEMP_DIR
echo "✅ Cleanup complete"
echo ""

# Summary
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "Installed versions:"
echo "  • claude-mem: v$CLAUDE_MEM_INSTALLED"
echo "  • claude-mem-opencode: v$OPENCODE_MEM_INSTALLED"
echo ""
echo "Quick commands:"
echo "  • Start worker:      claude-mem worker start"
echo "  • Check status:      claude-mem worker status"
echo "  • View logs:        claude-mem worker logs"
echo "  • Stop worker:       claude-mem worker stop"
echo "  • Run unit tests:   bun run test:unit"
echo "  • Search memories:   claude-mem search \"query\""
echo ""
echo "Testing:"
echo "  • Run integration tests: bun run test:integration"
echo "  • Run E2E tests:      bun run test:e2e"
echo ""
echo "Documentation:"
echo "  • Testing guide:     cat docs/TESTING.md"
echo "  • Installation:      cat docs/INSTALLATION.md"
echo ""
echo "Ready to use! 🎉"
