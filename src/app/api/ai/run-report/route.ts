import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSql } from '@/lib/sqlValidator';

const ALLOWLIST = (process.env.SQL_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);

export async function POST(req: NextRequest) {
  const { sql, params = {}, cursor } = await req.json();

  if (!params.tenant_id || !/tenant_id/i.test(sql)) {
    return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
  }

  try {
    validateSql(sql, ALLOWLIST);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_READ_ONLY_KEY || process.env.SUPABASE_ANON_KEY!;
  const authHeader = req.headers.get('Authorization') || '';
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  let paginatedSql = sql;
  if (!/order\s+by/i.test(paginatedSql)) {
    paginatedSql += ' ORDER BY 1';
  }
  paginatedSql += ' LIMIT 5001';

  // Example keyset pagination using a cursor column
  if (cursor && cursor.column && cursor.value !== undefined) {
    const comparator = /where/i.test(paginatedSql) ? 'AND' : 'WHERE';
    paginatedSql = paginatedSql.replace(/limit\s+5001/i, `${comparator} ${cursor.column} > $cursor ORDER BY ${cursor.column} LIMIT 5001`);
    params.cursor = cursor.value;
  }

  // Set a statement timeout of 10s
  await supabase.rpc('set_config', {
    key: 'statement_timeout',
    value: '10000',
    is_local: true,
  });

  const { data, error } = await supabase.rpc('run_sql', {
    query: paginatedSql,
    params,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let nextCursor = null;
  if (data.length === 5001) {
    const last = data[5000 - 1];
    if (cursor?.column) {
      nextCursor = last[cursor.column];
    }
    data.length = 5000;
  }

  return NextResponse.json({ rows: data, nextCursor });
}
