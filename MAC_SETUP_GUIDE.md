# KingCRO Mac Local AI Services - VS Code Setup

## Quick Start Commands for VS Code Terminal

Copy and paste these commands one by one in your VS Code terminal:

### Step 1: Install Dependencies
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install ollama python3

# Install Python packages
pip3 install flask flask-cors requests openai-whisper torch torchvision torchaudio
```

### Step 2: Start Ollama and Download Model
```bash
# Start Ollama service
brew services start ollama
sleep 5

# Download Mistral model (this will take a few minutes)
ollama pull mistral:7b-instruct
```

### Step 3: Create AI Service Files

#### Create Whisper Transcription Service
```bash
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
```

#### Create Mistral AI Service
```bash
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
```

### Step 4: Start the Services (Run in separate VS Code terminals)

#### Terminal 1 - Whisper Service:
```bash
python3 ~/whisper_service.py
```

#### Terminal 2 - Mistral Service:
```bash
python3 ~/mistral_service.py
```

### Step 5: Test Services
```bash
# Test Whisper
curl http://localhost:8000/health

# Test Mistral
curl http://localhost:8001/health

# Test Ollama
curl http://localhost:11434/api/tags
```

## Environment Variables for Codespace

Add these to your Codespace `.env` file:
```
VLLM_API_URL=http://host.docker.internal:8000
MISTRAL_API_URL=http://host.docker.internal:8001
```

## VS Code Task Configuration

Add this to your `.vscode/tasks.json`:
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Whisper Service",
            "type": "shell",
            "command": "python3",
            "args": ["~/whisper_service.py"],
            "group": "build",
            "isBackground": true,
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared",
                "showReuseMessage": true,
                "clear": false
            }
        },
        {
            "label": "Start Mistral Service", 
            "type": "shell",
            "command": "python3",
            "args": ["~/mistral_service.py"],
            "group": "build",
            "isBackground": true,
            "presentation": {
                "echo": true,
                "reveal": "always", 
                "focus": false,
                "panel": "shared",
                "showReuseMessage": true,
                "clear": false
            }
        }
    ]
}
```

## Expected Output
When working correctly, you should see:
- Whisper: `🎙️ Whisper transcription service starting on http://localhost:8000`
- Mistral: `🤖 Mistral AI service starting on http://localhost:8001`
- Both services responding to `/health` endpoints

## Troubleshooting
- If Ollama fails: `brew services restart ollama`
- If Python packages fail: `pip3 install --upgrade pip` then retry
- If ports are busy: `lsof -ti:8000,8001 | xargs kill -9`
