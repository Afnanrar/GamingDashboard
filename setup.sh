#!/bin/bash

# =====================================================
# GAMING AGENT MANAGEMENT SYSTEM - QUICK SETUP SCRIPT
# =====================================================

echo "🎮 Welcome to Gaming Agent Management System Setup!"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    echo "   Please update Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo "✅ npm $(npm -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Create environment file
if [ ! -f .env.local ]; then
    echo "🔧 Creating environment file..."
    cp env.template .env.local
    echo "✅ Environment file created: .env.local"
    echo "   Please edit this file with your API keys and configuration"
    echo ""
else
    echo "✅ Environment file already exists: .env.local"
    echo ""
fi

# Check if .env.local has been configured
if grep -q "your_gemini_api_key_here" .env.local; then
    echo "⚠️  IMPORTANT: Please configure your environment variables in .env.local"
    echo "   - GEMINI_API_KEY: Get from https://ai.google.dev/ (OPTIONAL - system works without it)"
    echo "   - VITE_SUPABASE_URL: Get from your Supabase project (REQUIRED)"
    echo "   - VITE_SUPABASE_ANON_KEY: Get from your Supabase project (REQUIRED)"
    echo ""
fi

# Check if Supabase schema exists
if [ -f supabase_schema.sql ]; then
    echo "🗄️  Supabase schema file found: supabase_schema.sql"
    echo "   Please run this in your Supabase SQL editor to set up the database"
    echo ""
else
    echo "❌ Supabase schema file not found. Please ensure supabase_schema.sql exists."
    echo ""
fi

# Build check
echo "🔨 Testing build process..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Your project is ready for development."
    echo ""
else
    echo "❌ Build failed. Please check for errors and try again."
    echo ""
fi

echo "🚀 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Configure your .env.local file with API keys"
echo "2. Set up Supabase database using supabase_schema.sql"
echo "3. Run 'npm run dev' to start development server"
echo "4. Visit http://localhost:5173 to see your application"
echo ""
echo "For detailed instructions, see:"
echo "- README.md for project overview"
echo "- DEPLOYMENT.md for deployment guide"
echo ""
echo "Happy coding! 🎉"
