import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export const runtime = "node"

interface GradeRequest {
  startDate?: string
  endDate?: string
  classes?: string[]
  properties?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GradeRequest

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase credentials" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    let query = supabase
      .from("journal_entry_lines")
      .select("amount, account_type, account_name, class, property, date")
      .limit(3000)

    if (body.startDate) query = query.gte("date", body.startDate)
    if (body.endDate) query = query.lte("date", body.endDate)
    if (body.classes && body.classes.length > 0)
      query = query.in("class", body.classes)
    if (body.properties && body.properties.length > 0)
      query = query.in("property", body.properties)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: "Database query failed", details: error.message },
        { status: 500 }
      )
    }

    const summary = summarize(data || [])

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI credentials" },
        { status: 500 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const prompt = `You are an experienced CFO. Analyze the following financial summary and return JSON with keys: grade, reasoning, insights (array).\n\nData: ${JSON.stringify(
      summary
    )}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert financial analyst." },
        { role: "user", content: prompt },
      ],
    })

    const text = completion.choices[0]?.message?.content || ""
    let result
    try {
      result = JSON.parse(text)
    } catch {
      result = { grade: "N/A", reasoning: text, insights: [] }
    }

    return NextResponse.json({ data: result })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected error", details: err.message },
      { status: 500 }
    )
  }
}

function summarize(rows: any[]) {
  let revenue = 0
  let expenses = 0
  const expenseByAccount: Record<string, number> = {}

  for (const r of rows) {
    const amt = Number(r.amount) || 0
    const type = (r.account_type || "").toLowerCase()
    if (type.includes("income")) {
      revenue += amt
    } else if (type.includes("expense") || type.includes("cost")) {
      expenses += amt
      const name = r.account_name || "Other"
      expenseByAccount[name] = (expenseByAccount[name] || 0) + amt
    }
  }

  const topExpenses = Object.entries(expenseByAccount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => ({ name, total }))

  return {
    totalRevenue: revenue,
    totalExpenses: expenses,
    netIncome: revenue - expenses,
    topExpenses,
  }
}
