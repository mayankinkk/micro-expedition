# Touch Grass, For Real: I Built a 30-Second App That Sends Me Outside

*Hacktoberfest 2026 Week 1 — Touch Grass • open-source AI at its core*

**TL;DR:** Tell `micro-expedition` how much time you have (15–60 min). It checks sunset and weather, a local Gemma model writes one tiny, specific outdoor mission — “find 5 shadows,” “sit where you see zero screens for 60 sec” — then shuts up. I used it for a week in New Delhi. Here’s what worked, what was cringe, and why running it locally actually mattered.

---

### The idea (from overview.txt)

> The best builds here should make the screen the shortest part of the experience.

Most apps keep you scrolling. This one wants you to close the laptop. You open it for 30 seconds, get one mission, hit `🔊 Speak & go`, and leave. Examples: *“find a tree older than 50 years,” “hear three bird sounds before sunset,” “walk until no screens in view.”* Then it goes quiet — mission log is for after you get back.

I picked this because (a) it’s doable in 1–2 days (small React app + local model + free weather API), (b) the prompt’s own examples (bird ID, garden planner, route builder) will be crowded, and (c) the “why open” story is honest.

### How I built it (and what’s open)

- **Gemma 2b via Ollama** (`localhost:11434`) — generates the mission from a time+weather+sunset prompt. Qualifies for *Best Use of Gemma*. Prompt is time-aware: `15m → stay within 5 min walk`, `60m → can go further, no map`.
- **Open-Meteo** — free, no key, weather + `sunrise`/`sunset` for `latitude,longitude`. One fetch: `https://api.open-meteo.com/v1/forecast?current=...&daily=sunrise,sunset`.
- **BigDataCloud → Nominatim reverse geocode** — so it shows **“New Delhi, Delhi”** not `28.04, 77.34`. Weather line becomes `📍 New Delhi — Clear • 25°C • Sunrise 06:16 • Sunset 18:00`.
- **ElevenLabs** (optional) → **Web Speech API** fallback — reads the mission aloud so you don’t stare at the screen walking out.
- **Vite + React (JS)** — fast, `localStorage` log with dedup (avoids repeating last 8 titles), `15/20/30/40/60` pools across `clear/cloudy/rain` so it works with no Ollama.
- **Field evidence:** `MissionLog` lets you add **photo (4 max, base64)** + **notes** per mission, mark `✓ done`, and **Export JSON/MD** for this post.

All code: `src/utils/ollama.js`, `weather.js`, `geocode.js`, `missionGenerator.js`, `tts.js`, `components/MissionGenerator.jsx`.

### Why open > closed here (not hand-wavy)

1. **Privacy:** My lat/lon + that I walk at 7am with 15 min isn’t fun for a server log. Here it never leaves `localhost`. No account, no tracking.
2. **Offline on the trail:** Once `ollama pull gemma:2b`, the trail with no signal still works (fallback heuristic covers it, Gemma picked up when back). A hosted LLM fails there.
3. **Cost $0:** I can regenerate 20 times messing with prompt for free. Closed API: 20 × `gpt-4` image + audio = real money for a student.
4. **Swap-ability:** I started on `gemma:2b`, can try `llama3.2:3b` by changing one string — no vendor lock. And I fine-tune/tweak the prompt locally without waiting on a dashboard.

If I’d called a closed API, I’d be shipping my location every time I click *Generate*.

### I took it outside (3 missions, honest)

I gave it 15, 30, 60 in New Delhi (clear, 25°C, sunset 18:00). Location now shows **New Delhi, Delhi** not `28.04,77.34`.

- **15-min no-screen spot (15 MIN):** Walk until zero screens for 60 sec. Found a lane behind my block with no shops. Took 4 min. Sat 3 min — actually hard not to check phone. **Worked.** Model nailed “within 5 min walk.”
- **Five-color walk (30 MIN):** *Find 5 colors.* I forced this by picking 30 min after fix (pools now 4 options for 30m, not just bird sounds). Brighter than expected — sewage drain blue was… a choice. **Cringe:** it listed “clear” tag twice, I fixed.
- **60-min drift (60 MIN):** No goal, left when curious. Went to Lodhi-ish park, 58 min, 4.2k steps. **Worked but** mission said 25+25, I did 35+23 — heuristic underestimates wander time. Noted and tuned pool to `60-min horizon hunt` variant.

Photos + notes are in my `Export MD` — see log at `/log` → `Export JSON` attached below. The *bonus points* part (“take it outside, tell us how it went”) is why this log exists — judges can verify I didn’t just screenshot.

### Demo (30 seconds)

> GIF: select `15 min` → `Generate mission →` → `📍 New Delhi — Clear` → `15-min scent hunt` → `🔊 Speak & go` → close laptop → cut to photo of lane.

Video: link to Loom/YouTube (30 sec screen, rest outside).

### What I’d do next

- PWA install so it’s literally one tap outside.
- Mastra agent memory so it remembers “you hated the drain, never again” — beyond dedup.
- On-device bird call classifier (local AI deeper) if Week 3 calls.

### Try it

```bash
git clone .../micro-expedition
npm install && npm run dev
# optional local AI:
ollama pull gemma:2b && ollama serve
```

Repo: https://github.com/mayankinkk/micro-expedition — MIT • Live: http://localhost:5173/ (Render config at `render.yaml`, deploy on hold) • Demo build: `npm run dev` • Credits: Thinking Machines / Tinker (partner), Render, Open-Meteo, Ollama, OSM/Leaflet.

Field log exported from Feed → Export JSON/MD (3 activities, New Delhi, Delhi, with notes + track). See `field-log.json` / `field-log.md` in repo.

---

*This was built with open-weight models and open-source harnesses running locally — because the best way to get someone outside is to not need the cloud to tell them to go.*
