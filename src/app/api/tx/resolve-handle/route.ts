import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ResolveBody {
  handle: string
  limit?: number
}

function monthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export async function POST(req: NextRequest) {
  const body: ResolveBody = await req.json()
  if (!body.handle) {
    return NextResponse.json({ error: 'handle required' }, { status: 400 })
  }

  const [kind, vendor, ym, cls] = body.handle.split(':')
  const filters: Record<string, unknown> = {}
  if (body.limit) filters.limit = body.limit

  if (kind === 'vd') {
    filters.vendor = vendor
    if (cls && !['All', 'All Classes'].includes(cls)) filters.class = cls
    if (ym) {
      const [y, m] = ym.split('-').map((v) => parseInt(v, 10))
      const start = new Date(y, m - 1, 1)
      const end = monthEnd(start)
      filters.startDate = `${y}-${String(m).padStart(2, '0')}-01`
      filters.endDate = `${y}-${String(m).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    }
  } else {
    return NextResponse.json({ error: 'unknown handle' }, { status: 400 })
  }

  return NextResponse.json({ path: '/api/tx/search', body: filters })
}
