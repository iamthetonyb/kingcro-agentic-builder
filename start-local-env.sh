#!/bin/bash

echo "🚀 Starting KingCRO Agentic Copywriter Local Environment"
echo "=================================================="

# Set environment variables
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
export JWT_SECRET=${JWT_SECRET:-kingcro-jwt-secret-2025}
export VLLM_API_KEY=${VLLM_API_KEY:-vllm-secret}

echo "📦 Starting core services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️ Initializing database schema..."
docker-compose exec -T postgres psql -U postgres -d kingcro_agentic < agentic_copywriter/db/schema.sql || echo "Schema already loaded"

echo "🤖 Starting AI services (vLLM, Mistral)..."
docker-compose up -d vllm-server mistral-server

echo "⏳ Waiting for AI services to initialize..."
sleep 30

echo "🎭 Pulling and starting Mistral model..."
docker-compose exec mistral-server ollama pull mistral:7b-instruct-q4_0

echo "✅ All services started! Health check:"
echo "📊 Database: $(curl -s http://localhost:3000/health/database 2>/dev/null || echo 'Not ready')"
echo "🗣️ vLLM: $(curl -s http://localhost:8000/health 2>/dev/null || echo 'Not ready')"
echo "🧠 Mistral: $(curl -s http://localhost:8001/api/tags 2>/dev/null || echo 'Not ready')"

echo ""
echo "🌐 Access points:"
echo "   • Web Interface: http://localhost:3000"
echo "   • vLLM API: http://localhost:8000"
echo "   • Mistral API: http://localhost:8001"
echo "   • PostgreSQL: localhost:5432"
echo ""
echo "🔑 Generate auth token with:"
echo "   cd agentic_copywriter/api && node generate-token.js your-username"
echo ""
echo "🎙️ Ready for voice-to-book transcription!"
