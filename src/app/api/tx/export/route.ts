import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ROWS = 50000

function escapeCSV(value: unknown) {
  const str = value === null || value === undefined ? '' : String(value)
  return '"' + str.replace(/"/g, '""') + '"'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const limit = Math.min(body.limit ?? MAX_ROWS, MAX_ROWS)

  let query = supabaseServer
    .from('journal_entry_lines')
    .select(
      `date,class,vendor,account_name,account_type,memo,amount,debit,credit,entry_number,line_number`
    )

  if (body.startDate) query = query.gte('date', body.startDate)
  if (body.endDate) query = query.lte('date', body.endDate)
  if (body.class && !['All', 'All Classes'].includes(body.class))
    query = query.eq('class', body.class)
  if (body.vendor) query = query.eq('vendor', body.vendor)
  if (body.account_type) query = query.eq('account_type', body.account_type)
  if (body.account_name) query = query.eq('account_name', body.account_name)
  if (body.minAmount !== undefined) query = query.gte('amount', body.minAmount)
  if (body.maxAmount !== undefined) query = query.lte('amount', body.maxAmount)
  if (body.search) {
    const q = `%${body.search}%`
    query = query.or(
      `memo.ilike.${q},vendor.ilike.${q},name.ilike.${q}`
    )
  }

  // default sort by date asc for export
  query = query
    .order('date', { ascending: true })
    .order('entry_number', { ascending: true })
    .order('line_number', { ascending: true })

  const { data, error } = await query.limit(limit)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []
  const header = [
    'date',
    'class',
    'vendor',
    'account_name',
    'account_type',
    'memo',
    'debit',
    'credit',
    'amount',
    'entry_number',
    'line_number',
  ]

  const csvLines = [header.join(',')]
  for (const r of rows) {
    csvLines.push(
      [
        r.date,
        r.class,
        r.vendor,
        r.account_name,
        r.account_type,
        r.memo,
        r.debit,
        r.credit,
        r.amount,
        r.entry_number,
        r.line_number,
      ].map(escapeCSV).join(',')
    )
  }

  return new NextResponse(csvLines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
    },
  })
}
