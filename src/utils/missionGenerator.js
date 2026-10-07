import { generateWithGemma, getGemmaContext } from './ollama.js'

export async function generateMission(input) {
  const prompt = buildGemmaPrompt(input)
  let gemmaResponse = ''
  try {
    const ctx = await getGemmaContext()
    gemmaResponse = await generateWithGemma(prompt, ctx)
  } catch (e) {
    console.warn('Gemma not available, using fallback', e.message)
    gemmaResponse = ''
  }
  const mission =
    gemmaResponse && gemmaResponse.trim().length > 20
      ? parseGemmaResponse(gemmaResponse, input)
      : generateFallbackMission(input)
  const openSourceNotes =
    'This mission was generated with local open-source AI (Gemma via Ollama). Your weather, location and habits never leave your device — it works offline, costs nothing, and keeps your data private.'
  return { mission, openSourceNotes }
}

function buildGemmaPrompt(input) {
  const { timeAvailable, weather, location, vibe, category, difficulty } = input
  const { temperature, conditions, sunset, sunrise } = weather
  return `Generate ONE specific, actionable outdoor micro-mission that takes about ${timeAvailable} minutes.

Weather: ${conditions}, ${temperature}°C
Sunset: ${sunset}, Sunrise: ${sunrise}
Location: ${location || 'general area'}
Vibe: ${vibe || 'curious'} | Category: ${category || 'any'} | Difficulty: ${difficulty || 'medium'}

Rules:
- Be specific and concrete (not "go for a walk")
- Fit within ${timeAvailable} minutes — ${timeAvailable <= 15 ? 'very quick, stay within 5 min walk' : timeAvailable <= 30 ? 'moderate, one small loop' : 'longer, can go further'}
- Match vibe "${vibe}" and category "${category}" if not "any"
- Get the person off-screen and into the world
- 2-4 clear requirements

Return ONLY JSON with: {"title": "...", "description": "...", "requirements": ["...", "..."], "estimatedTime": "${timeAvailable} min", "tags": ["..."]}`
}

function parseGemmaResponse(response, input) {
  try {
    const match = response.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    const parsed = JSON.parse(match[0])
    return {
      id: crypto.randomUUID(),
      title: parsed.title || 'Outdoor Mission',
      description: parsed.description || 'Go outside and explore',
      requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
      estimatedTime: parsed.estimatedTime || `${input.timeAvailable} min`,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      category: input.category || 'any',
      vibe: input.vibe || 'curious',
      difficulty: input.difficulty || 'medium',
      completed: false,
    }
  } catch (e) {
    console.warn('Failed to parse Gemma response, fallback', e)
    return generateFallbackMission(input)
  }
}

function generateFallbackMission(input) {
  const { timeAvailable, weather, vibe = 'curious', category = 'any', difficulty = 'medium' } = input
  const conditions = (weather.conditions || '').toLowerCase()
  const temperature = weather.temperature ?? 20
  const isClear = conditions.includes('clear') || conditions.includes('sunny') || conditions.includes('partly')
  const isRain = conditions.includes('rain') || conditions.includes('drizzle') || conditions.includes('shower') || conditions.includes('thunder')
  const isCloudy = conditions.includes('cloudy') || conditions.includes('overcast')
  const isCold = temperature < 15

  let recentTitles = []
  try {
    const stored = JSON.parse(localStorage.getItem('missions') || '[]')
    recentTitles = stored.slice(0, 8).map((m) => m.title)
  } catch {}

  const pools = []

  const add = (p) => pools.push({ category: 'nature', vibe: 'curious', difficulty: 'easy', ...p })

  if (isClear && !isCold) {
    add({ min: 15, max: 15, category: 'nature', vibe: 'mindful', title: 'Shadow hunt (15m)', desc: () => `Find 5 different shadows in 15 minutes — tree, building, your own. Walk no more than 5 min from start.`, req: ['Photo 5 shadows', 'Stand in the longest shadow 30 sec', 'Note what time it is by shadow length'] })
    add({ min: 15, max: 15, category: 'mindful', vibe: 'calm', title: 'Wind check (15m)', desc: () => `Find where wind lives — 3 spots, compare how air feels.`, req: ['Stand in 3 spots: open, narrow alley, under tree', 'Note wind difference', 'Find warmest windless corner and breathe 1 min'] })
    add({ min: 15, max: 15, category: 'playful', vibe: 'playful', title: '15-min scent hunt', desc: () => `Find 4 distinct outdoor smells — flower, soil, food, exhaust.`, req: ['Find 4 smells', 'Note which you liked', 'Follow the nicest smell 2 min'] })
    add({ min: 20, max: 20, category: 'mindful', vibe: 'calm', title: 'Bench with no screens', desc: () => `Find the nearest bench where you can sit for 2 minutes without seeing a screen. Listen.`, req: ['Time to no-screens spot', 'Sit 2 min, eyes up', 'Write 3 sounds you hear'] })
    add({ min: 20, max: 20, category: 'urban', vibe: 'curious', title: 'Two-block detail hunt (20m)', desc: () => `Walk two blocks ultra-slow, find 6 tiny details you never noticed.`, req: ['Find 6 tiny details', 'Photo 3', 'Pick favorite and stare 60 sec'] })
    add({ min: 20, max: 20, category: 'nature', vibe: 'social', title: 'People watch sketch (20m)', desc: () => `Sit at a busy spot, sketch 3 strangers in 30 sec each — no judgment, just shapes.`, req: ['30-sec sketch 3 people', 'Note one kind detail per person', 'Leave sketches on bench for next person'] })
    add({ min: 30, max: 30, category: 'nature', vibe: 'curious', title: 'Three bird sounds before sunset', desc: () => `Before sunset (${weather.sunset}), find three different bird sounds. Stand still 2 min per spot.`, req: ['Note 3 distinct calls', 'Stay still 2 min per spot', 'Photo the place you heard the last one'] })
    add({ min: 30, max: 30, category: 'urban', vibe: 'playful', title: 'Five-color walk (30m)', desc: () => `Clear light is best for color — find 5 distinct natural colors in 30 min.`, req: ['Find 5 colors in nature', 'Photo each', 'Sit 2 min by favorite color'] })
    add({ min: 30, max: 30, category: 'nature', vibe: 'mindful', title: 'Leaf-and-bark collection (30m)', desc: () => `Collect only fallen things: 3 leaves, 2 bark pieces, 1 seed or fruit.`, req: ['Collect 3 leaves + 2 bark + 1 seed (only fallen)', 'Arrange by size', 'Leave them where you found them'] })
    add({ min: 30, max: 30, category: 'learn', vibe: 'curious', title: 'Three textures, three stories (30m)', desc: () => `Find 3 textures and make up where they have been.`, req: ['Find 3 textures: stone, wood, leaf', 'Story for each: where was it?', 'Photo favorite'] })
    add({ min: 40, max: 40, category: 'nature', vibe: 'curious', title: 'Foliage & found textures (40m)', desc: () => { const age = Math.floor(Math.random() * 50 + 50); return `Walk until you find a tree that looks older than ${age} years. No map — look for thick bark and wide roots.` }, req: ['Photo 3 bark textures', 'No screens in view for 60 sec', 'Note one sound only outside'] })
    add({ min: 40, max: 40, category: 'social', vibe: 'social', title: 'Park bench stories (40m)', desc: () => `Visit 3 benches, sit 5 min each, invent a story for who sat there.`, req: ['Visit 3 benches, 5 min each', 'Note one detail per bench', 'Photo the bench you liked most'] })
    add({ min: 40, max: 40, category: 'mindful', vibe: 'calm', title: '40m silent walk', desc: () => `Walk 40 min with no talking, no music — just breath and steps.`, req: ['No audio for 40 min', 'Count steps to 100 then restart', 'Note when mind wanders, gently return'] })
    add({ min: 60, max: 60, category: 'urban', vibe: 'energetic', title: '60-min out-and-back', desc: () => `Walk 25 min in one direction with no destination, then 25 min back a different way. No phone navigation.`, req: ['No map — pick turns by curiosity', 'Collect 3 interesting leaves/rocks', 'Be back in 60 min, note what changed'] })
    add({ min: 60, max: 60, category: 'playful', vibe: 'playful', title: '60-min street gallery (60m)', desc: () => `Walk a big loop and curate a gallery: find 7 beautiful ordinary things.`, req: ['Find 7 ordinary beauties', 'Photo each', 'Make a gallery caption for one'] })
    add({ min: 60, max: 60, category: 'mindful', vibe: 'calm', title: '60-min drift', desc: () => `No goal walk: 60 min, turn left when you feel like it, right when curious.`, req: ['No destination', 'Notice 5 things you never saw', 'Return different route'] })
  }
  if (isClear && isCold) {
    add({ min: 15, max: 15, category: 'mindful', vibe: 'calm', title: 'Cold air reset (15m)', desc: () => `Brisk 15-min loop: breathe in 4, out 6, notice how cold air feels.`, req: ['Walk briskly 15 min', '4-6 breathing 5 times', 'Note first warm spot you find'] })
    add({ min: 20, max: 30, category: 'nature', vibe: 'energetic', title: 'Sun-seeker', desc: () => `Chase the sun — find the warmest sunny wall or corner within 10 min and stand there.`, req: ['Find sunniest wall', 'Stand 3 min eyes closed', 'Photo your shadow'] })
    add({ min: 40, max: 60, category: 'learn', vibe: 'curious', title: 'Winter tree ID', desc: () => `Find 4 trees and ID by bark/buds alone (no leaves).`, req: ['Photo 4 barks', 'Try to name or sketch one', 'Find oldest-looking tree'] })
  }
  if (isCloudy) {
    add({ min: 15, max: 20, category: 'playful', vibe: 'playful', title: 'Cloud gallery (15m)', desc: () => `Find a wide sky view, pick 3 clouds and name what they look like.`, req: ['Name 3 cloud shapes', 'Watch one cloud for 2 min', 'Photo the best one'] })
    add({ min: 30, max: 40, category: 'mindful', vibe: 'calm', title: 'Grey-light walk', desc: () => `Overcast is best for colors — find 5 distinct natural colors.`, req: ['Find 5 colors in nature', 'Photo each', 'Pick your favorite and sit near it 2 min'] })
    add({ min: 60, max: 60, category: 'urban', vibe: 'curious', title: 'Neighborhood color map', desc: () => `60-min map: walk and mark where you find red, green, yellow, blue in nature.`, req: ['Map 4 colors', 'Walk a loop, no backtracking', 'Return with color list'] })
  }
  if (isRain) {
    add({ min: 15, max: 15, category: 'mindful', vibe: 'calm', title: 'Rain listen (15m)', desc: () => `Cover walk: 15 min under eaves/balcony, just listen to rain on different surfaces.`, req: ['Stand under 3 different covers', 'Note rain sound differences', 'Find one dry leaf'] })
    add({ min: 20, max: 30, category: 'playful', vibe: 'playful', title: 'Puddle safari', desc: () => `20-min puddle hunt — find reflections.`, req: ['Photo 3 puddle reflections', 'Find biggest puddle', 'Note what sky it shows'] })
    add({ min: 40, max: 60, category: 'learn', vibe: 'curious', title: 'Rain pocket garden plan', desc: () => `Stay near cover: plan what to plant this week using frost date. Then 10 min outside to feel air.`, req: ['Look up last frost date', 'Pick 3 plants', '10 min outside, note smell'] })
  }
  // generic (always)
  add({ min: 15, max: 15, category: 'mindful', vibe: 'calm', title: '15-min no-screen spot', desc: () => `Walk any direction until you see zero screens for 60 sec. Sit there.`, req: ['Time to no-screens', 'Sit 3 min', 'Bring back one natural object'] })
  add({ min: 60, max: 60, category: 'nature', vibe: 'curious', title: '60-min horizon hunt', desc: () => `Find the farthest place you can see, then the closest tiny detail. Alternate.`, req: ['Find farthest visible point', 'Find tiniest detail at feet', 'Photo both'] })

  // filter by category/vibe if not any
  let candidates = pools
  if (category !== 'any') candidates = candidates.filter((p) => p.category === category)
  if (vibe !== 'any' && vibe !== 'curious') {
    const vibeMatch = candidates.filter((p) => p.vibe === vibe)
    if (vibeMatch.length > 0) candidates = vibeMatch
  }
  // difficulty narrows: easy->favor 15-30, hard->favor 40-60
  if (difficulty === 'easy') candidates = candidates.filter((p) => p.max <= 30)
  else if (difficulty === 'hard') candidates = candidates.filter((p) => p.min >= 30)

  // then time match
  let exact = candidates.filter((p) => p.min === timeAvailable && p.max === timeAvailable)
  let range = candidates.filter((p) => timeAvailable >= p.min && timeAvailable <= p.max && !(p.min === timeAvailable && p.max === timeAvailable))
  let timeCandidates = [...exact, ...range]
  if (timeCandidates.length > 0) candidates = timeCandidates
  else if (candidates.length === 0) {
    // fallback to all pools time-matched
    let fallbackExact = pools.filter((p) => p.min === timeAvailable && p.max === timeAvailable)
    let fallbackRange = pools.filter((p) => timeAvailable >= p.min && timeAvailable <= p.max)
    candidates = [...fallbackExact, ...fallbackRange]
    if (candidates.length === 0) candidates = [...pools].sort((a, b) => Math.abs(a.min - timeAvailable) - Math.abs(b.min - timeAvailable)).slice(0, 3)
  }

  let filtered = candidates.filter((c) => !recentTitles.includes(c.title))
  if (filtered.length === 0) {
    filtered = candidates.filter((c) => c.title !== recentTitles[0])
    if (filtered.length === 0) filtered = candidates
  }
  const pick = filtered[Math.floor(Math.random() * filtered.length)]
  const description = typeof pick.desc === 'function' ? pick.desc() : pick.desc
  return {
    id: crypto.randomUUID(),
    title: pick.title,
    description,
    requirements: pick.req,
    estimatedTime: `${timeAvailable} min`,
    tags: [pick.category, pick.vibe, ...conditions.split(' ').filter(Boolean)].slice(0, 4),
    category: pick.category,
    vibe: pick.vibe,
    difficulty: pick.difficulty,
    completed: false,
  }
}
