#!/bin/bash

# Network Topology Development Startup Script
# This script starts the Angular frontend in development mode

set -e  # Exit on any error

echo "🚀 Starting Network Topology Development Environment"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20.17+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

# Display versions
echo "📋 Environment Information:"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo ""

# Navigate to frontend directory
echo "📁 Navigating to frontend directory..."
cd frontend

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if Angular CLI is available locally or globally
if ! npx ng version &> /dev/null; then
    echo "⚠️  Angular CLI not found. Installing locally..."
    npm install @angular/cli@18 --save-dev
fi

echo ""
echo "🔧 Angular CLI Information:"
npx ng version --skip-git 2>/dev/null || echo "Angular CLI ready"

echo ""
echo "🌟 Starting Angular development server..."
echo "📱 The application will be available at: http://localhost:4200"
echo "🔄 The app will automatically reload when you make changes"
echo ""
echo "To stop the server, press Ctrl+C"
echo ""

# Start the development server
npm run start
