@echo off
REM =====================================================
REM GAMING AGENT MANAGEMENT SYSTEM - QUICK SETUP SCRIPT (Windows)
REM =====================================================

echo 🎮 Welcome to Gaming Agent Management System Setup!
echo ==================================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% LSS 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node --version
    echo    Please update Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 
node --version
echo ✅ npm 
npm --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies. Please check your internet connection and try again.
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully
echo.

REM Create environment file
if not exist .env.local (
    echo 🔧 Creating environment file...
    copy env.template .env.local >nul
    echo ✅ Environment file created: .env.local
    echo    Please edit this file with your API keys and configuration
    echo.
) else (
    echo ✅ Environment file already exists: .env.local
    echo.
)

# Check if .env.local has been configured
findstr "your_gemini_api_key_here" .env.local >nul
if %errorlevel% equ 0 (
    echo ⚠️  IMPORTANT: Please configure your environment variables in .env.local
    echo    - GEMINI_API_KEY: Get from https://ai.google.dev/ (OPTIONAL - system works without it)
    echo    - VITE_SUPABASE_URL: Get from your Supabase project (REQUIRED)
    echo    - VITE_SUPABASE_ANON_KEY: Get from your Supabase project (REQUIRED)
    echo.
)

REM Check if Supabase schema exists
if exist supabase_schema.sql (
    echo 🗄️  Supabase schema file found: supabase_schema.sql
    echo    Please run this in your Supabase SQL editor to set up the database
    echo.
) else (
    echo ❌ Supabase schema file not found. Please ensure supabase_schema.sql exists.
    echo.
)

REM Build check
echo 🔨 Testing build process...
npm run build

if %errorlevel% equ 0 (
    echo ✅ Build successful! Your project is ready for development.
    echo.
) else (
    echo ❌ Build failed. Please check for errors and try again.
    echo.
)

echo 🚀 Setup Complete!
echo ==================
echo.
echo Next steps:
echo 1. Configure your .env.local file with API keys
echo 2. Set up Supabase database using supabase_schema.sql
echo 3. Run 'npm run dev' to start development server
echo 4. Visit http://localhost:5173 to see your application
echo.
echo For detailed instructions, see:
echo - README.md for project overview
echo - DEPLOYMENT.md for deployment guide
echo.
echo Happy coding! 🎉
pause
