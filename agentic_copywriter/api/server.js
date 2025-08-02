import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import natural from 'natural';
import nlp from 'compromise';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const VLLM_API_URL = process.env.VLLM_API_URL || 'http://localhost:8000';
const MISTRAL_API_URL = process.env.MISTRAL_API_URL || 'http://localhost:8001';

// Enhanced copywriting service with Mistral 7B integration
class MistralCopywritingService {
  constructor() {
    this.mistralApiUrl = MISTRAL_API_URL;
  }

  async generateWithMistral(prompt, temperature = 0.7, maxTokens = 1000) {
    try {
      const response = await fetch(`${this.mistralApiUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/Mistral-7B-Instruct-v0.1',
          prompt: prompt,
          temperature: temperature,
          max_tokens: maxTokens,
          stop: ['<|endoftext|>']
        })
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].text.trim();
    } catch (error) {
      console.error('Mistral API error:', error);
      throw error;
    }
  }

  async enhanceContentWithThinking(text, context = {}) {
    const thinkingPrompt = `
<thinking>
I need to analyze this text for copywriting improvements. Let me think through this:

1. Content Analysis:
   - What is the main message?
   - What is the tone and style?
   - Who is the target audience?
   - What are the strengths and weaknesses?

2. Improvement Opportunities:
   - Clarity and readability
   - Engagement and emotional impact
   - Structure and flow
   - Grammar and style
   - Call-to-action effectiveness

3. Preservation Requirements:
   - Keep the original meaning intact
   - Maintain the author's voice
   - Preserve key facts and information
   - Respect the intended tone

Let me analyze this text:
"${text}"

Analysis:
- Main message: [analyzing the core message]
- Tone: [identifying tone and style]
- Audience: [considering target audience]
- Strengths: [identifying strong points]
- Areas for improvement: [noting improvement opportunities]

Now I'll provide specific, actionable suggestions while preserving the original intent.
</thinking>

As a professional copywriting editor, analyze this text and provide specific improvement suggestions while preserving the original meaning and author's voice:

TEXT TO ANALYZE:
"${text}"

CONTEXT: ${JSON.stringify(context)}

Please provide:
1. **Readability Analysis**: Current readability level and suggestions for improvement
2. **Engagement Opportunities**: Ways to make the content more compelling
3. **Structure Improvements**: Better organization or flow suggestions
4. **Style Enhancements**: Grammar, word choice, and clarity improvements
5. **Preserved Elements**: What should remain unchanged to maintain authenticity

Format your response as structured analysis with specific examples and suggestions.`;

    try {
      const analysis = await this.generateWithMistral(thinkingPrompt, 0.3, 1500);
      
      const enhancementPrompt = `
Based on this analysis:
${analysis}

Now provide 3-5 specific, actionable edits for this text while maintaining the original meaning:
"${text}"

Format as:
EDIT 1: [specific change]
REASONING: [why this improves the text]
CONFIDENCE: [high/medium/low]

EDIT 2: [specific change]
REASONING: [why this improves the text]
CONFIDENCE: [high/medium/low]

And so on...`;

      const enhancements = await this.generateWithMistral(enhancementPrompt, 0.4, 1000);
      
      return {
        original_text: text,
        analysis: analysis,
        suggested_enhancements: enhancements,
        timestamp: new Date().toISOString(),
        model_used: 'mistral-7b-instruct',
        thinking_process: 'Applied structured thinking analysis before generating suggestions'
      };
    } catch (error) {
      console.error('Enhancement error:', error);
      throw error;
    }
  }

  async improveReadability(text) {
    const prompt = `
<thinking>
I need to improve the readability of this text while preserving its meaning. Let me consider:
1. Sentence length and complexity
2. Word choice (simple vs complex)
3. Paragraph structure
4. Flow and transitions
5. Active vs passive voice
</thinking>

Improve the readability of this text while preserving its exact meaning and tone:

"${text}"

Requirements:
- Maintain all key information
- Keep the author's voice and style
- Improve clarity without oversimplifying
- Fix any grammar issues
- Make it more engaging to read

Provide the improved version:`;

    try {
      const improved = await this.generateWithMistral(prompt, 0.2, 1000);
      return {
        original: text,
        improved: improved,
        model: 'mistral-7b-instruct'
      };
    } catch (error) {
      console.error('Readability improvement error:', error);
      throw error;
    }
  }
}

// Postgres (works out‑of‑the‑box on Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize server
async function initializeServer() {
  // Ensure uploads directory exists
  await fs.mkdir('uploads', { recursive: true });

/* ----------- Authentication Middleware ----------- */
const authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/, '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' });
  }
};

/* ----------- Health and Database Check ----------- */
app.get('/health', (req, res) => res.send('OK'));

app.get('/health/status', async (req, res) => {
  const status = {
    server: 'running',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    vllm: 'unknown',
    mistral: 'unknown'
  };

  // Check database
  try {
    await pool.query('SELECT 1');
    status.database = 'connected';
  } catch (error) {
    status.database = 'disconnected';
    status.database_error = getDatabaseErrorMessage(error).details;
  }

  // Check vLLM (optional)
  try {
    const vllmResponse = await fetch(`${VLLM_API_URL}/health`, { timeout: 2000 });
    status.vllm = vllmResponse.ok ? 'connected' : 'error';
  } catch (error) {
    status.vllm = 'disconnected';
  }

  // Check Mistral (optional)  
  try {
    const mistralResponse = await fetch(`${MISTRAL_API_URL}/health`, { timeout: 2000 });
    status.mistral = mistralResponse.ok ? 'connected' : 'error';
  } catch (error) {
    status.mistral = 'disconnected';
  }

  res.json(status);
});

app.get('/health/database', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      status: 'connected',
      timestamp: result.rows[0].current_time,
      database_version: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1],
      connection_info: {
        host: process.env.DATABASE_URL ? 'from DATABASE_URL' : 'localhost',
        port: 5432,
        database: 'kingcro_agentic'
      }
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    const dbError = getDatabaseErrorMessage(error);
    res.status(503).json({
      status: 'disconnected',
      ...dbError,
      connection_info: {
        host: process.env.DATABASE_URL ? 'from DATABASE_URL' : 'localhost',
        port: 5432,
        database: 'kingcro_agentic'
      }
    });
  }
});

/* ----------- Authentication Middleware ----------- */

/* ----------- Token Generation (for testing) ----------- */
app.post('/generate-token', async (req, res) => {
  try {
    const { user_id = 'anonymous', expires_in = '24h' } = req.body;
    
    const tokenPayload = {
      user_id: user_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expires_in === '1h' ? 3600 : 86400)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);
    
    res.json({ 
      token,
      expires_in,
      user_id
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/* ----------- vLLM Voice Transcription Service ----------- */
class VoxtralTranscriptionService {
  constructor() {
    this.apiUrl = VLLM_API_URL;
    this.model = process.env.VOXTRAL_MODEL || 'mistralai/Voxtral-Mini-3B-2507';  // Use specific Mini model
  }

  async transcribeAudio(audioBuffer, options = {}) {
    try {
      // Convert buffer to base64 for the service
      const base64Audio = audioBuffer.toString('base64');
      
      const payload = {
        audio: base64Audio,
        model: this.model,  // Always use Mini model - no Small option
        temperature: 0.0, // Always 0.0 for transcription accuracy
        language: options.language || 'auto',
        response_format: 'json'
      };
      
      console.log(`Transcribing with Voxtral Mini model: ${payload.model}`);

      const response = await fetch(`${this.apiUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VLLM_API_KEY || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Voxtral API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      return {
        text: result.text,
        confidence: result.confidence || 0.95,
        language: result.language || 'auto',
        duration: result.duration,
        model_used: payload.model
      };
    } catch (error) {
      console.error('Voxtral transcription error:', error);
      throw error;
    }
  }

  async transcribeWithUnderstanding(audioBuffer, question = null, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.wav');
      formData.append('model', this.model); // Use Mini model consistently
      formData.append('response_format', 'json');
      
      if (question) {
        formData.append('prompt', question);
      }
      
      if (options.language) formData.append('language', options.language);
      formData.append('temperature', options.temperature || 0.0); // Use 0.0 for transcription, 0.3 only for understanding

      console.log(`Using Voxtral Mini for audio understanding: ${this.model}`);

      const response = await fetch(`${this.apiUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${process.env.VLLM_API_KEY || ''}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Voxtral understanding error: ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voxtral understanding error:', error);
      throw error;
    }
  }
}

/* ----------- Copywriting Enhancement Service ----------- */
class CopywritingService {
  constructor() {
    this.sentiment = natural.SentimentAnalyzer;
    this.stemmer = natural.PorterStemmer;
  }

  analyzeText(text) {
    const doc = nlp(text);
    
    return {
      wordCount: doc.terms().length,
      sentences: doc.sentences().length,
      paragraphs: doc.paragraphs().length,
      readability: this.calculateReadability(text),
      sentiment: this.analyzeSentiment(text),
      keyPhrases: this.extractKeyPhrases(doc),
      suggestions: this.generateSuggestions(doc)
    };
  }

  calculateReadability(text) {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Simple readability score (higher is more complex)
    return Math.round(avgWordsPerSentence * 10) / 10;
  }

  analyzeSentiment(text) {
    const tokens = natural.WordTokenizer.tokenize(text);
    const stemmed = tokens.map(token => this.stemmer.stem(token.toLowerCase()));
    const score = natural.SentimentAnalyzer.getSentiment(stemmed, this.stemmer, 'afinn');
    
    return {
      score: Math.round(score * 100) / 100,
      classification: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
    };
  }

  extractKeyPhrases(doc) {
    return doc.nouns().out('array').slice(0, 10);
  }

  generateSuggestions(doc) {
    const suggestions = [];
    
    // Check for passive voice
    const passiveVoice = doc.has('#Passive');
    if (passiveVoice) {
      suggestions.push({
        type: 'style',
        issue: 'passive_voice',
        message: 'Consider using active voice for more engaging writing'
      });
    }

    // Check sentence length
    const sentences = doc.sentences();
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.terms().length;
      if (wordCount > 25) {
        suggestions.push({
          type: 'clarity',
          issue: 'long_sentence',
          message: `Sentence ${index + 1} is quite long (${wordCount} words). Consider breaking it down.`,
          position: index
        });
      }
    });

    return suggestions;
  }

  async enhanceWithAI(text, context = {}) {
    try {
      const prompt = `
        Please improve the following text while maintaining its original meaning and style as an expert copywriter:
        
        Context: ${context.purpose || 'General improvement'}
        Target audience: ${context.audience || 'General readers'}
        
        Original text:
        ${text}
        
        Please provide:
        1. An improved version that maintains the original voice and intent
        2. Specific changes made with explanations
        3. Brief reasoning for each change focusing on readability and engagement
        
        Keep the response concise and focused on practical improvements.
      `;

      const response = await fetch(`${VLLM_API_URL}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VLLM_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: 'voxtral',
          prompt: prompt,
          max_tokens: 800,
          temperature: 0.3,
          stop: ['\n\n\n']
        })
      });

      if (!response.ok) {
        throw new Error(`vLLM API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Parse the response and structure it
      const enhancedText = result.choices[0].text.trim();
      
      return {
        improved_text: enhancedText,
        changes: ['AI-enhanced content for better readability and engagement'],
        reasoning: 'Applied copywriting best practices while preserving original voice',
        confidence: 0.85
      };
    } catch (error) {
      console.error('AI enhancement error:', error);
      return {
        improved_text: text,
        changes: ['Enhancement unavailable - original text preserved'],
        reasoning: 'AI service temporarily unavailable',
        confidence: 0.0
      };
    }
  }
}

const transcriptionService = new VoxtralTranscriptionService();
const copywritingService = new CopywritingService();

/* ----------- Database Error Helper ----------- */
function getDatabaseErrorMessage(error) {
  if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
    return {
      error: 'Database connection failed',
      details: 'PostgreSQL database is not running. Please start the database with: docker-compose up -d postgres',
      code: 'DB_CONNECTION_REFUSED'
    };
  }
  
  if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
    return {
      error: 'Database host not found',
      details: 'Cannot resolve database hostname. Check DATABASE_URL environment variable.',
      code: 'DB_HOST_NOT_FOUND'
    };
  }
  
  if (error.code === '28P01' || error.message.includes('password authentication failed')) {
    return {
      error: 'Database authentication failed',
      details: 'Invalid database credentials. Check your username and password.',
      code: 'DB_AUTH_FAILED'
    };
  }
  
  if (error.code === '3D000' || error.message.includes('database') && error.message.includes('does not exist')) {
    return {
      error: 'Database does not exist',
      details: 'The specified database was not found. Make sure the database is created.',
      code: 'DB_NOT_FOUND'
    };
  }
  
  // Generic database error
  return {
    error: 'Database operation failed',
    details: error.message || 'Unknown database error occurred',
    code: 'DB_GENERIC_ERROR'
  };
}

/* ----------- Original Interview Endpoint ----------- */
app.post('/interview', authenticateToken, async (req, res) => {
  const payload = req.body || {};
  if (!payload.project_name) {
    return res.status(400).json({ error: 'project_name required' });
  }

  try {
    // 1. store basic project meta
    const { rows: [project] } = await pool.query(
      `INSERT INTO projects (project_name, raw_request)
       VALUES ($1,$2) RETURNING *`,
      [payload.project_name, payload]
    );

    // 2. Kick n8n workflow
    if (process.env.N8N_WEBHOOK_URL) {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, project_id: project.id })
      });
    }
    return res.json({ stored: true, project_id: project.id });
  } catch (err) {
    console.error('Interview endpoint error:', err);
    const dbError = getDatabaseErrorMessage(err);
    return res.status(500).json(dbError);
  }
});

/* ----------- Voice Transcription Endpoints ----------- */
app.post('/transcribe', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { project_id, speaker_id, timestamp_start, timestamp_end } = req.body;
    
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Read the uploaded audio file
    const audioBuffer = await fs.readFile(req.file.path);
    
    // Transcribe using vLLM
    const transcriptionResult = await transcriptionService.transcribeAudio(audioBuffer, {
      language: req.body.language,
      temperature: parseFloat(req.body.temperature) || 0.0
    });

    // Store in database
    const { rows: [transcript] } = await pool.query(
      `INSERT INTO transcripts (project_id, audio_file_path, transcript_text, confidence_score, speaker_id, timestamp_start, timestamp_end, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        project_id,
        req.file.path,
        transcriptionResult.text,
        transcriptionResult.confidence || null,
        speaker_id || null,
        parseFloat(timestamp_start) || null,
        parseFloat(timestamp_end) || null,
        JSON.stringify(transcriptionResult)
      ]
    );

    res.json({
      success: true,
      transcript_id: transcript.id,
      text: transcriptionResult.text,
      confidence: transcriptionResult.confidence
    });

  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed', details: error.message });
  }
});

/* ----------- Book Generation Endpoints ----------- */
app.post('/generate-book/:project_id', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.params;
    const { title, structure } = req.body;

    // Get all transcripts for the project
    const { rows: transcripts } = await pool.query(
      'SELECT * FROM transcripts WHERE project_id = $1 ORDER BY timestamp_start ASC',
      [project_id]
    );

    if (transcripts.length === 0) {
      return res.status(404).json({ error: 'No transcripts found for this project' });
    }

    // Organize transcripts into chapters/sections
    const sections = await this.organizeIntoSections(transcripts, structure);
    
    // Create book sections in database
    const createdSections = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const { rows: [bookSection] } = await pool.query(
        `INSERT INTO book_sections (project_id, section_title, section_order, original_content, processed_content)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [project_id, section.title, i + 1, section.content, section.content]
      );
      createdSections.push(bookSection);
    }

    res.json({
      success: true,
      book_id: project_id,
      sections: createdSections.length,
      sections_created: createdSections.map(s => ({ id: s.id, title: s.section_title }))
    });

  } catch (error) {
    console.error('Book generation error:', error);
    res.status(500).json({ error: 'Book generation failed', details: error.message });
  }
});

/* ----------- Copywriting Enhancement Endpoints ----------- */
app.post('/analyze-section/:section_id', authenticateToken, async (req, res) => {
  try {
    const { section_id } = req.params;
    
    // Get the section
    const { rows: [section] } = await pool.query(
      'SELECT * FROM book_sections WHERE id = $1',
      [section_id]
    );

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Analyze the text
    const analysis = copywritingService.analyzeText(section.original_content);
    
    // Get AI-powered enhancements
    const aiEnhancement = await copywritingService.enhanceWithAI(
      section.original_content,
      { purpose: 'book_chapter', audience: 'general_readers' }
    );

    // Store suggestions in database
    if (analysis.suggestions.length > 0) {
      for (const suggestion of analysis.suggestions) {
        await pool.query(
          `INSERT INTO copywriting_edits (section_id, edit_type, original_text, suggested_text, reasoning, confidence_score)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            section_id,
            suggestion.type,
            section.original_content,
            suggestion.message,
            suggestion.message,
            0.8
          ]
        );
      }
    }

    res.json({
      success: true,
      analysis: analysis,
      ai_enhancement: aiEnhancement,
      suggestions_stored: analysis.suggestions.length
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

app.post('/apply-edit/:edit_id', authenticateToken, async (req, res) => {
  try {
    const { edit_id } = req.params;
    
    // Mark edit as applied
    const { rows: [edit] } = await pool.query(
      'UPDATE copywriting_edits SET applied = true WHERE id = $1 RETURNING *',
      [edit_id]
    );

    if (!edit) {
      return res.status(404).json({ error: 'Edit not found' });
    }

    // Update the section content
    await pool.query(
      'UPDATE book_sections SET processed_content = $1, updated_at = now() WHERE id = $2',
      [edit.suggested_text, edit.section_id]
    );

    res.json({ success: true, edit_applied: edit.id });

  } catch (error) {
    console.error('Apply edit error:', error);
    res.status(500).json({ error: 'Failed to apply edit', details: error.message });
  }
});

/* ----------- Data Retrieval Endpoints ----------- */
app.get('/projects', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT p.*, COUNT(t.id) as transcript_count FROM projects p LEFT JOIN transcripts t ON p.id = t.project_id GROUP BY p.id ORDER BY p.created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Get projects error:', error);
    const dbError = getDatabaseErrorMessage(error);
    res.status(500).json(dbError);
  }
});

app.get('/project/:id/transcripts', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM transcripts WHERE project_id = $1 ORDER BY timestamp_start ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get transcripts error:', error);
    res.status(500).json({ error: 'Failed to fetch transcripts' });
  }
});

app.get('/project/:id/book', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM book_sections WHERE project_id = $1 ORDER BY section_order ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get book sections error:', error);
    res.status(500).json({ error: 'Failed to fetch book sections' });
  }
});

/* ----------- New Mistral 7B Copywriting Endpoints ----------- */
const mistralService = new MistralCopywritingService();

// Enhanced content analysis with thinking process
app.post('/mistral/enhance-content', authenticateToken, async (req, res) => {
  try {
    const { text, context = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const enhancement = await mistralService.enhanceContentWithThinking(text, context);
    res.json(enhancement);
  } catch (error) {
    console.error('Mistral content enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance content with Mistral' });
  }
});

// Improve readability specifically
app.post('/mistral/improve-readability', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const improvement = await mistralService.improveReadability(text);
    res.json(improvement);
  } catch (error) {
    console.error('Mistral readability improvement error:', error);
    res.status(500).json({ error: 'Failed to improve readability with Mistral' });
  }
});

// Analyze and enhance book section with Mistral
app.post('/mistral/enhance-section/:section_id', authenticateToken, async (req, res) => {
  try {
    const sectionId = req.params.section_id;
    const { enhancement_type = 'full' } = req.body;

    // Get the section content
    const { rows } = await pool.query(
      'SELECT * FROM book_sections WHERE id = $1',
      [sectionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const section = rows[0];
    const context = {
      section_title: section.title,
      section_type: section.section_type,
      project_id: section.project_id
    };

    let result;
    if (enhancement_type === 'readability') {
      result = await mistralService.improveReadability(section.content);
    } else {
      result = await mistralService.enhanceContentWithThinking(section.content, context);
    }

    // Store the enhancement suggestion
    const { rows: editRows } = await pool.query(
      `INSERT INTO copywriting_edits 
       (section_id, original_text, suggested_text, edit_type, confidence_score, reasoning, model_used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [
        sectionId,
        section.content,
        enhancement_type === 'readability' ? result.improved : result.suggested_enhancements,
        enhancement_type,
        0.85, // Default confidence for Mistral
        enhancement_type === 'readability' ? 'Readability improvement' : result.analysis,
        'mistral-7b-instruct'
      ]
    );

    res.json({
      section: section,
      enhancement: result,
      edit_record: editRows[0]
    });
  } catch (error) {
    console.error('Mistral section enhancement error:', error);
    res.status(500).json({ error: 'Failed to enhance section with Mistral' });
  }
});

/* ----------- Helper Functions ----------- */
async function organizeIntoSections(transcripts, structure = 'automatic') {
  // Simple automatic sectioning based on time gaps or content breaks
  const sections = [];
  let currentSection = { title: 'Introduction', content: '' };
  let sectionCount = 1;

  for (let i = 0; i < transcripts.length; i++) {
    const transcript = transcripts[i];
    
    // Add content to current section
    currentSection.content += transcript.transcript_text + '\n\n';
    
    // Check if we should start a new section (based on time gap or content length)
    const nextTranscript = transcripts[i + 1];
    const timeGap = nextTranscript ? 
      (nextTranscript.timestamp_start - transcript.timestamp_end) : 0;
    
    const shouldCreateNewSection = 
      timeGap > 300 || // 5-minute gap
      currentSection.content.length > 5000 || // Long section
      (nextTranscript && i % 10 === 9); // Every 10 transcripts

    if (shouldCreateNewSection && nextTranscript) {
      sections.push({ ...currentSection });
      sectionCount++;
      currentSection = {
        title: `Chapter ${sectionCount}`,
        content: ''
      };
    }
  }
  
  // Add the last section
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return sections;
}

// Initialize server
const server = app.listen(PORT, () => console.log(`Agentic Copywriter with vLLM on :${PORT}`));

// Socket.IO server for real-time communication (no auth required for connection)
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  allowEIO3: true
});

// Real-time voice processing with Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected for real-time transcription:', socket.id);
  
  let audioBuffer = [];
  let currentProject = null;
  
  // Initialize socket-specific session data
  socket.currentProject = null;
  socket.audioBuffer = [];

  socket.on('start-transcription', async (data) => {
    try {
      const { project_id, token } = data;
      
      // Verify authentication
      const decoded = jwt.verify(token, JWT_SECRET);
      
      socket.currentProject = project_id;
      socket.audioBuffer = [];
      
      socket.emit('transcription-ready', { 
        status: 'ready', 
        project_id: socket.currentProject 
      });
      
      console.log(`Started transcription session for project ${project_id} on socket ${socket.id}`);
    } catch (error) {
      console.error('Start transcription error:', error);
      socket.emit('transcription-error', { error: 'Authentication failed' });
    }
  });
  
  socket.on('audio-chunk', async (audioData) => {
    if (!socket.currentProject) {
      socket.emit('transcription-error', { error: 'No active transcription session' });
      return;
    }
    
    try {
      console.log('Received audio data:', typeof audioData, audioData);
      
      // Extract base64 audio from the data object
      const base64Audio = audioData.audio || audioData;
      
      if (!base64Audio) {
        console.log('No audio data found in:', audioData);
        socket.emit('transcription-error', { error: 'No audio data received' });
        return;
      }
      
      console.log('Base64 audio type:', typeof base64Audio, 'Length:', base64Audio.length);
      
      // Convert base64 audio to buffer
      const audioBuffer = Buffer.from(base64Audio, 'base64');
      
      console.log(`Processing audio chunk: ${audioBuffer.length} bytes for project ${socket.currentProject}`);
      
      // Check if vLLM service is available
      let transcriptionResult;
      try {
        transcriptionResult = await transcriptionService.transcribeAudio(audioBuffer, {
          language: 'auto',
          temperature: 0.0
        });
      } catch (transcriptionError) {
        console.log('vLLM service unavailable, using fallback transcription');
        // Fallback: Create a more useful mock transcription result for testing
        const audioSizeKB = Math.round(audioBuffer.length / 1024);
        transcriptionResult = {
          text: `[Audio chunk captured: ${audioSizeKB}KB at ${new Date().toLocaleTimeString()}] - vLLM transcription service is offline. Audio data received successfully and would be processed when service is available.`,
          confidence: 0.7
        };
      }
      
      if (transcriptionResult.text && transcriptionResult.text.trim()) {
        // Store in database
        const { rows: [transcript] } = await pool.query(
          `INSERT INTO transcripts (project_id, transcript_text, confidence_score, processed_at)
           VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [
            socket.currentProject,
            transcriptionResult.text,
            transcriptionResult.confidence || 0.95
          ]
        );
        
        // Send real-time result to client
        socket.emit('transcription-result', {
          transcript_id: transcript.id,
          text: transcriptionResult.text,
          confidence: transcriptionResult.confidence || 0.95,
          timestamp: new Date().toISOString(),
          project_id: socket.currentProject
        });
        
        console.log(`Real-time transcription: ${transcriptionResult.text.substring(0, 100)}...`);
      } else {
        // Send back a processing indicator if no text was extracted
        socket.emit('transcription-result', {
          text: '[Processing audio...]',
          confidence: 0.0,
          timestamp: new Date().toISOString(),
          project_id: socket.currentProject,
          processing: true
        });
      }
    } catch (error) {
      console.error('Real-time transcription error:', error);
      socket.emit('transcription-error', { 
        error: 'Transcription failed', 
        details: error.message 
      });
    }
  });
  
  socket.on('stop-transcription', () => {
    console.log(`Stopping transcription session for project ${socket.currentProject} on socket ${socket.id}`);
    socket.currentProject = null;
    socket.audioBuffer = [];
    socket.emit('transcription-stopped', { status: 'stopped' });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socket.currentProject = null;
    socket.audioBuffer = [];
  });
});

} // End of initializeServer function

// Initialize and start the server
initializeServer().catch(console.error);
