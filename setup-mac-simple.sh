#!/bin/bash

# 🍎 KingCRO Mac AI Services - One-Click Setup
# Run this script in your Mac terminal

echo "🍎 Setting up KingCRO AI Services on Mac..."

# Install dependencies
echo "📦 Installing dependencies..."
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

brew install ollama python3
pip3 install flask flask-cors requests openai-whisper torch torchvision torchaudio

# Start Ollama and download model
echo "🤖 Setting up Mistral AI..."
brew services start ollama
sleep 5
ollama pull mistral:7b-instruct

# Create service files (same as above but automated)
echo "⚙️ Creating service files..."

# Whisper service
cat > ~/whisper_service.py << 'EOF'
#!/usr/bin/env python3
import whisper
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os

app = Flask(__name__)
CORS(app)

print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded!")

@app.route('/v1/audio/transcriptions', methods=['POST'])
def transcribe():
    try:
        if 'file' in request.files:
            audio_file = request.files['file']
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                audio_file.save(tmp_file.name)
                result = model.transcribe(tmp_file.name)
                os.unlink(tmp_file.name)
        elif request.json and 'audio' in request.json:
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
            'confidence': 0.95,
            'language': result.get('language', 'en')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'model': 'whisper-base'})

if __name__ == '__main__':
    print("🎙️ Whisper transcription service starting on http://localhost:8000")
    app.run(host='0.0.0.0', port=8000, debug=False)
EOF

# Mistral service
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
    print("🤖 Mistral AI service starting on http://localhost:8001")
    app.run(host='0.0.0.0', port=8001, debug=False)
EOF

chmod +x ~/whisper_service.py ~/mistral_service.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the AI services, run these commands in separate terminals:"
echo ""
echo "Terminal 1:"
echo "python3 ~/whisper_service.py"
echo ""
echo "Terminal 2:"
echo "python3 ~/mistral_service.py"
echo ""
echo "🔗 Services will be available at:"
echo "- Whisper (Transcription): http://localhost:8000"
echo "- Mistral (AI Enhancement): http://localhost:8001"
echo ""
echo "💡 Add these to your Codespace .env file:"
echo "VLLM_API_URL=http://host.docker.internal:8000"
echo "MISTRAL_API_URL=http://host.docker.internal:8001"
