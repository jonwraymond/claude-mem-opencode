#!/bin/bash

set -e

echo "=========================================="
echo "Building claude-mem-opencode bundle for OpenCode"
echo "=========================================="
echo ""

# Clean previous build
echo "[1/4] Cleaning previous build..."
rm -rf dist/bundle
mkdir -p dist/bundle

# Build type definitions first (needed for bundle)
echo ""
echo "[1.5/4] Building type definitions..."
npm run build:lib

# Build bundle
echo ""
echo "[2/4] Building bundle..."
bun build src/bundle/index.ts \
    --outfile dist/bundle/claude-mem-opencode.js \
    --target node

cd ../..

# Verify bundle was created
if [ ! -f "dist/bundle/claude-mem-opencode.js" ]; then
    echo "❌ Bundle failed - output file not found"
    exit 1
fi

if [ ! -f "dist/bundle/index.js" ]; then
    echo "❌ Bundle failed - index.js symlink not found"
    exit 1
fi
    ln -s claude-mem-opencode.js index.js
    echo "Created symlink: index.js -> claude-mem-opencode.js"
fi
cd ../../..

# Verify bundle was created
if [ ! -f "dist/bundle/claude-mem-opencode.js" ]; then
    echo "❌ Bundle failed - output file not found"
    exit 1
fi

if [ ! -f "dist/bundle/index.js" ]; then
    echo "❌ Bundle failed - index.js symlink not found"
    exit 1
fi

# Copy skill files
echo ""
echo "[3/4] Copying skill files..."
mkdir -p dist/bundle/skill/operations
cp -r src/skill/* dist/bundle/skill/

# Verify skill files were copied
if [ ! -d "dist/bundle/skill" ]; then
    echo "❌ Skill files not copied"
    exit 1
fi

# Create package info
echo ""
echo "[4/4] Creating bundle info..."
cat > dist/bundle/package.json << EOF
{
  "name": "claude-mem-opencode-bundle",
  "version": "$(node -p "require('../package.json').version")",
  "description": "OpenCode integration for claude-mem (bundled)",
  "main": "./claude-mem-opencode.js",
  "files": [
    "claude-mem-opencode.js",
    "skill/"
  ]
}
EOF

# Verify package.json was created
if [ ! -f "dist/bundle/package.json" ]; then
    echo "❌ Bundle package.json not created"
    exit 1
fi

# Get file sizes
BUNDLE_SIZE=$(du -h dist/bundle/claude-mem-opencode.js | cut -f1)
TOTAL_SIZE=$(du -sh dist/bundle | cut -f1)

echo ""
echo "✅ Bundle created successfully!"
echo ""
echo "Output files:"
ls -lh dist/bundle/
echo ""
echo "Bundle statistics:"
echo "  • Main bundle: dist/bundle/claude-mem-opencode.js ($BUNDLE_SIZE)"
echo "  • Total size: $TOTAL_SIZE"
echo "  • Skill files: $(find dist/bundle/skill -type f | wc -l) files"
echo ""
echo "To integrate with OpenCode:"
echo "  1. Copy dist/bundle/* to your OpenCode project"
echo "  2. Import: import { ClaudeMemIntegration } from './claude-mem-opencode.js'"
echo "  3. Initialize: await integration.initialize()"
echo ""
echo "Or install globally (when published):"
echo "  npm install -g claude-mem-opencode"
echo ""
echo "Bundle complete! 🎉"
