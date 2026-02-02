#!/bin/bash

# AR Inspection Platform - Development Setup Script

set -e

echo "🚀 Setting up AR Inspection Platform for development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Create necessary directories if they don't exist
echo "📁 Creating project directories..."
mkdir -p backend/src/routes
mkdir -p backend/src/middleware
mkdir -p backend/src/services
mkdir -p backend/src/database
mkdir -p web-client/src/components
mkdir -p web-client/src/contexts
mkdir -p web-client/src/pages
mkdir -p web-client/src/utils
mkdir -p mobile-app/src/components
mkdir -p mobile-app/src/contexts
mkdir -p mobile-app/src/screens
mkdir -p mobile-app/src/services
mkdir -p mobile-app/src/utils
mkdir -p shared/src
mkdir -p logs

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install workspace dependencies
echo "📦 Installing workspace dependencies..."
npm install --workspaces

# Create environment files if they don't exist
echo "⚙️ Setting up environment files..."

# Backend environment
if [ ! -f backend/.env ]; then
    cat > backend/.env << EOF
NODE_ENV=development
PORT=3000
DB_HOST=postgres-dev
DB_PORT=5432
DB_NAME=ar_inspection_dev
DB_USER=dev
DB_PASSWORD=devpassword
REDIS_HOST=redis-dev
REDIS_PORT=6379
JWT_SECRET=dev_jwt_secret_$(openssl rand -hex 32)
CORS_ORIGINS=http://localhost:3001,http://localhost:19006
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_SERVERS=turn:turn.arinspection.com:3478
TURN_USERNAME=turn_user
TURN_PASSWORD=turn_password
EOF
    echo "✅ Created backend/.env"
fi

# Web client environment
if [ ! -f web-client/.env ]; then
    cat > web-client/.env << EOF
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
NODE_ENV=development
EOF
    echo "✅ Created web-client/.env"
fi

# Mobile app environment
if [ ! -f mobile-app/.env ]; then
    cat > mobile-app/.env << EOF
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000
NODE_ENV=development
EOF
    echo "✅ Created mobile-app/.env"
fi

# Create uploads directory for backend
mkdir -p backend/uploads

echo "🐳 Setting up Docker environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker for development."
    echo "💡 You can still run the app locally with 'npm run dev:backend', 'npm run dev:web'"
else
    echo "✅ Docker version: $(docker --version)"
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose."
        echo "💡 You can still run Docker manually with the provided Dockerfiles"
    else
        echo "✅ Docker Compose version: $(docker-compose --version)"
        
        # Start Docker services
        echo "🚀 Starting Docker services..."
        docker-compose up -d
        
        # Wait a moment for services to be ready
        echo "⏳ Waiting for services to start..."
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            echo "✅ Docker services are running!"
            echo ""
            echo "🌐 Development Environment URLs:"
            echo "   Backend API: http://localhost:3000"
            echo "   Web Client: http://localhost:3001"
            echo "   PostgreSQL: localhost:5432 (user: dev, password: devpassword)"
            echo "   Redis: localhost:6379"
            echo ""
            echo "📝 Development Commands:"
            echo "   npm run dev              - Start all services"
            echo "   npm run dev:backend       - Start backend only"
            echo "   npm run dev:web          - Start web client only"
            echo "   npm run docker:logs        - View Docker logs"
            echo "   npm run docker:down        - Stop Docker services"
            echo "   npm run db:reset          - Reset database"
            echo ""
            echo "💡 IntelliJ Setup:"
            echo "   Open the project root directory in IntelliJ IDEA"
            echo "   Follow INTELLIJ_SETUP.md for configuration"
        else
            echo "❌ Docker services failed to start. Check logs with 'npm run docker:logs'"
        fi
    fi
fi

echo "🎉 Setup complete!"
echo ""
echo "📖 For IntelliJ IDEA setup, see: INTELLIJ_SETUP.md"
echo "📖 For project documentation, see: README.md"
echo ""