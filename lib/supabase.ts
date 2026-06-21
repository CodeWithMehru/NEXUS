import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient as createRawClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * NEXUS AI — Supabase clients.
 * Three flavors:
 *   - browser:  for "use client" components (uses anon key, RLS-bound)
 *   - server:   for Server Components / Route Handlers (cookie-bound auth)
 *   - admin:    for privileged server-only inserts (service role key)
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase env missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }
}

// --------------------------------------------------------------------------
// Browser client — safe to call from "use client"
// --------------------------------------------------------------------------
export function createSupabaseBrowserClient() {
  assertConfig();
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

// --------------------------------------------------------------------------
// Server client — pass the cookies() store from a Route Handler / Server Comp.
// Caller must do:  import { cookies } from "next/headers"; const cookieStore = await cookies();
// --------------------------------------------------------------------------
type CookieStore = {
  get(name: string): { value: string } | undefined;
  set?(name: string, value: string, options?: Record<string, unknown>): void;
};

export function createSupabaseServerClient(cookieStore: CookieStore) {
  assertConfig();
  type CookieToSet = {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  };
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        const store = cookieStore as unknown as {
          getAll?: () => { name: string; value: string }[];
        };
        return store.getAll?.() ?? [];
      },
      setAll(toSet: CookieToSet[]) {
        try {
          toSet.forEach(({ name, value, options }) => {
            cookieStore.set?.(name, value, options);
          });
        } catch {
          // Server Component context — cookie mutations not allowed; safe to ignore.
        }
      },
    },
  });
}

// --------------------------------------------------------------------------
// Admin client — bypasses RLS. Use ONLY in server routes.
// --------------------------------------------------------------------------
let _admin: SupabaseClient | null = null;
export function createSupabaseAdminClient(): SupabaseClient {
  assertConfig();
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Required for server-side privileged writes.",
    );
  }
  if (_admin) return _admin;
  _admin = createRawClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/**
 * isSupabaseConfigured — for graceful UI fallbacks when env is missing.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
