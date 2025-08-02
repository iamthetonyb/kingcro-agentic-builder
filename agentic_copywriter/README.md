# 🎙️ KingCRO™ Agentic Copywriter - Voice to Book Platform

A comprehensive platform for converting voice recordings into books with AI-powered copywriting enhancements. Built with vLLM, Voxtral, PostgreSQL, and advanced natural language processing.

## ✨ Features

### 🎤 Voice Processing
- **Real-time voice recording** directly in the browser
- **vLLM-powered transcription** using Voxtral model
- **Multi-language support** with auto-detection
- **Speaker identification** and timestamp tracking
- **High-quality audio processing** with noise reduction

### 📚 Book Generation
- **Automatic chapter organization** from transcripts
- **AI-driven content structuring** (chronological, thematic, custom)
- **Intelligent text segmentation** based on content and timing
- **Metadata preservation** for source attribution

### ✍️ Copywriting Enhancement
- **Advanced text analysis** (readability, sentiment, structure)
- **AI-powered content improvement** with reasoning
- **Grammar and style suggestions** with confidence scores
- **Natural language processing** using multiple NLP libraries
- **Context-aware editing** that preserves original meaning

### 🗄️ Data Management
- **PostgreSQL database** with comprehensive schema
- **Project organization** with transcript linking
- **Version control** for edited content
- **Audit trail** for all changes

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Interface │────│   API Server    │────│   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Recording     │    │ • Authentication│    │ • Projects      │
│ • Upload        │    │ • Transcription │    │ • Transcripts   │
│ • Analysis      │    │ • Book Gen      │    │ • Book Sections │
│ • Enhancement   │    │ • NLP Analysis  │    │ • Edits         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   vLLM Server   │
                       │                 │
                       │ • Voxtral Model │
                       │ • Transcription │
                       │ • AI Enhancement│
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- NVIDIA GPU (for vLLM)
- 8GB+ RAM
- 20GB+ disk space

### 1. Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd kingcro-agentic-builder

# Make setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

### 2. Configuration
Edit `.env` file with your settings:
```env
# Database
POSTGRES_PASSWORD=your-secure-password

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# vLLM
VLLM_API_KEY=your-vllm-api-key

# Optional: OpenAI for fallback
OPENAI_API_KEY=your-openai-key
```

### 3. Generate Authentication Token
```bash
node scripts/generate-token.js your-username
```

### 4. Access the Platform
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/health
- **vLLM Server**: http://localhost:8000

## 📖 Usage Guide

### Creating a Project
1. Open the web interface at http://localhost:3000
2. Set your JWT token in the authentication section
3. Create a new project with a descriptive name
4. The project will be ready for voice recordings

### Recording & Transcription
1. **Real-time Recording**: Click "Start Recording" to record directly
2. **File Upload**: Drag and drop audio files (WAV, MP3, M4A)
3. **Configure Options**: Set speaker ID, language, and other parameters
4. **Transcribe**: Process the audio through vLLM/Voxtral

### Book Generation
1. Select your project with transcripts
2. Set book title and structure preference
3. Click "Generate Book" to organize transcripts into chapters
4. Review the automatically created sections

### Copywriting Enhancement
1. Select a book section to analyze
2. Run analysis to get readability, sentiment, and style insights
3. Review AI-powered suggestions for improvements
4. Apply edits selectively while preserving original meaning

## � API Endpoints

### Authentication
All endpoints require Bearer token authentication:
```bash
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Projects
```bash
# Create project
POST /interview
{
  "project_name": "My Book Project",
  "description": "Voice recordings for my autobiography"
}

# List projects
GET /projects

# Get project transcripts
GET /project/:id/transcripts

# Get project book sections
GET /project/:id/book
```

#### Voice Processing
```bash
# Transcribe audio
POST /transcribe
Content-Type: multipart/form-data
- audio: <audio-file>
- project_id: <project-id>
- speaker_id: <optional>
- language: <optional>
```

#### Book Generation
```bash
# Generate book from transcripts
POST /generate-book/:project_id
{
  "title": "My Book Title",
  "structure": "automatic|chronological|thematic|custom"
}
```

#### Copywriting
```bash
# Analyze section
POST /analyze-section/:section_id

# Apply edit
POST /apply-edit/:edit_id
```

## �️ Development

### Local Development Setup
```bash
# Install dependencies
cd kingcro_agent_builder/api
npm install

# Start development server
npm run dev

# Run database migrations
docker-compose exec postgres psql -U postgres -d kingcro_agentic -f /docker-entrypoint-initdb.d/init.sql
```

### Testing
```bash
# Generate test token
node scripts/generate-token.js test-user

# Test API health
curl http://localhost:3000/health

# Test transcription (with audio file)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "audio=@test-audio.wav" \
  -F "project_id=1" \
  http://localhost:3000/transcribe
```

## 📊 Database Schema

### Core Tables
- **projects**: Project metadata and configuration
- **transcripts**: Voice transcription results with timestamps
- **book_sections**: Organized book chapters and sections
- **copywriting_edits**: Enhancement suggestions and applied changes

### Key Relationships
```sql
projects (1) → (many) transcripts
projects (1) → (many) book_sections  
book_sections (1) → (many) copywriting_edits
```

## 🔍 Monitoring & Logging

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-server
docker-compose logs -f vllm-server
docker-compose logs -f postgres
```

### Health Checks
```bash
# API Server
curl http://localhost:3000/health

# vLLM Server
curl http://localhost:8000/health

# Database
docker-compose exec postgres pg_isready -U postgres
```

## 🚨 Troubleshooting

### Common Issues

#### vLLM Server Won't Start
- **Cause**: GPU not available or insufficient memory
- **Solution**: Check NVIDIA drivers, reduce `gpu_memory_utilization` in config

#### Transcription Fails
- **Cause**: Audio format not supported or file too large
- **Solution**: Convert to WAV, reduce file size, check vLLM logs

#### Database Connection Issues
- **Cause**: PostgreSQL not ready or wrong credentials
- **Solution**: Wait for PostgreSQL to start, check DATABASE_URL

#### Memory Issues
- **Cause**: Large audio files or AI model loading
- **Solution**: Increase Docker memory limits, reduce file sizes

### Log Analysis
```bash
# Check API server errors
docker-compose logs api-server | grep ERROR

# Monitor vLLM performance
docker-compose logs vllm-server | grep "requests/sec"

# Database query performance
docker-compose exec postgres psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

## 🔒 Security Considerations

- **JWT Tokens**: Use strong secrets, rotate regularly
- **File Uploads**: Validate file types and sizes
- **API Rate Limiting**: Implement in production
- **Database**: Use connection pooling and prepared statements
- **HTTPS**: Enable SSL/TLS in production

## 🌟 Advanced Features

### Custom Model Integration
Replace vLLM configuration to use your own voice models:
```yaml
# vllm-config.yaml
model: "path/to/your/custom/model"
```

### Workflow Automation
Use the included n8n workflows for:
- Automated transcription processing
- Book generation pipelines  
- Content enhancement workflows
- Integration with external APIs

### Multi-language Support
Configure language-specific models and processing:
```javascript
// Language-specific configurations
const languageConfigs = {
  'en': { model: 'voxtral-en', confidence: 0.95 },
  'es': { model: 'voxtral-es', confidence: 0.90 },
  // ... more languages
};
```

## 📈 Performance Optimization

### Recommended Hardware
- **CPU**: 8+ cores for API server
- **GPU**: NVIDIA RTX 3080+ for vLLM
- **RAM**: 16GB+ system memory
- **Storage**: SSD with 100GB+ available

### Scaling Options
- **Horizontal**: Multiple API server instances behind load balancer
- **Vertical**: Increase GPU memory and CPU cores
- **Database**: PostgreSQL read replicas for queries
- **Storage**: Object storage (S3) for audio files

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **vLLM Team** for the excellent model serving framework
- **Voxtral** for voice transcription capabilities
- **OpenAI** for AI enhancement APIs
- **PostgreSQL** for robust data management
- **Natural.js & Compromise** for NLP processing

---

**KingCRO™ Agentic Builder** - Transforming voice into compelling written content with AI precision.
