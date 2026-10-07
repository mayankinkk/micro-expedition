export async function speakMission({ text, voiceId, modelId }) {
  // Browser native TTS fallback — works without ElevenLabs key, keeps demo offline
  // If you set VITE_ELEVENLABS_API_KEY it will try ElevenLabs first
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY
  const elevenVoiceId = voiceId || import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

  if (apiKey) {
    try {
      const body = {
        text,
        model_id: modelId || 'eleven_turbo_v2',
      }
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('ElevenLabs failed: ' + res.status)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      await audio.play()
      audio.addEventListener('ended', () => URL.revokeObjectURL(url))
      return
    } catch (e) {
      console.warn('ElevenLabs failed, falling back to Web Speech API', e)
    }
  }

  // Web Speech API fallback
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1
    u.pitch = 1
    window.speechSynthesis.speak(u)
    return
  }
  throw new Error('No TTS available')
}
