import { createClient, type Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { rememberAccount } from "@/lib/saved-accounts";

const KEY = "warden_account_sessions_v1";
export const ADD_ACCOUNT_KEY = "warden_adding_account_from";
type AccountTokens = { userId: string; email: string; access_token: string; refresh_token: string };

function readTokens(): AccountTokens[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is AccountTokens =>
      v && typeof v.userId === "string" && typeof v.email === "string" &&
      typeof v.access_token === "string" && typeof v.refresh_token === "string") : [];
  } catch { return []; }
}

function writeTokens(tokens: AccountTokens[]) {
  localStorage.setItem(KEY, JSON.stringify(tokens));
}

export function saveAccountSession(session: Session) {
  const email = session.user.email?.toLowerCase();
  if (!email) return;
  writeTokens([{ userId: session.user.id, email, access_token: session.access_token,
    refresh_token: session.refresh_token }, ...readTokens().filter(t => t.userId !== session.user.id)].slice(0, 5));
  rememberAccount({ email, displayName: session.user.user_metadata?.display_name ?? session.user.user_metadata?.full_name,
    avatarUrl: session.user.user_metadata?.avatar_url });
}

export function hasAccountSession(email: string) {
  return readTokens().some(t => t.email === email.toLowerCase());
}

export function forgetAccountSession(email: string) {
  try { writeTokens(readTokens().filter(t => t.email !== email.toLowerCase())); } catch { /* Storage unavailable. */ }
}

// Validate with an isolated client before replacing the active account.
// Neither stored identity metadata nor decoded JWT claims authorize switching.
export async function restoreAccountSession(email: string) {
  const tokens = readTokens().find(t => t.email === email.toLowerCase());
  if (!tokens) throw new Error("Please sign in to this account again.");
  const isolated = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await isolated.auth.setSession(tokens);
  if (error || !data.session) {
    forgetAccountSession(email);
    throw new Error("This account’s session expired. Please sign in again.");
  }
  const { data: verified, error: verifyError } = await isolated.auth.getUser();
  if (verifyError || verified.user?.id !== tokens.userId) {
    forgetAccountSession(email);
    throw new Error("Please sign in to this account again.");
  }
  saveAccountSession(data.session);
  const { error: activateError } = await supabase.auth.setSession({
    access_token: data.session.access_token, refresh_token: data.session.refresh_token,
  });
  if (activateError) throw activateError;
  sessionStorage.removeItem(ADD_ACCOUNT_KEY);
}