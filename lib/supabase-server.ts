// lib/supabase-server.ts
// Server-only — never import this in 'use client' components
import { createServerClient as _createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL             = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function createServerClient() {
  const cookieStore = await cookies()
  return _createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll()             { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  })
}

export async function createAdminClient() {
  const cookieStore = await cookies()
  return _createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll()             { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}