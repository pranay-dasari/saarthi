// ─── Shared test helpers ────────────────────────────────────────────────────
// All tests import from here so configuration is in one place.

function resolveBaseUrl(): string {
  const raw = process.env.BASE_URL;
  if (!raw) return "http://localhost:3000";
  try {
    const url = new URL(raw);
    if (!url.protocol.startsWith("http")) return "http://localhost:3000";
    return url.origin; // normalised, no trailing slash
  } catch {
    return "http://localhost:3000";
  }
}
export const BASE_URL = resolveBaseUrl();
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const ADMIN_EMAIL    = "admin@app.local";
export const ADMIN_PASSWORD = "admin";
export const ADMIN_USER_ID  = "db2a5edb-b3c2-4c9c-9941-1d92f568a3ea";
export const PROFILE_ID     = "6d4ae90d-2f20-46a6-97d9-89589828b07d";

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  expiresIn: number;
  user: Record<string, unknown>;
}

export async function signIn(
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD
): Promise<AuthSession> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ?? 9999999999,
    expiresIn: data.expires_in ?? 3600,
    user: data.user,
  };
}

export function buildCookie(session: AuthSession): string {
  const payload = {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_at: session.expiresAt,
    expires_in: session.expiresIn,
    token_type: "bearer",
    user: session.user,
  };
  const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];
  return `sb-${PROJECT_REF}-auth-token=${encodeURIComponent(JSON.stringify(payload))}`;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

export async function fetchPage(
  path: string,
  cookie?: string
): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  const html = await res.text().catch(() => "");
  return { status: res.status, html };
}

export async function fetchRedirect(path: string, cookie?: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return res.headers.get("location");
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

export async function sbQuery(
  table: string,
  params: string,
  token?: string
): Promise<unknown[]> {
  const headers: Record<string, string> = { apikey: SUPABASE_KEY };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
  const data = await res.json();
  // Supabase returns an error object (not an array) when RLS blocks or table is unknown
  return Array.isArray(data) ? data : [];
}

export async function sbCount(table: string, token: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      Prefer: "count=exact",
    },
  });
  const range = res.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

export async function sbUpsert(
  table: string,
  onConflict: string,
  body: Record<string, unknown>,
  token: string
): Promise<{ ok: boolean; data: unknown }> {
  const encodedConflict = encodeURIComponent(onConflict);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodedConflict}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function sbPatch(
  table: string,
  filter: string,
  body: Record<string, unknown>,
  token: string
): Promise<{ ok: boolean }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok };
}

// ─── Content matchers ──────────────────────────────────────────────────────────

export function countIn(html: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = html.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

export function containsAll(html: string, needles: string[]): string[] {
  return needles.filter((n) => !html.includes(n));
}

export function containsNone(html: string, needles: string[]): string[] {
  return needles.filter((n) => html.toLowerCase().includes(n.toLowerCase()));
}
