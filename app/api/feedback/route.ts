import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { queryLogId, rating, thumbs, comment } = await request.json() as {
    queryLogId: string
    rating:     number
    thumbs?:    'up' | 'down'
    comment?:   string
  }

  if (!queryLogId || !rating) {
    return NextResponse.json(
      { error: 'queryLogId and rating are required' },
      { status: 400 }
    )
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('feedback_ratings')
    .insert({
      query_log_id: queryLogId,
      user_id:      user.id,
      rating,
      thumbs:  thumbs  ?? null,
      comment: comment ?? null,
    })

  if (error) {
    console.error('Feedback insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}