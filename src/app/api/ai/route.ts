import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 })
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5',
        messages,
      }),
    })
    const data = await response.json()
    const reply = data?.choices?.[0]?.message?.content || ''
    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch AI response' }, { status: 500 })
  }
}
