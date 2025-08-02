#!/bin/bash

# KingCRO Mac Local AI Services Setup
# Run this on your Mac to leverage Apple Silicon GPU acceleration

set -e

echo "🍎 KingCRO Mac Local AI Services Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check system info
echo -e "${BLUE}System Information:${NC}"
system_profiler SPHardwareDataType | grep "Chip\|Memory"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✅ Homebrew is already installed${NC}"
fi

# Install Ollama for Mistral AI
if ! command -v ollama &> /dev/null; then
    echo -e "${YELLOW}Installing Ollama...${NC}"
    brew install ollama
else
    echo -e "${GREEN}✅ Ollama is already installed${NC}"
fi

# Start Ollama service
echo -e "${YELLOW}Starting Ollama service...${NC}"
brew services start ollama || echo "Ollama service already running"

# Wait for Ollama to start
sleep 5

# Pull lightweight Mistral model optimized for Apple Silicon
echo -e "${YELLOW}Downloading Mistral 7B model (this may take a few minutes)...${NC}"
ollama pull mistral:7b-instruct || echo "Model may already be available"

# Install Python and required packages for transcription
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Installing Python...${NC}"
    brew install python
else
    echo -e "${GREEN}✅ Python is already installed${NC}"
fi

# Install OpenAI Whisper with Apple Silicon optimization
echo -e "${YELLOW}Installing Whisper for transcription...${NC}"
pip3 install --upgrade openai-whisper
pip3 install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Create a simple transcription service
cat > ~/whisper_service.py << 'EOF'
#!/usr/bin/env python3
import whisper
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Load Whisper model (using 'base' for balance of speed and accuracy)
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded!")

@app.route('/v1/audio/transcriptions', methods=['POST'])
def transcribe():
    try:
        # Handle both file upload and JSON with base64
        if 'file' in request.files:
            audio_file = request.files['file']
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                audio_file.save(tmp_file.name)
                result = model.transcribe(tmp_file.name)
                os.unlink(tmp_file.name)
        elif request.json and 'audio' in request.json:
            # Handle base64 audio data
            audio_data = base64.b64decode(request.json['audio'])
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                tmp_file.write(audio_data)
                tmp_file.flush()
                result = model.transcribe(tmp_file.name)
                os.unlink(tmp_file.name)
        else:
            return jsonify({'error': 'No audio data provided'}), 400
        
        return jsonify({
            'text': result['text'].strip(),
            'confidence': 0.95,  # Whisper doesn't provide per-segment confidence, using default
            'language': result.get('language', 'en')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model': 'whisper-base'})

if __name__ == '__main__':
    print("Starting Whisper transcription service on http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=False)
EOF

chmod +x ~/whisper_service.py

# Create Ollama API wrapper for Mistral
cat > ~/mistral_service.py << 'EOF'
#!/usr/bin/env python3
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

OLLAMA_BASE_URL = "http://localhost:11434"

@app.route('/v1/completions', methods=['POST'])
def completions():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        
        # Call Ollama API
        response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json={
            "model": "mistral:7b-instruct",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "max_tokens": 2000
            }
        })
        
        if response.status_code == 200:
            result = response.json()
            return jsonify({
                'choices': [{
                    'text': result.get('response', ''),
                    'finish_reason': 'stop'
                }],
                'usage': {
                    'total_tokens': len(prompt.split()) + len(result.get('response', '').split())
                }
            })
        else:
            return jsonify({'error': 'Ollama API error'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags")
        if response.status_code == 200:
            return jsonify({'status': 'healthy', 'models': response.json()})
        else:
            return jsonify({'status': 'unhealthy', 'error': 'Ollama not responding'}), 503
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

if __name__ == '__main__':
    print("Starting Mistral service on http://localhost:8001")
    app.run(host='0.0.0.0', port=8001, debug=False)
EOF

chmod +x ~/mistral_service.py

# Install Flask for the API services
echo -e "${YELLOW}Installing Flask and dependencies...${NC}"
pip3 install flask flask-cors requests

echo ""
echo -e "${GREEN}🎉 Mac Local AI Services Setup Complete!${NC}"
echo ""
echo -e "${BLUE}To start the services, run these commands in separate terminal windows:${NC}"
echo ""
echo -e "${YELLOW}Terminal 1 - Whisper Transcription Service:${NC}"
echo "python3 ~/whisper_service.py"
echo ""
echo -e "${YELLOW}Terminal 2 - Mistral AI Service:${NC}" 
echo "python3 ~/mistral_service.py"
echo ""
echo -e "${BLUE}Services will be available at:${NC}"
echo "- Whisper (Transcription): http://localhost:8000"
echo "- Mistral (AI Enhancement): http://localhost:8001"
echo "- Ollama (Backend): http://localhost:11434"
echo ""
echo -e "${GREEN}These will connect to your Codespace API server and provide GPU-accelerated AI!${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure to update your Codespace environment variables:"
echo "VLLM_API_URL=http://localhost:8000"
echo "MISTRAL_API_URL=http://localhost:8001"
