import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LIMIT = 500

interface SearchBody {
  startDate?: string
  endDate?: string
  class?: string
  vendor?: string
  account_type?: string
  account_name?: string
  minAmount?: number
  maxAmount?: number
  search?: string
  sort?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
  cursor?: string | null
  limit?: number
}

interface Row {
  date: string
  class: string | null
  vendor: string | null
  account_name: string | null
  account_type: string | null
  memo: string | null
  amount: number
  debit: number | null
  credit: number | null
  entry_number: string | number | null
  line_number: number | null
}

interface Cursor {
  date: string
  entry_number: string | number | null
  line_number: number | null
  amount: number
}

function encodeCursor(row: Cursor) {
  return Buffer.from(JSON.stringify(row)).toString('base64')
}

function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as Cursor
}

export async function POST(req: NextRequest) {
  const body: SearchBody = await req.json()
  const limit = Math.min(body.limit ?? 100, MAX_LIMIT)
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

  const sort = body.sort || 'date_desc'
  switch (sort) {
    case 'date_asc':
      query = query
        .order('date', { ascending: true })
        .order('entry_number', { ascending: true })
        .order('line_number', { ascending: true })
      break
    case 'amount_desc':
      query = query
        .order('amount', { ascending: false })
        .order('date', { ascending: false })
        .order('entry_number', { ascending: false })
        .order('line_number', { ascending: false })
      break
    case 'amount_asc':
      query = query
        .order('amount', { ascending: true })
        .order('date', { ascending: true })
        .order('entry_number', { ascending: true })
        .order('line_number', { ascending: true })
      break
    case 'date_desc':
    default:
      query = query
        .order('date', { ascending: false })
        .order('entry_number', { ascending: false })
        .order('line_number', { ascending: false })
      break
  }

  if (body.cursor) {
    const c = decodeCursor(body.cursor)
    switch (sort) {
      case 'date_asc':
        query = query.or(
          `date.gt.${c.date},and(date.eq.${c.date},entry_number.gt.${c.entry_number}),and(date.eq.${c.date},entry_number.eq.${c.entry_number},line_number.gt.${c.line_number})`
        )
        break
      case 'amount_desc':
        query = query.or(
          `amount.lt.${c.amount},and(amount.eq.${c.amount},date.lt.${c.date}),and(amount.eq.${c.amount},date.eq.${c.date},entry_number.lt.${c.entry_number}),and(amount.eq.${c.amount},date.eq.${c.date},entry_number.eq.${c.entry_number},line_number.lt.${c.line_number})`
        )
        break
      case 'amount_asc':
        query = query.or(
          `amount.gt.${c.amount},and(amount.eq.${c.amount},date.gt.${c.date}),and(amount.eq.${c.amount},date.eq.${c.date},entry_number.gt.${c.entry_number}),and(amount.eq.${c.amount},date.eq.${c.date},entry_number.eq.${c.entry_number},line_number.gt.${c.line_number})`
        )
        break
      case 'date_desc':
      default:
        query = query.or(
          `date.lt.${c.date},and(date.eq.${c.date},entry_number.lt.${c.entry_number}),and(date.eq.${c.date},entry_number.eq.${c.entry_number},line_number.lt.${c.line_number})`
        )
        break
    }
  }

  const { data, error } = await query.limit(limit + 1)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let rows: Row[] = (data as Row[]) || []
  const hasNext = rows.length > limit
  if (hasNext) rows = rows.slice(0, limit)
  const nextCursor = hasNext ? encodeCursor(rows[rows.length - 1]) : undefined

  const pageTotalAmount = rows.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  )

  return NextResponse.json({
    rows,
    hasNext,
    nextCursor,
    aggregates: {
      count: rows.length,
      pageTotalAmount,
    },
  })
}
