export async function generateWithGemma(prompt, context) {
  const body = {
    model: 'gemma:2b',
    prompt,
    stream: false,
  }
  if (context) body.context = context

  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Gemma API request failed: ' + res.status)
  const data = await res.json()
  return data.response
}

export async function getGemmaContext() {
  try {
    const res = await fetch('http://localhost:11434/api/tags')
    if (!res.ok) return []
    const data = await res.json()
    const models = data.models || []
    const gemma = models.find((m) => m.name.toLowerCase().includes('gemma'))
    return gemma ? [0] : []
  } catch {
    return []
  }
}
