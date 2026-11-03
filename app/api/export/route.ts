import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase'

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]).join(',')
  const body    = rows.map(row => Object.values(row).map(escapeCell).join(',')).join('\n')
  return `${headers}\n${body}`
}

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')
  const table = searchParams.get('table') ?? 'query_logs'

  const admin = await createAdminClient()
  let csv = ''

  if (table === 'feedback') {
    let q = admin
      .from('query_logs')
      .select(`id, created_at, user_email, query_text, response_text, model, latency_ms, session_id, feedback_ratings ( rating, thumbs, comment )`)
      .order('created_at', { ascending: true })

    if (from) q = q.gte('created_at', from)
    if (to)   q = q.lte('created_at', `${to}T23:59:59Z`)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const flat = (data ?? []).map(row => {
      const fb = Array.isArray(row.feedback_ratings) ? row.feedback_ratings[0] : null
      return {
        id:            row.id,
        created_at:    row.created_at,
        user_email:    row.user_email,
        query_text:    row.query_text,
        response_text: row.response_text,
        model:         row.model,
        latency_ms:    row.latency_ms,
        session_id:    row.session_id,
        rating:        fb?.rating  ?? '',
        thumbs:        fb?.thumbs  ?? '',
        fb_comment:    fb?.comment ?? '',
      }
    })
    csv = toCsv(flat)
  } else {
    let q = admin
      .from('query_logs')
      .select('id, created_at, user_email, query_text, response_text, model, latency_ms, session_id')
      .order('created_at', { ascending: true })

    if (from) q = q.gte('created_at', from)
    if (to)   q = q.lte('created_at', `${to}T23:59:59Z`)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    csv = toCsv((data ?? []) as Record<string, unknown>[])
  }

  const filename = `genai4di_${table}_${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}