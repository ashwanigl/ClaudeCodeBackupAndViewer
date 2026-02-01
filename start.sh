#!/bin/bash

echo "========================================"
echo "  Claude Conversation Viewer"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    echo ""
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

echo "🚀 Starting server..."
echo "📱 Open http://localhost:3000 in your browser"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

node server.js
