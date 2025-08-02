#!/bin/bash
# Initialize Ollama with required models for Mac GPU acceleration

echo "🚀 Initializing Ollama with Mac-optimized models..."

# Start Ollama in background
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
sleep 10

# Pull models optimized for Mac
echo "📥 Downloading Mistral 7B for copywriting enhancement..."
ollama pull mistral:7b-instruct

echo "📥 Downloading CodeLlama for code generation..."
ollama pull codellama:7b-instruct

echo "📥 Downloading Llama2 for general text processing..."
ollama pull llama2:7b-chat

# Test model loading
echo "🧪 Testing model availability..."
ollama list

echo "✅ Ollama initialization complete!"

# Keep Ollama running
wait $OLLAMA_PID
