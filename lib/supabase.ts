// lib/supabase.ts
// Browser client only — safe to import in 'use client' components
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createBrowserClient() {
  return _createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}