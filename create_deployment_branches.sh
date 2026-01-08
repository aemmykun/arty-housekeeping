#!/bin/bash
# create_deployment_branches.sh
# Script to create deployment branches for ARTY™ Housekeeping Management System

echo "🚀 Creating ARTY™ Deployment Branches"
echo "======================================"
echo ""

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"
echo ""

# Confirm with user
read -p "This will create 4 deployment branches. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Create web deployment branch
echo "📦 Creating deploy/web branch..."
git checkout -b deploy/web 2>/dev/null || git checkout deploy/web
git push -u origin deploy/web || echo "⚠️  Branch may already exist on remote"
echo "✅ deploy/web created"
echo ""

# Create bubble deployment branch
echo "🫧 Creating deploy/bubble branch..."
git checkout $CURRENT_BRANCH
git checkout -b deploy/bubble 2>/dev/null || git checkout deploy/bubble
git push -u origin deploy/bubble || echo "⚠️  Branch may already exist on remote"
echo "✅ deploy/bubble created"
echo ""

# Create flutter deployment branch
echo "📱 Creating deploy/flutter branch..."
git checkout $CURRENT_BRANCH
git checkout -b deploy/flutter 2>/dev/null || git checkout deploy/flutter
git push -u origin deploy/flutter || echo "⚠️  Branch may already exist on remote"
echo "✅ deploy/flutter created"
echo ""

# Create docker deployment branch
echo "🐳 Creating deploy/docker branch..."
git checkout $CURRENT_BRANCH
git checkout -b deploy/docker 2>/dev/null || git checkout deploy/docker
git push -u origin deploy/docker || echo "⚠️  Branch may already exist on remote"
echo "✅ deploy/docker created"
echo ""

# Return to original branch
echo "🔙 Returning to $CURRENT_BRANCH..."
git checkout $CURRENT_BRANCH
echo ""

echo "🎉 All deployment branches created successfully!"
echo ""
echo "Branches created:"
echo "  ✓ deploy/web      - Web application deployment"
echo "  ✓ deploy/bubble   - Bubble.io no-code deployment"
echo "  ✓ deploy/flutter  - Flutter mobile app deployment"
echo "  ✓ deploy/docker   - Docker containerized deployment"
echo ""
echo "📖 See BRANCH_STRUCTURE.md for usage details"
echo ""
echo "To switch to a deployment branch:"
echo "  git checkout deploy/web"
echo "  git checkout deploy/bubble"
echo "  git checkout deploy/flutter"
echo "  git checkout deploy/docker"
