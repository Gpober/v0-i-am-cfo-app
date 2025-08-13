export interface AiFilters {
  source: string
  startDate: string
  endDate: string
  class: string
  model?: string
}

export async function fetchAiInsights(filters: AiFilters) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  })
  if (!res.ok) throw new Error('AI request failed')
  return res.json()
}
