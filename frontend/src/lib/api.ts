import { supabase } from './supabase';

const base = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:8000' : '');

export async function api<T=any>(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  
  const r = await fetch(base + path, { ...options, headers });
  if (!r.ok) {
    let e: any = {};
    try { e = await r.json(); } catch {}
    throw new Error(e.detail || `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}
