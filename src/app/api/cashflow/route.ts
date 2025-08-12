import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://crconmdpaujoeeuadgkd.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ""

const getClient = () => createClient(supabaseUrl, supabaseKey)

const startOfISOWeek = (d: Date) => {
  const date = new Date(d)
  const day = date.getUTCDay() || 7
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1))
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString().split("T")[0]
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const scope = url.searchParams.get("scope") || "All"
  const horizon = parseInt(url.searchParams.get("horizon") || "13", 10)
  const histWeeks = parseInt(url.searchParams.get("histWeeks") || "12", 10)
  const revAdj = parseFloat(url.searchParams.get("revAdjPct") || "0") / 100
  const opAdj = parseFloat(url.searchParams.get("opexAdjPct") || "0") / 100
  const arDelay = parseInt(url.searchParams.get("arDelayDays") || "0", 10)
  const startCash = parseFloat(url.searchParams.get("startCash") || "0")

  const today = new Date()
  const histStart = new Date(today)
  histStart.setDate(histStart.getDate() - histWeeks * 7)

  const supabase = getClient()

  let query = supabase
    .from("journal_entry_lines")
    .select("date, class, account_type, report_category, debit, credit")
    .gte("date", histStart.toISOString().split("T")[0])
    .lte("date", today.toISOString().split("T")[0])

  if (scope !== "All") {
    query = query.eq("class", scope)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const weeks: Record<string, { inflow: number; outflow: number }> = {}
  ;(data || []).forEach((r: any) => {
    const debit = Number(r.debit) || 0
    const credit = Number(r.credit) || 0
    const net = debit - credit
    const wk = startOfISOWeek(new Date(r.date))
    if (!weeks[wk]) weeks[wk] = { inflow: 0, outflow: 0 }
    const type = (r.account_type || "").toLowerCase()
    const cat = (r.report_category || "").toLowerCase()
    if (cat === "revenue" || type === "income" || type === "other income") {
      weeks[wk].inflow += net
    } else if (
      type === "expense" ||
      type === "other expense" ||
      type === "cost of goods sold"
    ) {
      weeks[wk].outflow += Math.abs(net)
    }
  })

  const weekVals = Object.values(weeks)
  const avgIn = weekVals.reduce((s, w) => s + w.inflow, 0) / (weekVals.length || 1)
  const avgOut = weekVals.reduce((s, w) => s + w.outflow, 0) / (weekVals.length || 1)

  const inflows = Array(horizon).fill(avgIn * (1 + revAdj))
  const outflows = Array(horizon).fill(avgOut * (1 + opAdj))

  const shift = Math.round(arDelay / 7)
  if (shift > 0) {
    for (let i = inflows.length - 1; i >= shift; i--) {
      inflows[i] = inflows[i - shift]
    }
    for (let i = 0; i < shift; i++) inflows[i] = 0
  }

  const result: any[] = []
  let cash = startCash
  for (let i = 0; i < horizon; i++) {
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const inflow = inflows[i]
    const outflow = outflows[i]
    const net = inflow - outflow
    cash += net
    result.push({
      weekStart: startOfISOWeek(weekStart),
      inflow: Number(inflow.toFixed(2)),
      outflow: Number(outflow.toFixed(2)),
      net: Number(net.toFixed(2)),
      endingCash: Number(cash.toFixed(2)),
    })
  }

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, params } = body
  const supabase = getClient()
  const { error } = await supabase
    .from("cashflow_scenarios")
    .insert({ name, params, created_at: new Date().toISOString() })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ status: "ok" })
}

