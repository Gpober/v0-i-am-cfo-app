import { NextResponse } from "next/server"
import OpenAI from "openai"

// POST /api/financial-synopsis
// Expects JSON: { data: any }
// Returns JSON: { synopsis: string }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const rawData = body.data
    if (!rawData) {
      return NextResponse.json({ error: "Missing financial data" }, { status: 400 })
    }

    const serialized =
      typeof rawData === "string" ? rawData : JSON.stringify(rawData)
    const trimmed = serialized.length > 10000 ? serialized.slice(0, 10000) : serialized

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `You are an experienced Chief Financial Officer. Review the following financial information and provide any notable alerts, risks, or insights in a concise summary.\n\n${trimmed}`

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a CFO providing helpful financial analysis." },
        { role: "user", content: prompt },
      ],
    })

    const synopsis = completion.choices[0]?.message?.content?.trim() || ""

    return NextResponse.json({ synopsis })
  } catch (err) {
    if ((err as { status?: number })?.status === 413) {
      return NextResponse.json({ error: "Synopsis data too large" }, { status: 413 })
    }
    console.error("Unable to generate synopsis", err)
    return NextResponse.json({ error: "Unable to generate synopsis" }, { status: 500 })
  }
}
