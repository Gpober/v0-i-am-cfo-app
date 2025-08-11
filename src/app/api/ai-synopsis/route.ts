import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { period, summary } = await request.json()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OpenAI API key" }, { status: 500 })
  }

  try {
    const prompt = `Provide a brief financial synopsis for ${period} with the following metrics: ${JSON.stringify(
      summary,
    )}. Include a simple projection for the next period.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a financial analyst assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("OpenAI API error:", err)
      return NextResponse.json({ error: "OpenAI API request failed" }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || "No summary available."
    return NextResponse.json({ result: text })
  } catch (error) {
    console.error("AI synopsis generation failed:", error)
    return NextResponse.json({ error: "Failed to generate synopsis" }, { status: 500 })
  }
}
