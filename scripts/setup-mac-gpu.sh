#!/bin/bash
# Mac GPU Setup Script for KingCRO Agentic Copywriter

set -e

echo "🍎 Setting up KingCRO Agentic Copywriter with Mac GPU acceleration..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS. Please run on your Mac."
    exit 1
fi

# Check for required tools
echo "🔍 Checking requirements..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop for Mac."
    echo "🔗 Download from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "✅ Docker found"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker Compose found"

# Detect Mac hardware
echo "🔍 Detecting Mac hardware..."
CHIP=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Unknown")
echo "🖥️  CPU: $CHIP"

if [[ "$CHIP" == *"Apple"* ]]; then
    echo "🚀 Apple Silicon detected - excellent for AI workloads!"
    export DOCKER_DEFAULT_PLATFORM=linux/arm64
    PLATFORM="--platform linux/arm64"
else
    echo "💻 Intel Mac detected - using x86_64 images"
    export DOCKER_DEFAULT_PLATFORM=linux/amd64
    PLATFORM="--platform linux/amd64"
fi

# Copy Mac-specific environment
echo "📄 Setting up Mac-optimized configuration..."
cp .env.mac .env

# Start PostgreSQL first
echo "🐘 Starting PostgreSQL database..."
docker-compose -f docker-compose.mac.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to initialize..."
sleep 10

# Initialize database schema
echo "🗄️  Initializing database schema..."
docker-compose -f docker-compose.mac.yml exec -T postgres psql -U postgres -d kingcro_agentic < agentic_copywriter/db/schema.sql || true

# Start Whisper for speech-to-text
echo "🎤 Starting Whisper ASR service..."
docker-compose -f docker-compose.mac.yml up -d whisper-server

# Start Ollama for text generation
echo "🤖 Starting Ollama for AI text generation..."
docker-compose -f docker-compose.mac.yml up -d ollama

# Wait for services to be ready
echo "⏳ Waiting for AI services to initialize (this may take several minutes)..."
sleep 30

# Test services
echo "🧪 Testing service connectivity..."

# Test PostgreSQL
if docker-compose -f docker-compose.mac.yml exec postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "✅ PostgreSQL ready"
else
    echo "❌ PostgreSQL not responding"
fi

# Test Whisper
if curl -s http://localhost:9000/ > /dev/null 2>&1; then
    echo "✅ Whisper ASR ready"
else
    echo "⚠️  Whisper ASR still starting up..."
fi

# Test Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama ready"
else
    echo "⚠️  Ollama still downloading models..."
fi

echo ""
echo "🎉 Mac GPU setup complete!"
echo ""
echo "🔗 Services running:"
echo "   • PostgreSQL: localhost:5432"
echo "   • Whisper ASR: http://localhost:9000"
echo "   • Ollama: http://localhost:11434"
echo ""
echo "🚀 Next steps:"
echo "   1. In your dev container, update the API server configuration"
echo "   2. Point the services to your Mac's IP address"
echo "   3. Start the Node.js API server in the dev container"
echo ""
echo "💡 Your Mac IP address: $(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 'Check Network Preferences')"
echo ""
echo "📊 Monitor with: docker-compose -f docker-compose.mac.yml logs -f"
