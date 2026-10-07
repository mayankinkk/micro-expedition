import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ActivityMap from './ActivityMap.jsx'
import { totalDistanceKm, formatDuration, downloadGpx } from '../utils/geo.js'

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
  const kudos = (id) => {
    const next = missions.map((m) => (m.id === id ? { ...m, kudos: (m.kudos || 0) + (m.liked ? -1 : 1), liked: !m.liked } : m))
    persist(next)
  }
  const updateNotes = (id, notes) => persist(missions.map((m) => (m.id === id ? { ...m, notes } : m)))
  const addPhoto = (id, file) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => persist(missions.map((m) => (m.id === id ? { ...m, photos: [...(m.photos || []), r.result].slice(0, 4) } : m)))
    r.readAsDataURL(file)
  }
  const rmPhoto = (id, idx) => persist(missions.map((m) => (m.id === id ? { ...m, photos: (m.photos || []).filter((_, i) => i !== idx) } : m)))
  const clear = () => {
    if (!confirm('Clear all stored activities?')) return
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
    const lines = ['# micro-expedition field log', '', `Exported ${new Date().toLocaleString()} — ${missions.length} activities`, '']
    missions.forEach((m, i) => {
      lines.push(`## ${i + 1}. ${m.title} — ${m.estimatedTime}${m.completed ? ' ✓' : ''}`)
      if (m.place) lines.push(`*Place:* ${m.place}`)
      if (m.distanceKm != null) lines.push(`*Activity:* ${m.distanceKm.toFixed(2)} km • ${formatDuration(m.durationSec || 0)} • ${m.pace || '--'}`)
      lines.push('', m.description, '', ...m.requirements.map((r) => `- [${m.completed ? 'x' : ' '}] ${r}`), '')
      if (m.notes) lines.push(`> ${m.notes}`, '')
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
  const totalKm = missions.reduce((acc, m) => acc + (m.distanceKm || totalDistanceKm(m.track) || 0), 0)
  const totalSec = missions.reduce((acc, m) => acc + (m.durationSec || 0), 0)
  const avgPace = totalKm > 0 ? `${Math.floor(totalSec / 60 / totalKm)}:${String(Math.round((totalSec / 60 / totalKm % 1) * 60)).padStart(2, '0')}/km` : '--'

  let filtered = missions.filter((m) => {
    if (filter === 'done' && !m.completed) return false
    if (filter === 'todo' && m.completed) return false
    if (q && !`${m.title} ${m.description} ${m.place || ''}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })
  if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  if (sort === 'shortest') filtered = [...filtered].sort((a, b) => parseInt(a.estimatedTime) - parseInt(b.estimatedTime))
  if (sort === 'longest') filtered = [...filtered].sort((a, b) => parseInt(b.estimatedTime) - parseInt(a.estimatedTime))
  if (sort === 'distance') filtered = [...filtered].sort((a, b) => (b.distanceKm || 0) - (a.distanceKm || 0))

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div style={s.navInner}>
          <div style={s.brand}><span style={{ color: '#FC4C02' }}>◉</span> ACTIVITY <span style={s.brandSub}>for micro-expeditions</span></div>
          <button onClick={() => navigate('/')} style={s.topBtn}>Record →</button>
        </div>
      </div>

      <div style={s.wrap}>
        <div style={s.statsBar}>
          <div style={s.statCard}><div style={s.statNum}>{total}</div><div style={s.statLab}>Activities</div></div>
          <div style={s.statCard}><div style={s.statNum}>{totalKm.toFixed(1)}<span style={s.unit}>km</span></div><div style={s.statLab}>Distance</div></div>
          <div style={s.statCard}><div style={s.statNum}>{formatDuration(totalSec)}</div><div style={s.statLab}>Moving time</div></div>
          <div style={s.statCard}><div style={s.statNum}>{avgPace}</div><div style={s.statLab}>Avg pace</div></div>
        </div>

        <div style={s.bar}>
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search feed…" style={s.search} />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={s.sort}>
            <option value="newest">Newest</option>
            <option value="distance">Distance</option>
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

        {filtered.length === 0 && <p style={s.empty}>No activities yet. Hit <b>Record →</b>, go outside, finish — it appears here in your feed.</p>}

        <div style={s.feed}>
          {filtered.map((m) => {
            const dist = m.distanceKm ?? totalDistanceKm(m.track)
            const dur = m.durationSec ?? 0
            return (
              <div key={m.id} style={{ ...s.act, borderLeft: m.completed ? '4px solid #16a34a' : '4px solid #FC4C02' }}>
                <div style={s.actHead}>
                  <div style={s.avatar}>ME</div>
                  <div>
                    <div style={s.actName}>You <span style={s.actTime}>• {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''} • 📍 {m.place || 'Unknown'}</span></div>
                    <div style={s.actTitle}>{m.title} <span style={s.actBadge}>{m.estimatedTime}</span></div>
                  </div>
                  <div style={s.actRight}>
                    {m.completed && <span style={s.done}>✓</span>}
                    <span style={s.kebab} onClick={() => downloadGpx(m.track || [], m.title)} title="Download GPX">GPX</span>
                  </div>
                </div>

                <p style={s.actDesc}>{m.description}</p>

                <div style={s.statsRow}>
                  <div><b>{dist ? dist.toFixed(2) : '0.00'}</b><span> km</span></div>
                  <div><b>{dur ? formatDuration(dur) : m.estimatedTime}</b><span> time</span></div>
                  <div><b>{m.pace || (dist ? `${Math.floor(dur / 60 / dist)}:${String(Math.round((dur / 60 / dist % 1) * 60)).padStart(2, '0')}/km` : '--')}</b><span> pace</span></div>
                  <div style={s.metaPills}>
                    {m.category && <span style={s.meta}>{m.category}</span>}
                    {m.vibe && <span style={s.meta}>{m.vibe}</span>}
                    {m.difficulty && <span style={s.meta}>{m.difficulty}</span>}
                  </div>
                </div>

                {(m.track?.length > 1 || dist > 0) ? (
                  <ActivityMap track={m.track || []} height={160} />
                ) : (
                  <div style={s.noTrack}>No GPS yet — hit <b>Start recording</b> next time for live map. Leaflet + OSM (open).</div>
                )}

                <ul style={s.ul}>
                  {m.requirements?.map((r) => <li key={r} style={s.li}>{r}</li>)}
                </ul>

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
                  <span style={s.hint}>field evidence</span>
                  {(m.track?.length > 0) && <button onClick={() => downloadGpx(m.track, m.title)} style={s.gpxBtn}>⬇ GPX</button>}
                </div>

                <textarea value={m.notes || ''} onChange={(e) => updateNotes(m.id, e.target.value)} placeholder="How was it? Honest notes win the write-up…" style={s.ta} rows={2} />

                <div style={s.actFooter}>
                  <button onClick={() => kudos(m.id)} style={{ ...s.kudos, ...(m.liked ? s.kudosLiked : {}) }}>
                    {m.liked ? '♥' : '♡'} {m.kudos || 0} Kudos
                  </button>
                  <button onClick={() => toggle(m.id)} style={s.ghostSmall}>{m.completed ? 'Undo' : '✓ Mark done'}</button>
                  <span style={s.timeAgo}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#f7f7fa', paddingBottom: 32 },
  topBar: { position: 'sticky', top: 0, zIndex: 10, background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
  navInner: { maxWidth: 760, margin: '0 auto', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontWeight: 800, letterSpacing: '0.02em', fontSize: 16, color: '#242428' },
  brandSub: { fontWeight: 400, opacity: 0.5, fontSize: 12, marginLeft: 8 },
  topBtn: { background: '#FC4C02', color: 'white', border: 'none', borderRadius: 20, padding: '8px 14px', fontWeight: 800, cursor: 'pointer' },
  wrap: { maxWidth: 760, margin: '0 auto', padding: '14px 16px 0' },
  statsBar: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 },
  statCard: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '10px', textAlign: 'center' },
  statNum: { fontSize: 18, fontWeight: 800, color: '#111' },
  unit: { fontSize: 12, fontWeight: 600, opacity: 0.5 },
  statLab: { fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 },
  bar: { display: 'flex', gap: 10, marginBottom: 10 },
  searchWrap: { flex: 1, display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '0 10px' },
  searchIcon: { opacity: 0.35, fontSize: 14 },
  search: { flex: 1, border: 'none', outline: 'none', padding: '10px 8px', fontSize: 13 },
  sort: { border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px', background: 'white', fontWeight: 600, fontSize: 13 },
  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' },
  tab: { border: '1px solid #e5e7eb', background: 'white', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  tabOn: { background: '#FC4C02', color: 'white', borderColor: '#FC4C02' },
  ghost: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  empty: { background: 'white', border: '1px dashed #ddd', borderRadius: 12, padding: 16, textAlign: 'center', fontSize: 13, opacity: 0.6 },
  feed: { display: 'flex', flexDirection: 'column', gap: 14 },
  act: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' },
  actHead: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, background: '#FC4C02', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 },
  actName: { fontSize: 13, fontWeight: 700 },
  actTime: { fontWeight: 400, opacity: 0.5, fontSize: 12 },
  actTitle: { fontSize: 16, fontWeight: 800, marginTop: 2 },
  actBadge: { fontSize: 10, background: '#111', color: 'white', padding: '2px 6px', borderRadius: 10, marginLeft: 6, verticalAlign: 'middle' },
  actRight: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' },
  done: { background: '#16a34a', color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 20 },
  kebab: { fontSize: 11, fontWeight: 800, border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: 20, cursor: 'pointer', background: '#f9f9f9' },
  actDesc: { fontSize: 13, lineHeight: 1.5, margin: '6px 0 8px', opacity: 0.85 },
  statsRow: { display: 'flex', gap: 18, padding: '8px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' },
  metaPills: { marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' },
  meta: { fontSize: 11, fontWeight: 700, background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: 20, textTransform: 'capitalize' },
  noTrack: { background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 10, padding: 12, fontSize: 12, opacity: 0.6, textAlign: 'center', marginBottom: 8 },
  ul: { margin: '6px 0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  li: { fontSize: 12.5 },
  photoRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  photoWrap: { position: 'relative', width: 100, height: 72, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  rm: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.7)', color: 'white', cursor: 'pointer', fontWeight: 700 },
  photoActions: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 },
  photoBtn: { border: '1px dashed #FC4C02', background: 'white', borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', color: '#FC4C02' },
  gpxBtn: { marginLeft: 'auto', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  hint: { fontSize: 11, opacity: 0.45 },
  ta: { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', marginTop: 6 },
  actFooter: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
  kudos: { border: '1px solid #e5e7eb', background: 'white', borderRadius: 20, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  kudosLiked: { background: '#fff1ec', borderColor: '#FC4C02', color: '#FC4C02' },
  ghostSmall: { background: 'white', border: '1px solid #e5e7eb', borderRadius: 20, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  timeAgo: { marginLeft: 'auto', fontSize: 11, opacity: 0.45 },
}
