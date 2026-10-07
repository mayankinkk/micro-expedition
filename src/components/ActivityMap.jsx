import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function ActivityMap({ track, height = 140 }) {
  const ref = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }
    if (!track || track.length === 0) {
      // empty map centered on Delhi
      const m = L.map(ref.current, { zoomControl: false, attributionControl: false }).setView([28.6139, 77.209], 11)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(m)
      mapRef.current = m
      return
    }
    const latlngs = track.map((p) => [p.lat, p.lon])
    const m = L.map(ref.current, { zoomControl: false, attributionControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(m)
    const poly = L.polyline(latlngs, { color: '#FC4C02', weight: 4, opacity: 0.95 }).addTo(m)
    // start/end markers
    L.circleMarker(latlngs[0], { radius: 6, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }).addTo(m)
    if (latlngs.length > 1) L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#fff', weight: 2, fillColor: '#111', fillOpacity: 1 }).addTo(m)
    m.fitBounds(poly.getBounds().pad(0.25), { animate: false })
    mapRef.current = m
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [JSON.stringify(track)])

  return <div ref={ref} style={{ height, borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f3f4f6' }} />
}
