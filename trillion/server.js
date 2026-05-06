import 'dotenv/config';
import { createServer } from 'http';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import express from 'express';
import Groq from 'groq-sdk';
import multer from 'multer';
import { WebSocketServer } from 'ws';

import { runAgent } from './agent.js';
import { reminderEmitter } from './tools/memory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// TTS is handled client-side via the Web Speech API (window.speechSynthesis).
// No server-side TTS dependency needed — 100% free, built into every browser.

// ── Express ────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(join(__dirname, 'public')));

// POST /api/chat — text in, agent response out
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  try {
    const text = await runAgent(message, history ?? []);
    res.json({ text, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[/api/chat]', err);
    res.status(500).json({ error: 'Agent error', detail: err.message });
  }
});

// POST /api/transcribe — audio blob → Whisper → text
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'audio file required' });
  try {
    const { buffer, mimetype, originalname } = req.file;
    const audioFile = new File([buffer], originalname ?? 'audio.webm', { type: mimetype ?? 'audio/webm' });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
      response_format: 'text',
    });
    res.json({ text: typeof transcription === 'string' ? transcription : transcription.text });
  } catch (err) {
    console.error('[/api/transcribe]', err);
    res.status(500).json({ error: 'Transcription error', detail: err.message });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    groq: !!process.env.GROQ_API_KEY,
    brave: !!process.env.BRAVE_API_KEY,
    tts: 'client-side Web Speech API (free)',
    uptime: process.uptime(),
  });
});

// ── HTTP + WebSocket server ────────────────────────────────────────────────

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

wss.on('connection', ws => {
  clients.add(ws);
  ws.send(JSON.stringify({ type: 'connected', ts: Date.now() }));

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    }
    // amplitude events are fire-and-forget (no server processing needed)
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

// Wire reminder EventEmitter → WebSocket broadcast
reminderEmitter.on('fire', payload => {
  console.log(`[REMINDER] ${payload.text}`);
  broadcast({ type: 'reminder_fire', ...payload });
});

const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
  console.log(`\nTrillion is running →  http://localhost:${PORT}`);
  console.log(`WebSocket           →  ws://localhost:${PORT}/ws`);
  console.log(`Groq API key:          ${process.env.GROQ_API_KEY ? 'set ✓' : 'MISSING ✗'}`);
  console.log(`Brave Search key:      ${process.env.BRAVE_API_KEY ? 'set ✓' : 'not set (stub mode)'}\n`);
});
