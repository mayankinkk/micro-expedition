# micro-expedition — Hacktoberfest 2026 Week 1: Touch Grass

**One screen, 30 seconds, then go outside.**

A local-first micro-expedition agent. You tell it how much time you have (15–60 min), it checks weather + sunset and a local open model (Gemma via Ollama) generates **one small, specific outdoor mission** instead of “go for a walk” — then goes quiet. The screen is the shortest part.

> Challenge prompt: *Build something with open-source AI at its core that gets people off the screen and into the world.*

- **Entry:** `micro-expedition/` — `npm run dev` at `http://localhost:5173/`
- **Challenge hub:** https://dev.to/hacktoberfest
- **Dates:** Oct 05–11, 2026

### Why this one wins the prompt

- **Not crowded:** The prompt lists *bird ID, garden planner, route builder* — those will be flooded. A *mission generator* with a *short-screen-time philosophy* is a different angle.
- **Real “why open” story:** Your location, schedule and habits never leave your laptop, it works offline once the model is pulled, costs nothing. Genuine vs forced.
- **Easy field-test bonus:** Go do 3–4 missions, photos + notes, honest wins/cringes — that’s the bonus points.

### Stack

- **Ollama + Gemma 2b** (`src/utils/ollama.js` → `http://localhost:11434/api/generate`) — also qualifies for *Best Use of Gemma*
- **Open-Meteo** (`src/utils/weather.js`) — no API key, weather + sunrise/sunset
- **Reverse geocode** (`src/utils/geocode.js`) — `BigDataCloud` → `Nominatim` → place name (not `28.04,77.34`)
- **ElevenLabs** (`src/utils/tts.js`) → falls back to **Web Speech API** — speak mission as you walk out, eyes off screen
- **React (JS, not TS) + Vite** (`src/App.jsx`, `src/components/MissionGenerator.jsx`) — your home turf
- **localStorage mission log** (`src/components/MissionLog.jsx`) — dedup 8, photos (base64, 4 max), notes, `completedAt`, export JSON/MD
- **Fallback heuristic** (`src/utils/missionGenerator.js`) — 16+ missions across `15/20/30/40/60` · `clear/cloudy/rain` · time-aware pools, so demo works with no Ollama

### Quick start

```bash
cd micro-expedition
npm install
# optional: local AI (works without — fallback used)
ollama pull gemma:2b
ollama serve
# optional: spoken mission
echo "VITE_ELEVENLABS_API_KEY=..." > .env
echo "VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM" >> .env
npm run dev
# build
npm run build
```

### How it works (30-second flow)

1. Allow location → reverse geocode to *“New Delhi, Delhi”* (not `28.04,77.34`)
2. Weather: `Clear • 25°C • Sunrise 06:16 • Sunset 18:00`
3. `Generate mission →` — Gemma prompt is time-aware (`15m: stay within 5 min walk` vs `60m: can go further`), JSON parsed, deduped against log
4. `🔊 Speak & go` — closes laptop after play
5. Do it, `View log` → add photo + notes → `✓ done` → `Export JSON/MD` for DEV post

### Field log (use this for your post)

`MissionLog` → `Export JSON` / `Export MD` gives:

```md
## 1. Shadow hunt (15m) — 15 min ✓
*Place:* New Delhi, Delhi
*Weather:* clear • 25°C • Sunrise 06:16 • Sunset 18:00
*Created:* 10/8/2026, 12:00 AM

Walk until you find...
- [x] Photo 5 shadows
> Notes: Found warmest corner behind gurdwara, kids playing...
```

Take 3–4 missions outside, add photos, note what model got wrong — that honesty is what judges love.

### “Why open” for your DEV post

- **Privacy:** Lat/lon + weather + habits never leave device (Ollama `localhost:11434`, no cloud)
- **Offline:** Once `gemma:2b` pulled, works on trail with no signal (Open-Meteo cached, but mission still generates)
- **Cost:** $0 to run, swap models, tune prompt, change agent behavior
- **Vs closed:** A closed API would send your precise location + time patterns to a server you don’t control and cost per call

### Project structure

```
src/
  main.jsx, App.jsx, index.css
  components/MissionGenerator.jsx  — select time, geocode→weather→mission, speak
  components/MissionLog.jsx        — photo, notes, done, export
  utils/weather.js, geocode.js, ollama.js, tts.js, missionGenerator.js
```

### To finish Hacktoberfest

You still need 30 min outside — generate 15/30/60 → do them → add photos/notes → export → post DEV → submit link at dev.to/hacktoberfest before Oct 11. That's the “bonus points” part judges check.

MIT — built for Hacktoberfest Open-Source AI Challenge Week 1.
