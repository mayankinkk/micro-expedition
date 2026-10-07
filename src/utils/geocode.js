export async function reverseGeocode(lat, lon) {
  // Try BigDataCloud (no key, CORS ok)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (res.ok) {
      const d = await res.json()
      const place =
        d.city ||
        d.locality ||
        d.localityInfo?.administrative?.[2]?.name ||
        d.principalSubdivision
      const region = d.principalSubdivision || d.countryName || ''
      if (place) return region && place !== region ? `${place}, ${region}` : place
    }
  } catch {}

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) }
    )
    if (res.ok) {
      const d = await res.json()
      const a = d.address || {}
      const place = a.city || a.town || a.village || a.hamlet || a.county || a.state
      const region = a.state || a.country
      if (place) return region && place !== region ? `${place}, ${region}` : place
      if (d.display_name) return d.display_name.split(',').slice(0, 2).join(', ')
    }
  } catch {}

  // Final fallback: Open-Meteo geocoding (rarely CORS)
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en`,
      { signal: AbortSignal.timeout(4000) }
    )
    if (res.ok) {
      const d = await res.json()
      const r = d.results?.[0]
      if (r) return [r.name, r.admin1].filter(Boolean).join(', ')
    }
  } catch {}

  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`
}
