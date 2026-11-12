// Remembers accounts the visitor has signed in with on this device so the
// sign-in page and account menu can show remembered identities. Session tokens
// are handled separately by account-sessions; passwords are never stored.

export interface SavedAccount {
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

const STORAGE_KEY = "warden_saved_accounts";
const MAX_ACCOUNTS = 5;

export function listSavedAccounts(): SavedAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (a): a is SavedAccount =>
          !!a && typeof a.email === "string" && a.email.length > 0,
      )
      .slice(0, MAX_ACCOUNTS);
  } catch {
    return [];
  }
}

export function rememberAccount(account: SavedAccount): void {
  const email = account.email.trim().toLowerCase();
  if (!email) return;
  const rest = listSavedAccounts().filter(
    (a) => a.email.toLowerCase() !== email,
  );
  const next: SavedAccount[] = [
    {
      email,
      displayName: account.displayName?.trim() || undefined,
      avatarUrl: account.avatarUrl?.trim() || undefined,
    },
    ...rest,
  ].slice(0, MAX_ACCOUNTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode etc.) — switching still works, it
    // just won't remember accounts.
  }
}

export function removeSavedAccount(email: string): void {
  const target = email.trim().toLowerCase();
  const next = listSavedAccounts().filter(
    (a) => a.email.toLowerCase() !== target,
  );
  try {
    if (next.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
