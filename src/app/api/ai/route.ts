import { NextRequest, NextResponse } from 'next/server'

async function callOpenAI(messages: unknown, model: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI error ${response.status}`)
  }

  const data = await response.json()
  return data?.choices?.[0]?.message?.content || ''
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 })
  }

  try {
    let reply
    try {
      reply = await callOpenAI(messages, 'gpt-5', apiKey)
    } catch (err) {
      console.error('GPT-5 request failed, falling back to GPT-4o-mini', err)
      reply = await callOpenAI(messages, 'gpt-4o-mini', apiKey)
    }
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch AI response'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
