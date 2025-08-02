# KingCRO Agentic Copywriter - AI Development Guidelines

## Evolving Learning System Principles

### Code Intelligence Workflows
1. **Always Read Before Writing**: Use `read_file` extensively to understand existing code patterns and context
2. **Historical Context Awareness**: Maintain understanding of previous changes and their reasoning
3. **Progressive Enhancement**: Build upon existing functionality rather than replacing wholesale
4. **Pattern Recognition**: Identify and reuse successful architectural patterns across the codebase

### Robust Development Practices
- **Context Gathering**: Use `semantic_search`, `grep_search`, and `file_search` to understand codebase before changes
- **Error Investigation**: Use `get_errors` and `test_failure` tools to diagnose issues before proposing solutions
- **Change Validation**: Always verify changes work by testing endpoints and checking server logs
- **Documentation Updates**: Update this file and other documentation as patterns evolve

### MCP Integration Capabilities
- **Repository Analysis**: Use GitHub tools for cross-repository learning and pattern identification
- **API Integration**: Leverage external APIs for enhanced functionality (transcription, AI enhancement)
- **Extension Ecosystem**: Integrate VS Code extensions that enhance development workflow

## Project Architecture

This is a **voice-to-book platform** focused on transforming voice recordings into polished written content using AI-powered copywriting enhancements.

### Core Data Flow
```
Browser Audio → Socket.IO → vLLM/Voxtral → PostgreSQL → Mistral AI Enhancement
```

## Essential Patterns & Conventions

### ES Module Setup (Critical)
All Node.js files use ES modules (`"type": "module"` in package.json). Always use:
```javascript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
Never use CommonJS `__dirname` directly - it will cause ReferenceError.

### Authentication Flow
- JWT Bearer tokens required for all protected endpoints
- Generate test tokens with: `node agentic_copywriter/api/generate-token.js test-user`
- Auth header: `Authorization: Bearer <token>`
- Tokens validated in middleware with `jwt.verify(token, JWT_SECRET)`

### Real-time Voice Architecture
- **Socket.IO** handles live recording streams (no auth on connection)
- **MediaRecorder API** captures 3-second audio chunks as base64
- **VoxtralTranscriptionService** processes via vLLM at `VLLM_API_URL/v1/audio/transcriptions`
- Live transcripts display with confidence scores and timestamps

### Database Schema (PostgreSQL)
Key relationships:
```sql
projects (1:many) transcripts
projects (1:many) book_sections  
book_sections (1:many) copywriting_edits
```
Always use parameterized queries: `pool.query('SELECT * FROM projects WHERE id = $1', [id])`

### Service Classes Pattern
- `MistralCopywritingService` - AI content enhancement with structured thinking
- `VoxtralTranscriptionService` - Voice-to-text via vLLM 
- `BookGenerationService` - Organize transcripts into chapters
Services instantiated once globally: `const transcriptionService = new VoxtralTranscriptionService();`

## Development Workflows

### Starting the Platform
```bash
# 1. Start PostgreSQL database
docker-compose up -d postgres

# 2. Start the API server
cd agentic_copywriter/api && node server.js

# 3. Access web interface at http://localhost:3000
```

### Testing Strategy
- **Playwright** for E2E tests in `agentic_copywriter/api/tests/`
- Three test suites: `api.spec.js`, `web-interface.spec.js`, `realtime.spec.js`
- Real-time tests mock Socket.IO connections and MediaRecorder API

### Docker Services
```bash
docker-compose up -d postgres  # PostgreSQL only (vLLM/Mistral optional for local dev)
```
- PostgreSQL on :5432 with schema auto-loaded from `agentic_copywriter/db/schema.sql`
- vLLM server on :8000 for Voxtral transcription (optional - can use fallback)
- Mistral server on :8001 for copywriting enhancement (optional - can use fallback)

## Critical Integration Points

### vLLM Transcription API
```javascript
// POST to VLLM_API_URL/v1/audio/transcriptions
formData.append('file', audioBuffer, 'audio.wav');
formData.append('model', 'microsoft/SpeechT5-voxtral');
```

### Socket.IO Real-time Events
```javascript
socket.emit('start-transcription', { project_id, token });
socket.emit('audio-chunk', { audio: base64Audio, project_id, timestamp });
socket.on('transcription-result', (data) => displayLiveTranscription(data));
```

### Mistral AI Enhancement
```javascript
// POST to MISTRAL_API_URL/v1/completions
{
  model: 'mistralai/Mistral-7B-Instruct-v0.1',
  prompt: `<thinking>${analysis}</thinking>\n${content}`,
}
```

## File Structure Conventions

### Static File Serving
Web interface at `agentic_copywriter/public/index.html` served via:
```javascript
app.use(express.static(path.join(__dirname, '../public')));
```

### Audio Upload Handling
- **multer** middleware with 25MB limit for file uploads
- Base64 chunks for real-time, file uploads for batch processing
- Audio stored in `uploads/` directory with UUID filenames

### Error Handling Pattern
```javascript
try {
  const result = await someService.method();
  res.json({ success: true, data: result });
} catch (error) {
  console.error('Service error:', error);
  res.status(500).json({ error: 'Operation failed', details: error.message });
}
```

## Environment Configuration

Required `.env` variables:
```env
JWT_SECRET=your-jwt-secret
VLLM_API_URL=http://localhost:8000  
MISTRAL_API_URL=http://localhost:8001
DATABASE_URL=postgresql://postgres:password@localhost:5432/kingcro_agentic
```

## Common Debugging Commands

```bash
# Check server status
curl http://localhost:3000/health

# Generate test token
node agentic_copywriter/api/generate-token.js test-user

# Test transcription endpoint
curl -X POST -H "Authorization: Bearer <token>" \
  -F "audio=@test.wav" -F "project_id=1" \
  http://localhost:3000/transcribe

# View database
docker-compose exec postgres psql -U postgres -d kingcro_agentic
```

## Key Integration Gotchas

- **MediaRecorder compatibility**: Check `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')`
- **CORS issues**: Origins must be explicitly allowed for Socket.IO connections  
- **Database connection**: PostgreSQL must be running before starting the API server
- **File paths**: Always use `path.join(__dirname, '../public')` for cross-platform compatibility
- **Static file serving**: ES modules require proper `__dirname` setup with `fileURLToPath(import.meta.url)`

## Evolutionary Development Patterns

### Before Any Code Changes
1. **Read existing implementations**: Use `read_file` to understand current patterns
2. **Search for similar functionality**: Use `semantic_search` and `grep_search` to find related code
3. **Check for errors**: Use `get_errors` to identify existing issues before making changes
4. **Understand dependencies**: Trace imports and service connections

### Change Implementation Strategy
1. **Incremental updates**: Make small, testable changes rather than large rewrites
2. **Preserve working functionality**: Build upon existing code rather than replacing
3. **Maintain consistency**: Follow established patterns for error handling, logging, and structure
4. **Test immediately**: Verify each change works before proceeding

### Knowledge Retention
- **Document discoveries**: Update this file when finding new patterns or solutions
- **Track successful approaches**: Note what works well for future reference
- **Record common pitfalls**: Document issues encountered and their solutions
- **Maintain context**: Keep awareness of why decisions were made

### Integration with External Tools
- **GitHub API**: Use for cross-repository pattern analysis and learning
- **VS Code Extensions**: Leverage marketplace for enhanced development capabilities
- **MCP Servers**: Integrate Model Context Protocol for enhanced AI assistance
- **API Documentation**: Reference external service docs for proper integration
