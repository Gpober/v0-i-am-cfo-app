import { NextResponse } from "next/server"
import OpenAI from "openai"

// POST /api/financial-synopsis
// Expects JSON: { data: string }
// Returns JSON: { synopsis: string }
export async function POST(req: Request) {
  try {
    const { data } = await req.json()
    if (!data || typeof data !== "string") {
      return NextResponse.json({ error: "Missing financial data" }, { status: 400 })
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `You are an experienced Chief Financial Officer. Review the following financial information and provide any notable alerts, risks, or insights in a concise summary.\n\n${data}`

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a CFO providing helpful financial analysis." },
        { role: "user", content: prompt },
      ],
    })

    const synopsis = completion.choices[0]?.message?.content?.trim() || ""

    return NextResponse.json({ synopsis })
  } catch {
    return NextResponse.json({ error: "Unable to generate synopsis" }, { status: 500 })
  }
}
