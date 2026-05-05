# Trillion

Voice-first AI personal assistant with a holographic UI. Groq LLM + LangGraph agent + Three.js cosmic scene.

## Quick Start

```bash
cd trillion
npm install
cp .env.example .env
# Add your GROQ_API_KEY to .env
npm start
# Open http://localhost:3000
```

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | **Yes** | Free at https://console.groq.com |
| `BRAVE_API_KEY` | No | Web search — free at https://api.search.brave.com. Omit for stub. |
| `TTS_VOICE` | No | Edge TTS voice name (default: `en-US-AriaNeural`) |
| `PORT` | No | HTTP port (default: `3000`) |

## Stack

| Layer | Tech |
|-------|------|
| LLM | Groq `llama-3.3-70b-versatile` (free tier) |
| STT | Groq `whisper-large-v3` (free tier) |
| TTS | Microsoft Edge TTS via `msedge-tts` (free) |
| Agent | LangGraph.js state graph |
| Server | Express 4 + `ws` WebSocket |
| 3D | Three.js + UnrealBloomPass |

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/chat` | `{ message, history? }` | `{ text, timestamp }` |
| POST | `/api/transcribe` | `multipart: audio` | `{ text }` |
| POST | `/api/tts` | `{ text }` | `audio/mpeg` |
| GET | `/api/health` | — | status JSON |
| WS | `/ws` | — | real-time events |

## Agent Tools

- `get_datetime` — current date/time
- `web_search(query)` — Brave Search (or stub)
- `remember(key, value)` / `recall(key)` — in-memory store
- `set_reminder(text, delaySeconds)` — fires toast via WebSocket

## Frontend Files

| File | Purpose |
|------|---------|
| `public/index.html` | Full app — Three.js orb + glass UI + backend wired |
| `public/cosmic-scene.html` | Standalone orb demo with amplitude slider |
| `public/glass-shell.html` | Standalone glass UI demo |
| `public/mic-bar.html` | Standalone mic button demo |
