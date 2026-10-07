import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MissionLog() {
  const navigate = useNavigate()
  const [missions, setMissions] = useState([])
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('newest')
  const fileRefs = useRef({})

  useEffect(() => {
    setMissions(JSON.parse(localStorage.getItem('missions') || '[]'))
  }, [])

  const persist = (next) => {
    setMissions(next)
    localStorage.setItem('missions', JSON.stringify(next))
  }

  const toggle = (id) => {
    const next = missions.map((m) => (m.id === id ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : null } : m))
    persist(next)
  }
  const updateNotes = (id, notes) => persist(missions.map((m) => (m.id === id ? { ...m, notes } : m)))
  const addPhoto = (id, file) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => {
      const dataUrl = r.result
      persist(missions.map((m) => (m.id === id ? { ...m, photos: [...(m.photos || []), dataUrl].slice(0, 4) } : m)))
    }
    r.readAsDataURL(file)
  }
  const rmPhoto = (id, idx) => persist(missions.map((m) => (m.id === id ? { ...m, photos: (m.photos || []).filter((_, i) => i !== idx) } : m)))
  const clear = () => {
    if (!confirm('Clear all stored missions?')) return
    localStorage.removeItem('missions')
    setMissions([])
  }
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(missions, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `micro-expedition-log-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const exportMd = () => {
    const lines = ['# micro-expedition field log', '', `Exported ${new Date().toLocaleString()} — ${missions.length} missions`, '']
    missions.forEach((m, i) => {
      lines.push(`## ${i + 1}. ${m.title} — ${m.estimatedTime}${m.completed ? ' ✓' : ''}`)
      if (m.place) lines.push(`*Place:* ${m.place}`)
      if (m.weather) lines.push(`*Weather:* ${m.weather.conditions} • ${Math.round(m.weather.temperature)}°C • Sunrise ${m.weather.sunrise} • Sunset ${m.weather.sunset}`)
      if (m.createdAt) lines.push(`*Created:* ${new Date(m.createdAt).toLocaleString()}`)
      lines.push('', m.description, '', ...m.requirements.map((r) => `- [${m.completed ? 'x' : ' '}] ${r}`), '')
      if (m.notes) lines.push(`> Notes: ${m.notes}`, '')
      if (m.photos?.length) lines.push(`*Photos:* ${m.photos.length} attached`, '')
      lines.push('---', '')
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `micro-expedition-log-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
  }

  const total = missions.length
  const done = missions.filter((m) => m.completed).length
  const hours = Math.round(missions.filter((m) => m.completed).reduce((acc, m) => acc + (parseInt(m.estimatedTime) || 0), 0) / 60 * 10) / 10
  const streak = done

  let filtered = missions.filter((m) => {
    if (filter === 'done' && !m.completed) return false
    if (filter === 'todo' && m.completed) return false
    if (q && !`${m.title} ${m.description} ${m.place || ''}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  if (sort === 'shortest') filtered = [...filtered].sort((a, b) => parseInt(a.estimatedTime) - parseInt(b.estimatedTime))
  if (sort === 'longest') filtered = [...filtered].sort((a, b) => parseInt(b.estimatedTime) - parseInt(a.estimatedTime))

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navInner}>
          <div style={s.brand}><span style={s.dot}>●</span> micro-expedition <span style={s.ver}>log</span></div>
          <button onClick={() => navigate('/')} style={s.primary}>Generate →</button>
        </div>
      </nav>

      <div style={s.wrap}>
        <div style={s.stats}>
          <div style={s.stat}><b>{total}</b><span>total</span></div>
          <div style={{ ...s.stat, background: '#f0fdf4', borderColor: '#bbf7d0' }}><b>{done}</b><span>done ✓</span></div>
          <div style={s.stat}><b>{hours}h</b><span>outside</span></div>
          <div style={s.stat}><b>{streak}</b><span>streak</span></div>
        </div>

        <div style={s.bar}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search missions, places, notes…" style={s.search} />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={s.sort}>
            <option value="newest">Newest</option>
            <option value="shortest">Shortest</option>
            <option value="longest">Longest</option>
          </select>
        </div>

        <div style={s.tabs}>
          {['all', 'todo', 'done'].map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{ ...s.tab, ...(filter === t ? s.tabOn : {}) }}>
              {t} {t === 'all' ? `(${total})` : t === 'done' ? `(${done})` : `(${total - done})`}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={exportJson} style={s.ghost}>JSON</button>
          <button onClick={exportMd} style={s.ghost}>MD</button>
          <button onClick={clear} style={{ ...s.ghost, borderColor: '#fecaca', color: '#b91c1c' }}>Clear</button>
        </div>

        {filtered.length === 0 && <p style={s.empty}>No missions match. Go generate one — then come back to add a photo.</p>}

        <div style={s.grid}>
          {filtered.map((m) => (
            <div key={m.id} style={{ ...s.card, opacity: m.completed ? 0.97 : 1, borderColor: m.completed ? '#bbf7d0' : '#e9e7e1', background: m.completed ? '#f0fdf4' : 'white' }}>
              <div style={s.cardTop}>
                <span style={s.badge}>{m.estimatedTime}</span>
                {m.place && <span style={s.place}>{m.place}</span>}
                {m.completed && <span style={s.done}>✓ done</span>}
              </div>
              <div style={s.metaRow}>
                {m.category && <span style={s.meta}>{m.category}</span>}
                {m.vibe && <span style={s.meta}>{m.vibe}</span>}
                {m.difficulty && <span style={s.meta}>{m.difficulty}</span>}
                {m.weather && <span style={s.metaSmall}>{m.weather.conditions} • {Math.round(m.weather.temperature)}°C</span>}
              </div>
              <h3 style={s.cardTitle}>{m.title}</h3>
              <p style={s.cardDesc}>{m.description}</p>
              <ul style={s.ul}>
                {m.requirements?.map((r) => <li key={r} style={s.li}>{r}</li>)}
              </ul>
              {m.createdAt && <p style={s.time}>{new Date(m.createdAt).toLocaleString()}</p>}

              {(m.photos?.length > 0) && (
                <div style={s.photoRow}>
                  {m.photos.map((src, idx) => (
                    <div key={idx} style={s.photoWrap}>
                      <img src={src} alt="" style={s.photo} />
                      <button onClick={() => rmPhoto(m.id, idx)} style={s.rm}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={s.photoActions}>
                <input ref={(el) => (fileRefs.current[m.id] = el)} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => addPhoto(m.id, e.target.files[0])} />
                <button onClick={() => fileRefs.current[m.id]?.click()} style={s.photoBtn} disabled={(m.photos?.length || 0) >= 4}>+ Photo {(m.photos?.length || 0)}/4</button>
                <span style={s.hint}>evidence for DEV post</span>
              </div>

              <textarea value={m.notes || ''} onChange={(e) => updateNotes(m.id, e.target.value)} placeholder="Notes after you did it — what worked, what was cringe…" style={s.ta} rows={2} />
              <label style={s.check}>
                <input type="checkbox" checked={!!m.completed} onChange={() => toggle(m.id)} /> Mark {m.completed ? 'not done' : 'done — I touched grass'}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: 'radial-gradient(1000px 500px at 90% 0%, #eef2ff 0%, transparent 60%), #f8f7f4', paddingBottom: 32 },
  nav: { position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e9e7e1' },
  navInner: { maxWidth: 760, margin: '0 auto', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontWeight: 800, fontSize: 15, display: 'flex', gap: 8, alignItems: 'center' },
  dot: { color: '#0a7a42' },
  ver: { fontSize: 11, opacity: 0.5, border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: 20, fontWeight: 600 },
  primary: { background: '#111', color: 'white', border: 'none', borderRadius: 12, padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '16px 16px 0' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 },
  stat: { background: 'white', border: '1px solid #e9e7e1', borderRadius: 12, padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2 },
  bar: { display: 'flex', gap: 10, marginBottom: 12 },
  searchWrap: { flex: 1, display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e9e7e1', borderRadius: 12, padding: '0 10px' },
  searchIcon: { opacity: 0.4, fontSize: 14 },
  search: { flex: 1, border: 'none', outline: 'none', padding: '10px 8px', fontSize: 13 },
  sort: { border: '1px solid #e9e7e1', borderRadius: 12, padding: '10px', background: 'white', fontWeight: 600, fontSize: 13 },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' },
  tab: { border: '1px solid #e5e7eb', background: 'white', borderRadius: 20, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tabOn: { background: '#111', color: 'white', borderColor: '#111' },
  ghost: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  empty: { background: 'white', border: '1px dashed #ddd', borderRadius: 12, padding: 16, textAlign: 'center', fontSize: 13, opacity: 0.6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  card: { border: '1px solid #e9e7e1', borderRadius: 14, padding: 14, background: 'white', display: 'flex', flexDirection: 'column', gap: 6 },
  cardTop: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  badge: { fontSize: 11, fontWeight: 800, background: '#111', color: 'white', padding: '3px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.06em' },
  place: { fontSize: 11, fontWeight: 600, background: '#eef2ff', color: '#3730a3', padding: '3px 8px', borderRadius: 20, border: '1px solid #c7d2fe' },
  done: { fontSize: 11, fontWeight: 700, background: '#16a34a', color: 'white', padding: '3px 8px', borderRadius: 20 },
  metaRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  meta: { fontSize: 11, fontWeight: 700, background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: 20, textTransform: 'capitalize' },
  metaSmall: { fontSize: 11, opacity: 0.6 },
  cardTitle: { fontSize: 16, fontWeight: 800, margin: '4px 0 2px', color: '#111' },
  cardDesc: { fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.85 },
  ul: { margin: '6px 0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  li: { fontSize: 12.5 },
  time: { fontSize: 11, opacity: 0.45, margin: '2px 0 0' },
  photoRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  photoWrap: { position: 'relative', width: 100, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  rm: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.7)', color: 'white', cursor: 'pointer', fontWeight: 700 },
  photoActions: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 },
  photoBtn: { border: '1px dashed #111', background: 'white', borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  hint: { fontSize: 11, opacity: 0.45 },
  ta: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', marginTop: 6 },
  check: { fontSize: 12, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', marginTop: 6, cursor: 'pointer' },
}
