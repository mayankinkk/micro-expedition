import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MissionLog() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [filter, setFilter] = useState('all')
  const fileRefs = useRef({})

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('missions') || '[]')
    setMissions(stored)
  }, [])

  const persist = (next) => {
    setMissions(next)
    localStorage.setItem('missions', JSON.stringify(next))
  }

  const toggleComplete = (id) => {
    const next = missions.map((m) => (m.id === id ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null } : m))
    persist(next)
  }

  const updateNotes = (id, notes) => {
    const next = missions.map((m) => (m.id === id ? { ...m, notes } : m))
    persist(next)
  }

  const addPhoto = (id, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const next = missions.map((m) => (m.id === id ? { ...m, photos: [...(m.photos || []), dataUrl].slice(0, 4) } : m))
      persist(next)
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = (id, idx) => {
    const next = missions.map((m) => (m.id === id ? { ...m, photos: (m.photos || []).filter((_, i) => i !== idx) } : m))
    persist(next)
  }

  const clear = () => {
    if (!confirm('Clear all 50 stored missions?')) return
    localStorage.removeItem('missions')
    setMissions([])
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(missions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `micro-expedition-log-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportMd = () => {
    const lines = ['# micro-expedition field log', '', `Exported ${new Date().toLocaleString()} — ${missions.length} missions`, '']
    missions.forEach((m, i) => {
      lines.push(`## ${i + 1}. ${m.title} — ${m.estimatedTime}${m.completed ? ' ✓' : ''}`)
      if (m.place) lines.push(`*Place:* ${m.place} ${m.coords ? `(${m.coords})` : ''}`)
      if (m.weather) lines.push(`*Weather:* ${m.weather.conditions} • ${Math.round(m.weather.temperature)}°C • Sunrise ${m.weather.sunrise} • Sunset ${m.weather.sunset}`)
      if (m.createdAt) lines.push(`*Created:* ${new Date(m.createdAt).toLocaleString()}`)
      lines.push('', m.description, '', ...m.requirements.map((r) => `- [${m.completed ? 'x' : ' '}] ${r}`), '')
      if (m.notes) lines.push(`> Notes: ${m.notes}`, '')
      if (m.photos?.length) lines.push(`*Photos:* ${m.photos.length} attached (see JSON for data URLs)`, '')
      lines.push('---', '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `micro-expedition-log-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = missions.filter((m) => (filter === 'done' ? m.completed : filter === 'todo' ? !m.completed : true))

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.top}>
          <h1 style={styles.title}>mission log</h1>
          <button onClick={() => navigate('/')} style={styles.primary}>Generate →</button>
        </div>
        <p style={styles.sub}>Local only. Stored in browser. Add photos & notes outside, then export for your DEV post (bonus points: “take it outside, use it, tell us how it went”).</p>

        <div style={styles.tabs}>
          {['all', 'todo', 'done'].map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{ ...styles.tab, ...(filter === t ? styles.tabActive : {}) }}>
              {t} {t === 'all' ? `(${missions.length})` : t === 'done' ? `(${missions.filter((m) => m.completed).length})` : `(${missions.filter((m) => !m.completed).length})`}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={exportJson} style={styles.ghost}>Export JSON</button>
          <button onClick={exportMd} style={styles.ghost}>Export MD</button>
          <button onClick={clear} style={{ ...styles.ghost, borderColor: '#fecaca', color: '#b91c1c' }}>Clear</button>
        </div>

        {filtered.length === 0 && <p style={styles.empty}>No missions yet. Go generate one — then actually go do it and come back to add a photo.</p>}

        <div style={styles.list}>
          {filtered.map((m) => (
            <div key={m.id} style={{ ...styles.item, opacity: m.completed ? 0.97 : 1, background: m.completed ? '#f0fdf4' : 'white', borderColor: m.completed ? '#bbf7d0' : '#e9e7e1' }}>
              <div style={styles.itemTop}>
                <span style={styles.badge}>{m.estimatedTime}</span>
                {m.place && <span style={styles.placeBadge}>📍 {m.place}</span>}
                {m.completed && <span style={styles.doneBadge}>✓ done</span>}
              </div>
              {m.weather && <p style={styles.meta}>{m.weather.conditions} • {Math.round(m.weather.temperature)}°C • Sunrise {m.weather.sunrise} • Sunset {m.weather.sunset}</p>}
              <h3 style={styles.itemTitle}>{m.title}</h3>
              <p style={styles.itemDesc}>{m.description}</p>
              <ul style={styles.ul}>
                {m.requirements?.map((r) => (
                  <li key={r} style={styles.li}>{r}</li>
                ))}
              </ul>
              {m.tags?.length > 0 && <p style={styles.tags}>{m.tags.join(' • ')}</p>}
              {m.createdAt && <p style={styles.time}>{new Date(m.createdAt).toLocaleString()}</p>}

              {/* Photos */}
              {(m.photos?.length > 0) && (
                <div style={styles.photoRow}>
                  {m.photos.map((src, idx) => (
                    <div key={idx} style={styles.photoWrap}>
                      <img src={src} alt="" style={styles.photo} />
                      <button onClick={() => removePhoto(m.id, idx)} style={styles.removePhoto}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={styles.photoActions}>
                <input ref={(el) => (fileRefs.current[m.id] = el)} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => addPhoto(m.id, e.target.files[0])} />
                <button onClick={() => fileRefs.current[m.id]?.click()} style={styles.photoBtn} disabled={(m.photos?.length || 0) >= 4}>
                  + Photo {(m.photos?.length || 0)}/4
                </button>
                <span style={styles.hint}>field evidence for your DEV post</span>
              </div>

              <textarea
                value={m.notes || ''}
                onChange={(e) => updateNotes(m.id, e.target.value)}
                placeholder="Notes after you did it — what worked, what was cringe, what you'd change (this is what wins the write-up)…"
                style={styles.textarea}
                rows={2}
              />

              <label style={styles.check}>
                <input type="checkbox" checked={!!m.completed} onChange={() => toggleComplete(m.id)} />
                Mark {m.completed ? 'not done' : 'done — I touched grass'}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f8f7f4', display: 'flex', justifyContent: 'center', padding: '32px 16px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
  card: { width: '100%', maxWidth: 680, background: 'white', border: '1px solid #e9e7e1', borderRadius: 16, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#111' },
  sub: { fontSize: 13, opacity: 0.6, margin: '8px 0 14px', lineHeight: 1.5 },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
  tab: { border: '1px solid #ddd', background: 'white', borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabActive: { background: '#111', color: 'white', borderColor: '#111' },
  ghost: { background: 'white', border: '1px solid #ddd', borderRadius: 10, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  primary: { background: '#111', color: 'white', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  empty: { fontSize: 14, opacity: 0.6, background: '#f8f7f4', border: '1px dashed #ddd', borderRadius: 10, padding: 14, textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  item: { border: '1px solid #e9e7e1', borderRadius: 12, padding: 14 },
  itemTop: { display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  badge: { fontSize: 11, fontWeight: 800, background: '#111', color: 'white', padding: '3px 8px', borderRadius: 20, letterSpacing: '0.06em', textTransform: 'uppercase' },
  placeBadge: { fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#3730a3', padding: '3px 8px', borderRadius: 20, border: '1px solid #c7d2fe' },
  doneBadge: { fontSize: 11, fontWeight: 700, background: '#16a34a', color: 'white', padding: '3px 8px', borderRadius: 20 },
  meta: { fontSize: 11, opacity: 0.6, margin: '0 0 6px' },
  itemTitle: { fontSize: 16, fontWeight: 800, margin: '6px 0 6px', color: '#111' },
  itemDesc: { fontSize: 14, lineHeight: 1.5, margin: '0 0 8px', opacity: 0.85 },
  ul: { margin: '0 0 8px 18px', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  li: { fontSize: 13 },
  tags: { fontSize: 11, opacity: 0.5, margin: '6px 0 4px' },
  time: { fontSize: 11, opacity: 0.5, margin: '0 0 10px' },
  photoRow: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 8px' },
  photoWrap: { position: 'relative', width: 110, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  removePhoto: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.7)', color: 'white', cursor: 'pointer', fontWeight: 700, lineHeight: 1 },
  photoActions: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 },
  photoBtn: { border: '1px dashed #111', background: 'white', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  hint: { fontSize: 11, opacity: 0.5 },
  textarea: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 },
  check: { fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' },
}
