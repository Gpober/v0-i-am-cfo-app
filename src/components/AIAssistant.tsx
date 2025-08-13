'use client'

import { useEffect, useState } from 'react'
import { fetchAiInsights, AiFilters } from '@/utils/fetchAi'

interface Props {
  filters: Omit<AiFilters, 'source'>
}

export default function AIAssistant({ filters }: Props) {
  const [insights, setInsights] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const data = await fetchAiInsights({ ...filters, source: 'supabase' })
        setInsights(data.aiInsights)
      } catch {
        setInsights('Unable to load insights at this time.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [filters])

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Financial Insights</h3>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">
        {loading ? 'Analyzing data...' : insights || 'No insights available.'}
      </div>
    </div>
  )
}
