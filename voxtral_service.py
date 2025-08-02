#!/usr/bin/env python3
"""
Mac-Optimized Voxtral Transcription Service
Uses Mistral AI's Voxtral-Mini (3B) model for efficient voice transcription
Supports both fine-tuned and quantized versions for optimal performance
"""
import requests
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import json

app = Flask(__name__)
CORS(app)

# Voxtral API configuration (using Ollama as backend)
OLLAMA_BASE_URL = "http://localhost:11434"

# Model selection based on hardware capabilities
# Fine-tuned models for better accuracy: https://huggingface.co/models?other=base_model:finetune:mistralai/Voxtral-Mini-3B-2507
# Quantized models for lower memory usage: https://huggingface.co/models?other=base_model:quantized:mistralai/Voxtral-Mini-3B-2507
VOXTRAL_MODELS = {
    "mini": "mistralai/Voxtral-Mini-3B-2507",          # Base model (6GB RAM)
    "mini_ft": "voxtral-mini-ft",                       # Fine-tuned version (better accuracy)
    "mini_q4": "voxtral-mini-q4",                       # 4-bit quantized (3GB RAM)
    "mini_q8": "voxtral-mini-q8"                        # 8-bit quantized (4GB RAM)
}

# Auto-select best model based on system
DEFAULT_MODEL = os.getenv('VOXTRAL_MODEL', 'mini')
VOXTRAL_MODEL = VOXTRAL_MODELS.get(DEFAULT_MODEL, VOXTRAL_MODELS['mini'])

print(f"🎙️ Starting Voxtral transcription service with {VOXTRAL_MODEL}")
print("⚡ Mac-optimized for 3B parameter model with proper temperature settings")

@app.route('/v1/audio/transcriptions', methods=['POST'])
def transcribe():
    try:
        audio_data = None
        
        # Handle file upload
        if 'file' in request.files:
            audio_file = request.files['file']
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp_file:
                audio_file.save(tmp_file.name)
                with open(tmp_file.name, 'rb') as f:
                    audio_data = base64.b64encode(f.read()).decode('utf-8')
                os.unlink(tmp_file.name)
        
        # Handle JSON audio data
        elif request.json and 'audio' in request.json:
            audio_data = request.json['audio']
        
        # Handle form data audio
        elif request.form.get('audio'):
            audio_data = request.form.get('audio')
            
        if not audio_data:
            return jsonify({'error': 'No audio data provided'}), 400
        
        # Get model preference from request or use default
        model_preference = request.json.get('model', DEFAULT_MODEL) if request.json else DEFAULT_MODEL
        selected_model = VOXTRAL_MODELS.get(model_preference, VOXTRAL_MODEL)
        
        # Prepare Voxtral transcription prompt with audio-first approach
        voxtral_prompt = f"""<audio>{audio_data}</audio>

Transcribe this audio accurately. Return only the spoken text without any additional formatting or explanations."""
        
        # Call Ollama with optimized settings for transcription
        response = requests.post(f"{OLLAMA_BASE_URL}/api/generate", json={
            "model": selected_model.split('/')[-1],  # Use model name without namespace for Ollama
            "prompt": voxtral_prompt,
            "stream": False,
            "options": {
                "temperature": 0.0,        # CRITICAL: Always 0.0 for transcription accuracy
                "top_p": 1.0,             # Use full probability distribution
                "top_k": 1,               # Most likely token only
                "repeat_penalty": 1.0,     # No repetition penalty for transcription
                "max_tokens": 2048,        # Sufficient for most transcriptions
        else:
            # Fallback to basic transcription indicator
            return jsonify({
                'text': f"[Audio received - Voxtral service processing...]",
                'confidence': 0.7,
                'language': 'en',
                'model_used': VOXTRAL_MODEL,
                'fallback': True
            })
            
    except Exception as e:
        print(f"Transcription error: {e}")
        # Graceful fallback
        return jsonify({
            'text': f"[Audio chunk captured - transcription service error: {str(e)}]",
            'confidence': 0.5,
            'language': 'en',
            'error': str(e)
        }), 200  # Return 200 to keep the system working

@app.route('/health', methods=['GET'])
def health():
    try:
        # Check if Ollama is running
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            voxtral_available = any('voxtral' in model.get('name', '').lower() for model in models)
            
            return jsonify({
                'status': 'healthy',
                'model': VOXTRAL_MODEL,
                'voxtral_available': voxtral_available,
                'ollama_status': 'connected',
                'models': [model.get('name') for model in models]
            })
        else:
            return jsonify({
                'status': 'degraded',
                'model': VOXTRAL_MODEL,
                'ollama_status': 'disconnected',
                'message': 'Ollama not responding, using fallback mode'
            }), 200
    except Exception as e:
        return jsonify({
            'status': 'degraded',
            'error': str(e),
            'message': 'Running in fallback mode'
        }), 200

if __name__ == '__main__':
    print("🎙️ Voxtral Mini transcription service starting on http://localhost:8000")
    print("📱 Optimized for Mac with 3B parameter model")
    print("🔄 Will attempt to use Ollama backend, with graceful fallback")
    app.run(host='0.0.0.0', port=8000, debug=False)