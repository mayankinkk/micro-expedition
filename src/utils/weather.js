export async function fetchWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code&daily=sunrise,sunset&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()

  const current = data.current || {}
  const daily = data.daily || {}

  const temperature = current.temperature_2m ?? 0
  const precipitation = current.precipitation ?? 0
  // Open-Meteo weather_code -> human string (simple map)
  const code = current.weather_code
  const conditions = weatherCodeToString(code)

  const sunset = daily.sunset?.[0] ? new Date(daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'
  const sunrise = daily.sunrise?.[0] ? new Date(daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'

  return {
    temperature,
    conditions,
    sunset,
    sunrise,
    precipitation,
    rawCode: code,
  }
}

function weatherCodeToString(code) {
  if (code == null) return 'unknown'
  if (code === 0) return 'clear'
  if ([1, 2, 3].includes(code)) return 'partly cloudy'
  if ([45, 48].includes(code)) return 'foggy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle'
  if ([61, 63, 65, 66, 67].includes(code)) return 'rain'
  if ([71, 73, 75, 77].includes(code)) return 'snow'
  if ([80, 81, 82].includes(code)) return 'rain showers'
  if ([95, 96, 99].includes(code)) return 'thunderstorm'
  return `code-${code}`
}
