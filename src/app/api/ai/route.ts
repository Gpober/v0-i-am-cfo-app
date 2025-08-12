import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const config = { api: { bodyParser: { sizeLimit: '5mb' } } }

function isValidDate(str: string) {
  return !isNaN(Date.parse(str))
}

export async function POST(req: NextRequest) {
  try {
    const {
      startDate,
      endDate,
      class: className,
      model = 'gpt-4.1-mini',
      source,
    } = await req.json()

    if (
      source !== 'supabase' ||
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      !className
    ) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let query = supabaseServer
      .from('journal_entry_lines_rows')
      .select(
        'class, class_name, account_name, account_type, report_category, vendor, debit, credit, amount, is_cash_account'
      )
      .gte('date', startDate)
      .lte('date', endDate)

    const isAll =
      className === 'All' ||
      className === 'All Classes' ||
      className === 'All Class'
    if (!isAll) {
      const escaped = String(className).replace(/"/g, '\\"')
      query = query.or(`class.eq."${escaped}",class_name.eq."${escaped}"`)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data || []
    const numTransactions = rows.length
    const vendorSet = new Set<string>()
    const accountSet = new Set<string>()
    let revenue = 0
    let expenses = 0
    let cashIn = 0
    let cashOut = 0
    const cashAccountTypes = new Set([
      'Bank',
      'Credit Card',
      'Cash on hand',
      'Other Current Asset',
    ])

    const byAccountTypeMap: Record<string, number> = {}
    const byClassMap: Record<string, { revenue: number; expenses: number }> = {}
    const vendorMap: Record<string, number> = {}

    for (const r of rows) {
      if (r.vendor) vendorSet.add(r.vendor)
      if (r.account_name) accountSet.add(r.account_name)

      const amt = Number(r.amount) || 0
      const debit = Number(r.debit) || 0
      const credit = Number(r.credit) || 0

      const isRevenue =
        r.report_category === 'Income' || r.account_type === 'Income'
      const isExpense =
        r.report_category === 'Expense' || r.account_type === 'Expense'

      if (isRevenue) {
        revenue += amt
      } else if (isExpense) {
        expenses += amt
        if (r.vendor) vendorMap[r.vendor] = (vendorMap[r.vendor] || 0) + amt
      }

      const isCash =
        r.is_cash_account || cashAccountTypes.has(r.account_type)
      if (isCash) {
        cashIn += credit
        cashOut += debit
      }

      const at = r.account_type || 'Unknown'
      byAccountTypeMap[at] = (byAccountTypeMap[at] || 0) + amt

      if (className === 'All') {
        const cls = r.class || r.class_name || 'Unassigned'
        if (!byClassMap[cls]) {
          byClassMap[cls] = { revenue: 0, expenses: 0 }
        }
        if (isRevenue) byClassMap[cls].revenue += amt
        else if (isExpense) byClassMap[cls].expenses += amt
      }
    }

    const netIncome = revenue - expenses
    const byAccountType = Object.entries(byAccountTypeMap).map(
      ([account_type, amount]) => ({ account_type, amount })
    )
    const byClass =
      className === 'All'
        ? Object.entries(byClassMap).map(([cls, { revenue, expenses }]) => ({
            class: cls,
            revenue,
            expenses,
            netIncome: revenue - expenses,
          }))
        : []

    const topVendors = Object.entries(vendorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([vendor, amount]) => ({ vendor, amount }))

    const avgAccountAmount =
      byAccountType.reduce((s, a) => s + Math.abs(a.amount), 0) /
      (byAccountType.length || 1)
    const anomalies = byAccountType
      .filter((a) => Math.abs(a.amount) > 2 * avgAccountAmount)
      .map((a) => ({
        dimension: 'account_type',
        name: a.account_type,
        reason: 'amount >2x average across account types',
        amount: a.amount,
      }))

    const summary = {
      period: { startDate, endDate, class: className },
      counts: {
        numTransactions,
        numVendors: vendorSet.size,
        numAccounts: accountSet.size,
      },
      totals: {
        revenue,
        expenses,
        netIncome,
        cash: { cashIn, cashOut },
      },
      byAccountType,
      ...(className === 'All' ? { byClass } : {}),
      topVendors,
      anomalies,
    }

    if (new URL(req.url).searchParams.get('debug') === '1') {
      return NextResponse.json({ summary, aiInsights: '[debug] skipped OpenAI' })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY' },
        { status: 500 }
      )
    }

    const prompt =
      'You are an AI CFO. Analyze this summarized financial packet and produce:\n1) A concise narrative of the period\n2) 3–7 actionable insights\n3) Notable anomalies to investigate (why & next step)\nKeep it operator-practical and specific.'

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions: prompt,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify(summary),
              },
            ],
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const details = await openaiRes
        .json()
        .catch(async () => ({ raw: await openaiRes.text() }))
      console.error('OpenAI error:', details)
      return NextResponse.json(
        { error: 'OpenAIError', details },
        { status: openaiRes.status }
      )
    }

    const aiJson = await openaiRes.json()
    const aiInsights =
      aiJson?.output?.[0]?.content?.[0]?.text ||
      aiJson?.choices?.[0]?.message?.content ||
      ''

    return NextResponse.json({ summary, aiInsights })
  } catch (e: unknown) {
    console.error('AI route error', e)
    return NextResponse.json(
      {
        error: 'ServerError',
        message: (e as Error)?.message ?? 'Unknown error',
      },
      { status: 500 }
    )
  }
}
