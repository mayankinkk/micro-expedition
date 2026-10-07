import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWeather } from '../utils/weather.js'
import { generateMission } from '../utils/missionGenerator.js'
import { speakMission } from '../utils/tts.js'
import { reverseGeocode } from '../utils/geocode.js'
import { totalDistanceKm, paceMinPerKm, formatDuration } from '../utils/geo.js'
import ActivityMap from './ActivityMap.jsx'

const VIBES = [
  { v: 'any', l: 'Any vibe', e: '✨' },
  { v: 'calm', l: 'Calm', e: '🧘' },
  { v: 'curious', l: 'Curious', e: '🔍' },
  { v: 'energetic', l: 'Energetic', e: '⚡' },
  { v: 'playful', l: 'Playful', e: '🎨' },
  { v: 'social', l: 'Social', e: '👥' },
  { v: 'mindful', l: 'Mindful', e: '🌿' },
]
const CATS = [
  { v: 'any', l: 'Any place' },
  { v: 'nature', l: 'Nature' },
  { v: 'urban', l: 'Urban' },
  { v: 'mindful', l: 'Mindful' },
  { v: 'playful', l: 'Playful' },
  { v: 'learn', l: 'Learn' },
  { v: 'social', l: 'Social' },
]

export default function MissionGenerator() {
  const navigate = useNavigate()
  const [timeAvailable, setTimeAvailable] = useState(30)
  const [vibe, setVibe] = useState('curious')
  const [category, setCategory] = useState('any')
  const [difficulty, setDifficulty] = useState('medium')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [weather, setWeather] = useState(null)
  const [mission, setMission] = useState(null)
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [ttsLoading, setTtsLoading] = useState(false)
  const [locStatus, setLocStatus] = useState('')
  const [streak, setStreak] = useState(0)

  // live tracking
  const [tracking, setTracking] = useState(false)
  const [paused, setPaused] = useState(false)
  const [track, setTrack] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const watchRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('missions') || '[]')
    setStreak(s.filter((m) => m.completed).length)
  }, [mission])

  useEffect(() => () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const generate = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    setTtsLoading(false)
    setChecks([])
    // stop tracking if running
    if (tracking) stopTracking(false)
    try {
      let lat = 40.7128, lon = -74.006, placeName = 'New York'
      let coordsLabel = ''
      try {
        const pos = await new Promise((res, rej) => {
          if (!navigator.geolocation) return rej(new Error('no geo'))
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4500 })
        })
        lat = pos.coords.latitude
        lon = pos.coords.longitude
        coordsLabel = `${lat.toFixed(2)}, ${lon.toFixed(2)}`
        setLocStatus('Locating…')
        placeName = await reverseGeocode(lat, lon)
        setLocStatus(`📍 ${placeName}`)
      } catch {
        placeName = await reverseGeocode(lat, lon)
        setLocStatus(`📍 ${placeName} (enable location for your city)`)
        coordsLabel = `${lat.toFixed(2)}, ${lon.toFixed(2)}`
      }
      const weatherData = await fetchWeather(lat, lon)
      const enriched = { ...weatherData, placeName, coordsLabel, lat, lon }
      setWeather(enriched)
      const input = { timeAvailable, vibe, category, difficulty, weather: enriched, location: placeName }
      const res = await generateMission(input)
      const withMeta = {
        ...res.mission,
        place: placeName,
        coords: coordsLabel,
        weather: { conditions: enriched.conditions, temperature: enriched.temperature, sunrise: enriched.sunrise, sunset: enriched.sunset },
        vibe, category, difficulty,
        createdAt: new Date().toISOString(),
      }
      setMission(withMeta)
      setTrack([])
      setElapsed(0)
      setInfo(res.openSourceNotes)
      const stored = JSON.parse(localStorage.getItem('missions') || '[]')
      localStorage.setItem('missions', JSON.stringify([withMeta, ...stored].slice(0, 50)))
    } catch (e) {
      setError('Failed to generate mission. ' + (e.message || ''))
    } finally {
      setLoading(false)
    }
  }

  const startTracking = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    setTrack([])
    setElapsed(0)
    setTracking(true)
    setPaused(false)
    setInfo('Recording — live GPS on. Go outside, we’ll map your route.')
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (paused) return
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, time: Date.now() }
        setTrack((t) => {
          if (t.length > 0) {
            const last = t[t.length - 1]
            if (Math.abs(last.lat - p.lat) < 0.00005 && Math.abs(last.lon - p.lon) < 0.00005) return t
          }
          return [...t, p]
        })
      },
      (err) => setError('GPS error: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
  }

  const pauseTracking = () => {
    setPaused(true)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
  }

  const resumeTracking = () => {
    setPaused(false)
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, time: Date.now() }
        setTrack((t) => [...t, p])
      },
      (err) => setError('GPS error: ' + err.message),
      { enableHighAccuracy: true }
    )
  }

  const stopTracking = (save = true) => {
    setTracking(false)
    setPaused(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    if (save && mission) {
      const dist = totalDistanceKm(track)
      const updated = { ...mission, track, distanceKm: dist, durationSec: elapsed, pace: paceMinPerKm(dist, elapsed) }
      setMission(updated)
      const stored = JSON.parse(localStorage.getItem('missions') || '[]')
      const idx = stored.findIndex((m) => m.id === mission.id)
      let next
      if (idx >= 0) { stored[idx] = { ...stored[idx], ...updated }; next = stored } else { next = [updated, ...stored] }
      localStorage.setItem('missions', JSON.stringify(next.slice(0, 50)))
      setInfo(`Saved activity: ${dist.toFixed(2)} km in ${formatDuration(elapsed)} — export GPX from Log.`)
    }
  }

  const speak = async () => {
    if (!mission) return
    setTtsLoading(true)
    try {
      await speakMission({ text: `${mission.title}. ${mission.description}. Tasks: ${mission.requirements.join('. ')}. Estimated ${mission.estimatedTime}. Now close this screen and go.` })
    } catch (e) {
      setError('TTS failed: ' + e.message)
    } finally {
      setTtsLoading(false)
    }
  }

  const share = async () => {
    const txt = `${mission.title} — ${mission.description} (${mission.estimatedTime} in ${mission.place}) — via micro-expedition`
    if (navigator.share) { try { await navigator.share({ title: mission.title, text: txt }); return } catch {} }
    await navigator.clipboard.writeText(txt)
    setInfo('Copied to clipboard — share your field photo on DEV for bonus points!')
    setTimeout(() => setInfo(''), 3000)
  }

  const toggleCheck = (i) => setChecks((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))
  const progress = mission ? Math.round((checks.length / mission.requirements.length) * 100) : 0
  const dist = totalDistanceKm(track)
  const pace = paceMinPerKm(dist, elapsed)

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.brand}><span style={s.dot}>●</span> micro-expedition <span style={s.ver}>activity • local</span></div>
          <div style={s.navLinks}>
            <button onClick={() => navigate('/log')} style={s.navBtn}>Feed <span style={s.badge}>{streak}</span></button>
            <a href="https://github.com/mayankinkk/micro-expedition" target="_blank" rel="noreferrer" style={s.navGhost}>GitHub →</a>
          </div>
        </div>
      </nav>

      <div style={s.wrap}>
        <header style={s.hero}>
          <p style={s.kicker}>Activity tracking for tiny missions • Hacktoberfest • Touch Grass</p>
          <h1 style={s.title}>One screen.<br /><span style={s.titleGrad}>Then go outside.</span></h1>
          <p style={s.sub}>Pick time, vibe and place type. We check <b>sunset + weather</b>, a <b>local Gemma</b> writes one mission, then <b>live GPS</b> records your route — map, km, pace — all local, exportable as <b>GPX</b>.</p>
          <div style={s.heroStats}>
            <span style={s.stat}><b>30 sec</b> screen</span>
            <span style={s.statDot}>•</span>
            <span style={s.stat}>📍 place not coords</span>
            <span style={s.statDot}>•</span>
            <span style={s.stat}>🗺️ live map</span>
            <span style={s.statDot}>•</span>
            <span style={s.stat}>FC4C02 polyline</span>
          </div>
        </header>

        <div style={s.panel}>
          <div style={s.panelHead}>
            <h2 style={s.panelTitle}>Build your mission</h2>
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={s.advBtn}>{showAdvanced ? 'Less ▲' : 'More options ▼'}</button>
          </div>
          <div style={s.grid}>
            <label style={s.field}>
              <span style={s.fLabel}>Time you have</span>
              <select value={timeAvailable} onChange={(e) => setTimeAvailable(Number(e.target.value))} style={s.select}>
                <option value={15}>15 min — quick reset</option>
                <option value={20}>20 min — short loop</option>
                <option value={30}>30 min — sweet spot</option>
                <option value={40}>40 min — explore</option>
                <option value={60}>60 min — expedition</option>
              </select>
              <span style={s.hint}>{timeAvailable <= 15 ? 'Stay within 5 min walk' : timeAvailable <= 30 ? 'One small loop' : 'Go further, no map needed'}</span>
            </label>
            <label style={s.field}>
              <span style={s.fLabel}>Vibe</span>
              <select value={vibe} onChange={(e) => setVibe(e.target.value)} style={s.select}>
                {VIBES.map((o) => <option key={o.v} value={o.v}>{o.e} {o.l}</option>)}
              </select>
            </label>
            <label style={s.field}>
              <span style={s.fLabel}>Place type</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={s.select}>
                {CATS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </label>
          </div>
          {showAdvanced && (
            <div style={{ ...s.grid, marginTop: 14, animation: 'fadeIn 0.2s' }}>
              <label style={s.field}>
                <span style={s.fLabel}>Difficulty</span>
                <div style={s.pills}>
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)} style={{ ...s.pill, ...(difficulty === d ? s.pillOn : {}) }}>{d}</button>
                  ))}
                </div>
              </label>
              <div style={s.field}><span style={s.fLabel}>Why open?</span><p style={s.why}>Local • offline • $0 • private.<br />GPS never leaves device.</p></div>
              <div style={s.field}><span style={s.fLabel}>Activity map</span><p style={s.why}>Leaflet + OSM (open) • GPX export • feed + kudos • local-only.</p></div>
            </div>
          )}
          <button onClick={generate} disabled={loading} style={{ ...s.primary, opacity: loading ? 0.6 : 1 }}>{loading ? 'Generating…' : 'Generate mission →'}</button>
          {locStatus && <p style={s.loc}>{locStatus}</p>}
          {error && <div style={s.error}>{error}</div>}
          {info && !error && <div style={s.info}>{info}</div>}
          {weather && (
            <div style={s.weather}>
              <span style={s.wIcon}>{weather.conditions.includes('clear') ? '☀️' : weather.conditions.includes('rain') ? '🌧️' : weather.conditions.includes('cloud') ? '☁️' : '🌤️'}</span>
              <strong>📍 {weather.placeName}</strong> — <span style={{ textTransform: 'capitalize' }}>{weather.conditions}</span> • {Math.round(weather.temperature)}°C
              <span style={{ opacity: 0.6 }}> • Sunrise {weather.sunrise} • Sunset {weather.sunset}</span>
              <span style={s.weatherRight}>{category} • {vibe} • {difficulty}</span>
            </div>
          )}
        </div>

        {mission && (
          <div style={s.mission}>
            <div style={s.mHead}>
              <div style={s.badges}>
                <span style={s.badge}>{mission.estimatedTime}</span>
                <span style={s.badge2}>{mission.vibe}</span>
                <span style={s.badge2}>{mission.category}</span>
                <span style={s.badge2}>{mission.difficulty}</span>
              </div>
              <div style={s.progressWrap}><div style={{ ...s.progressBar, width: `${progress}%` }} /></div>
              <span style={s.progressTxt}>{checks.length}/{mission.requirements.length} • {progress}%</span>
            </div>

            <h2 style={s.mTitle}>{mission.title}</h2>
            <p style={s.mDesc}>{mission.description}</p>

            {/* Activity map + live stats */}
            <div style={s.mapBox}>
              <div style={s.mapStats}>
                <div><b>{dist.toFixed(2)}</b><span>km</span></div>
                <div><b>{formatDuration(elapsed)}</b><span>time</span></div>
                <div><b>{pace}</b><span>pace</span></div>
                <div style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.6 }}>{tracking ? (paused ? '⏸ paused' : '● recording') : '○ idle'} • OSM</div>
              </div>
              <ActivityMap track={track.length > 0 ? track : mission.track || []} height={180} />
              <div style={s.trackActions}>
                {!tracking ? (
                  <button onClick={startTracking} style={s.ctaGo}>▶ Start recording</button>
                ) : paused ? (
                  <>
                    <button onClick={resumeTracking} style={s.ctaGo}>▶ Resume</button>
                    <button onClick={() => stopTracking(true)} style={s.ghost}>⏹ Finish & save</button>
                  </>
                ) : (
                  <>
                    <button onClick={pauseTracking} style={s.ghost}>⏸ Pause</button>
                    <button onClick={() => stopTracking(true)} style={{ ...s.green, background: '#FC4C02' }}>⏹ Finish</button>
                  </>
                )}
                <span style={s.hint}>Live • GPS local only • GPX in Log</span>
              </div>
            </div>

            <div style={s.checks}>
              {mission.requirements.map((r, i) => (
                <label key={r} style={{ ...s.check, ...(checks.includes(i) ? s.checkDone : {}) }}>
                  <input type="checkbox" checked={checks.includes(i)} onChange={() => toggleCheck(i)} style={s.cb} />
                  <span>{r}</span>
                  {checks.includes(i) && <span style={s.checkMark}>✓</span>}
                </label>
              ))}
            </div>
            {mission.tags?.length > 0 && <p style={s.tags}>{mission.tags.join(' • ')}</p>}
            <div style={s.actions}>
              <button onClick={speak} disabled={ttsLoading} style={s.green}>{ttsLoading ? 'Speaking…' : '🔊 Speak & go'}</button>
              <button onClick={share} style={s.ghost}>Share</button>
              <button onClick={() => navigate('/log')} style={s.ghost}>Feed →</button>
              <button onClick={generate} style={s.ghost}>Another one ↻</button>
            </div>
            <p style={s.nudge}>Hit Start, go outside, then Finish — map + stats save to Feed. Screen time stays 30 sec, adventure is local.</p>
          </div>
        )}

        <div style={s.how}>
          <div style={s.howCard}><b>1</b> Pick time + vibe <span>30 sec</span></div>
          <div style={s.howCard}><b>2</b> ▶ Start GPS <span>live map</span></div>
          <div style={s.howCard}><b>3</b> Go outside <span>FC4C02 line</span></div>
          <div style={s.howCard}><b>4</b> ⏹ Finish → Feed <span>GPX + kudos</span></div>
        </div>

        <footer style={s.footer}>
          <span>Local activity: Leaflet • OSM • local GPS • GPX export • kudos • open Gemma</span>
          <button onClick={() => navigate('/log')} style={s.link}>feed →</button>
        </footer>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'radial-gradient(1200px 600px at 20% -10%, #e8f5e9 0%, transparent 60%), radial-gradient(1000px 500px at 90% 0%, #eef2ff 0%, transparent 60%), #f8f7f4', paddingBottom: 32 },
  nav: { position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e9e7e1' },
  navInner: { maxWidth: 760, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 15, display: 'flex', gap: 8, alignItems: 'center' },
  dot: { color: '#FC4C02' },
  ver: { fontWeight: 600, opacity: 0.5, fontSize: 11, border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: 20 },
  navLinks: { display: 'flex', gap: 8, alignItems: 'center' },
  navBtn: { border: '1px solid #111', background: '#111', color: 'white', borderRadius: 20, padding: '6px 12px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  badge: { background: '#FC4C02', color: 'white', fontSize: 10, padding: '1px 6px', borderRadius: 20, marginLeft: 6, fontWeight: 800 },
  navGhost: { fontSize: 13, fontWeight: 600, color: '#111', textDecoration: 'none', border: '1px solid #e5e7eb', padding: '6px 10px', borderRadius: 20, background: 'white' },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '0 16px' },
  hero: { padding: '28px 0 16px' },
  kicker: { fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5, margin: '0 0 10px', fontWeight: 700 },
  title: { fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95, margin: '0 0 12px', color: '#111' },
  titleGrad: { background: 'linear-gradient(90deg, #FC4C02, #3730a3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub: { fontSize: 15.5, lineHeight: 1.6, opacity: 0.7, margin: '0 0 12px', maxWidth: 640 },
  heroStats: { display: 'flex', gap: 10, fontSize: 12, opacity: 0.6, flexWrap: 'wrap', alignItems: 'center' },
  stat: { background: 'white', border: '1px solid #e9e7e1', padding: '4px 8px', borderRadius: 20 },
  statDot: { opacity: 0.3 },
  panel: { background: 'white', border: '1px solid #e9e7e1', borderRadius: 16, padding: 18, boxShadow: '0 12px 32px rgba(0,0,0,0.07)', marginBottom: 16 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  panelTitle: { fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' },
  advBtn: { fontSize: 12, fontWeight: 700, background: '#f8f7f4', border: '1px solid #e5e7eb', borderRadius: 20, padding: '6px 10px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fLabel: { fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 },
  select: { border: '1.5px solid #111', borderRadius: 12, padding: '11px 12px', fontSize: 14, background: 'white', fontWeight: 600, color: '#111' },
  hint: { fontSize: 11, opacity: 0.5 },
  pills: { display: 'flex', gap: 6 },
  pill: { border: '1px solid #e5e7eb', background: 'white', borderRadius: 20, padding: '7px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize' },
  pillOn: { background: '#111', color: 'white', borderColor: '#111' },
  why: { fontSize: 12, lineHeight: 1.5, opacity: 0.6, margin: 0 },
  primary: { width: '100%', marginTop: 16, background: '#111', color: 'white', border: 'none', borderRadius: 12, padding: '13px 18px', fontWeight: 800, fontSize: 15, cursor: 'pointer' },
  loc: { fontSize: 12, opacity: 0.6, margin: '10px 0 0' },
  error: { marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 12px', borderRadius: 10, fontSize: 13 },
  info: { marginTop: 10, background: '#f0f7ff', border: '1px solid #dbeafe', color: '#334155', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5 },
  weather: { marginTop: 14, background: '#f8f7f4', border: '1px solid #eee', borderRadius: 12, padding: '10px 12px', fontSize: 13, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  wIcon: { fontSize: 16 },
  weatherRight: { marginLeft: 'auto', fontSize: 11, fontWeight: 700, opacity: 0.5, border: '1px solid #e5e7eb', padding: '3px 8px', borderRadius: 20, background: 'white' },
  mission: { background: 'white', border: '1.5px solid #111', borderRadius: 16, padding: 18, boxShadow: '0 14px 30px rgba(0,0,0,0.08)', animation: 'fadeIn 0.3s', marginBottom: 16 },
  mHead: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  badges: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: { fontSize: 11, fontWeight: 800, background: '#111', color: 'white', padding: '4px 8px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase' },
  badge2: { fontSize: 11, fontWeight: 700, background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: 20, textTransform: 'capitalize' },
  progressWrap: { flex: 1, minWidth: 80, height: 6, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden', border: '1px solid #e5e7eb' },
  progressBar: { height: '100%', background: 'linear-gradient(90deg, #FC4C02, #16a34a)', transition: 'width 0.3s' },
  progressTxt: { fontSize: 11, fontWeight: 800, opacity: 0.6 },
  mTitle: { fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', color: '#111' },
  mDesc: { fontSize: 15, lineHeight: 1.5, margin: '0 0 10px', color: '#222' },
  mapBox: { border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 12, background: '#fcfcff' },
  mapStats: { display: 'flex', gap: 16, padding: '10px 12px', fontSize: 12, alignItems: 'end', borderBottom: '1px solid #e5e7eb', background: 'white' },
  trackActions: { display: 'flex', gap: 8, padding: '10px 12px', alignItems: 'center', flexWrap: 'wrap', background: 'white', borderTop: '1px solid #e5e7eb' },
  ctaGo: { background: '#FC4C02', color: 'white', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 800, cursor: 'pointer' },
  checks: { display: 'flex', flexDirection: 'column', gap: 8 },
  check: { display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', fontSize: 14, background: 'white', transition: '0.15s' },
  checkDone: { background: '#f0fdf4', borderColor: '#bbf7d0', opacity: 0.9, textDecoration: 'line-through' },
  cb: { width: 16, height: 16, accentColor: '#FC4C02' },
  checkMark: { marginLeft: 'auto', color: '#0a7a42', fontWeight: 800 },
  tags: { fontSize: 11, opacity: 0.45, margin: '10px 0 0' },
  actions: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  green: { background: '#0a7a42', color: 'white', border: 'none', borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer' },
  ghost: { background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  nudge: { fontSize: 12, fontStyle: 'italic', opacity: 0.55, marginTop: 10 },
  how: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 },
  howCard: { background: 'white', border: '1px solid #e9e7e1', borderRadius: 12, padding: '12px', fontSize: 13, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: 2 },
  footer: { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, opacity: 0.55, flexWrap: 'wrap', padding: '0 2px' },
  link: { background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, opacity: 0.7 },
}
