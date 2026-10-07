import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWeather } from '../utils/weather.js'
import { generateMission } from '../utils/missionGenerator.js'
import { speakMission } from '../utils/tts.js'
import { reverseGeocode } from '../utils/geocode.js'

export default function MissionGenerator() {
  const navigate = useNavigate()
  const [timeAvailable, setTimeAvailable] = useState(30)
  const [weather, setWeather] = useState(null)
  const [mission, setMission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [ttsLoading, setTtsLoading] = useState(false)
  const [locStatus, setLocStatus] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    setTtsLoading(false)

    try {
      let lat = 40.7128, lon = -74.0060, placeName = 'New York'
      let coordsLabel = ''
      try {
        const pos = await new Promise((res, rej) => {
          if (!navigator.geolocation) return rej(new Error('no geolocation'))
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
      const enrichedWeather = { ...weatherData, placeName, coordsLabel }
      setWeather(enrichedWeather)

      const input = { timeAvailable, weather: enrichedWeather, location: placeName }
      const response = await generateMission(input)
      // attach place + weather meta for log/export
      const missionWithMeta = {
        ...response.mission,
        place: placeName,
        coords: coordsLabel,
        weather: { conditions: enrichedWeather.conditions, temperature: enrichedWeather.temperature, sunrise: enrichedWeather.sunrise, sunset: enrichedWeather.sunset },
        createdAt: new Date().toISOString(),
      }
      setMission(missionWithMeta)
      setInfo(response.openSourceNotes)

      // save to local log for dedup + field evidence
      const stored = JSON.parse(localStorage.getItem('missions') || '[]')
      const updated = [missionWithMeta, ...stored].slice(0, 50)
      localStorage.setItem('missions', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
      setError('Failed to generate mission. ' + (e.message || 'Try again.'))
    } finally {
      setLoading(false)
    }
  }

  const speak = async () => {
    if (!mission) return
    setTtsLoading(true)
    try {
      await speakMission({
        text: `${mission.title}. ${mission.description}. Your tasks: ${mission.requirements.join('. ')}. Estimated time ${mission.estimatedTime}. Now close this screen and go.`,
      })
    } catch (e) {
      console.error('TTS failed', e)
      setError('TTS failed: ' + e.message)
    } finally {
      setTtsLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <p style={styles.kicker}>Hacktoberfest • Touch Grass • open-source AI</p>
        <h1 style={styles.title}>micro-expedition</h1>
        <p style={styles.subtitle}>One screen, 30 seconds, then go outside. Pick your time → get one tiny mission built for the weather and sunset.</p>

        <div style={styles.row}>
          <label style={styles.label}>
            Time you have
            <select value={timeAvailable} onChange={(e) => setTimeAvailable(Number(e.target.value))} style={styles.select}>
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
              <option value={40}>40 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
          <button onClick={generate} disabled={loading} style={{ ...styles.primary, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Generating…' : 'Generate mission →'}
          </button>
        </div>

        {locStatus && <p style={styles.hint}>{locStatus}</p>}
        {error && <div style={styles.error}>{error}</div>}
        {info && !error && <div style={styles.info}>{info}</div>}

        {weather && (
          <div style={styles.weather}>
            <strong>📍 {weather.placeName}</strong> — <span style={{ textTransform: 'capitalize' }}>{weather.conditions}</span> • {Math.round(weather.temperature)}°C
            <span style={{ opacity: 0.7 }}> • Sunrise {weather.sunrise} • Sunset {weather.sunset}</span>
          </div>
        )}

        {mission && (
          <div style={styles.mission}>
            <div style={styles.badge}>{mission.estimatedTime}</div>
            <h2 style={styles.missionTitle}>{mission.title}</h2>
            <p style={styles.missionDesc}>{mission.description}</p>
            <ul style={styles.list}>
              {mission.requirements.map((r) => (
                <li key={r} style={styles.li}>{r}</li>
              ))}
            </ul>
            {mission.tags?.length > 0 && <p style={styles.tags}>{mission.tags.join(' • ')}</p>}

            <div style={styles.actions}>
              <button onClick={speak} disabled={ttsLoading} style={styles.secondary}>
                {ttsLoading ? 'Speaking…' : '🔊 Speak & go'}
              </button>
              <button onClick={() => navigate('/log')} style={styles.ghost}>View log</button>
              <button onClick={generate} style={styles.ghost}>Another one</button>
            </div>
            <p style={styles.nudge}>Close the laptop after you hit play. The best part is outside.</p>
          </div>
        )}

        <div style={styles.footer}>
          <span>Local-first: Gemma via Ollama • Open-Meteo • localStorage log</span>
          <a onClick={() => navigate('/log')} style={styles.link}>mission log →</a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f8f7f4', display: 'flex', justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
  card: { width: '100%', maxWidth: 640, background: 'white', border: '1px solid #e9e7e1', borderRadius: 16, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' },
  kicker: { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.6, margin: '0 0 8px' },
  title: { fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 8px', color: '#111' },
  subtitle: { fontSize: 15, lineHeight: 1.5, opacity: 0.7, margin: '0 0 20px' },
  row: { display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' },
  label: { fontSize: 13, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 6, color: '#222' },
  select: { border: '1px solid #111', borderRadius: 10, padding: '10px 36px 10px 12px', fontSize: 15, minWidth: 130, background: 'white', backgroundColor: 'white', color: '#111', WebkitTextFillColor: '#111', fontWeight: 600, opacity: 1, appearance: 'auto' },
  primary: { background: '#111', color: 'white', border: 'none', borderRadius: 12, padding: '12px 18px', fontWeight: 700, cursor: 'pointer' },
  hint: { fontSize: 12, opacity: 0.6, margin: '12px 0 0' },
  error: { marginTop: 12, background: '#fee', border: '1px solid #fcc', color: '#900', padding: '10px 12px', borderRadius: 10, fontSize: 13 },
  info: { marginTop: 12, background: '#f0f7ff', border: '1px solid #dbeafe', color: '#334155', padding: '10px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.5 },
  weather: { marginTop: 16, background: '#f8f7f4', border: '1px solid #eee', borderRadius: 10, padding: '10px 12px', fontSize: 13 },
  mission: { marginTop: 20, border: '1px solid #111', borderRadius: 14, padding: 18, background: '#fffefb' },
  badge: { display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: '#111', color: 'white', padding: '4px 8px', borderRadius: 20, marginBottom: 10 },
  missionTitle: { fontSize: 20, fontWeight: 800, margin: '0 0 8px', color: '#111' },
  missionDesc: { fontSize: 15, lineHeight: 1.5, margin: '0 0 12px', color: '#222' },
  list: { margin: '0 0 10px 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  li: { fontSize: 14, lineHeight: 1.4 },
  tags: { fontSize: 11, opacity: 0.5, margin: '8px 0 0' },
  actions: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  secondary: { background: '#0a7a42', color: 'white', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  ghost: { background: 'white', border: '1px solid #ddd', borderRadius: 10, padding: '10px 14px', fontWeight: 600, cursor: 'pointer' },
  nudge: { fontSize: 12, fontStyle: 'italic', opacity: 0.6, marginTop: 10 },
  footer: { marginTop: 18, display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, opacity: 0.6, flexWrap: 'wrap' },
  link: { cursor: 'pointer', textDecoration: 'underline' },
}
