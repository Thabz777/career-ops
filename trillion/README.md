# Trillion

Voice-first AI personal assistant with a holographic UI. **100% free-tier — no paid subscriptions required.**

## Quick Start

```bash
cd trillion
npm install
cp .env.example .env
# Add your free GROQ_API_KEY (sign up at https://console.groq.com)
npm start
# Open http://localhost:3000
```

## Free Tier Stack

| Service | What it does | Cost | Key needed? |
|---------|-------------|------|-------------|
| **Groq** | LLM (`llama-3.3-70b-versatile`) + STT (`whisper-large-v3`) | Free tier | Yes — free account |
| **Brave Search** | Web search tool | Free tier (2k/mo) | Optional — stubs without it |
| **Web Speech API** | Text-to-speech | Free, built into every browser | None |
| **LangGraph.js + all npm deps** | Agent + server | Open source | None |

One free sign-up gets you everything that matters.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | **Yes** | Free at https://console.groq.com |
| `BRAVE_API_KEY` | No | Free web search (2k/mo). Omit for stub mode. |
| `PORT` | No | HTTP port (default: `3000`) |

## API

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/chat` | `{ message, history? }` | `{ text, timestamp }` |
| POST | `/api/transcribe` | `multipart: audio` | `{ text }` |
| GET | `/api/health` | — | status JSON |
| WS | `/ws` | — | real-time events (reminders, ping/pong) |

## Agent Tools

| Tool | What it does |
|------|-------------|
| `get_datetime` | Current date/time |
| `web_search(query)` | Brave Search or stub |
| `remember(key, value)` / `recall(key)` | In-memory store |
| `set_reminder(text, delaySeconds)` | Fires toast via WebSocket |

## Frontend Files

| File | Purpose |
|------|---------|
| `public/index.html` | Full app — Three.js orb + glass UI + voice wired to backend |
| `public/cosmic-scene.html` | Standalone orb demo (dev amplitude slider) |
| `public/glass-shell.html` | Standalone glass UI shell |
| `public/mic-bar.html` | Standalone mic button with amplitude ring |
