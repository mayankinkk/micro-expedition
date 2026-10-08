// haversine distance in km
export function distanceKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function totalDistanceKm(track) {
  if (!track || track.length < 2) return 0
  let d = 0
  for (let i = 1; i < track.length; i++) d += distanceKm(track[i - 1], track[i])
  return d
}

export function paceMinPerKm(distKm, secs) {
  if (!distKm || distKm < 0.01) return '--'
  const min = secs / 60 / distKm
  const m = Math.floor(min)
  const s = Math.round((min - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}/km`
}

export function formatDuration(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function toGpx(track, title = 'offscreen') {
  const header = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="offscreen" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${title}</name><trkseg>`
  const pts = track
    .map((p) => `  <trkpt lat="${p.lat}" lon="${p.lon}">${p.time ? `<time>${new Date(p.time).toISOString()}</time>` : ''}</trkpt>`)
    .join('\n')
  const footer = `</trkseg></trk></gpx>`
  return `${header}\n${pts}\n${footer}`
}

export function downloadGpx(track, title) {
  const gpx = toGpx(track, title)
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.gpx`
  a.click()
}
