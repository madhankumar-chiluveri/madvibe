const STORAGE_KEY = "madvibe_accounts";

export interface SavedAccount {
  userId: string;
  email: string;
  name: string;
  image?: string;
  /** Preferred sign-in method for this account on this device. */
  provider: "google" | "password";
  lastUsed: number;
}

/** Returns all saved accounts sorted by most recently used first. */
export function getAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Upserts an account entry. Puts it first in the list (most recently used).
 * Caps the list at 5 accounts.
 */
export function saveAccount(account: Omit<SavedAccount, "lastUsed">): void {
  if (typeof window === "undefined") return;
  const existing = getAccounts().filter((a) => a.userId !== account.userId);
  const updated: SavedAccount[] = [
    { ...account, lastUsed: Date.now() },
    ...existing,
  ].slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Removes an account from the saved list (e.g. user explicitly signs out & forgets). */
export function removeAccount(userId: string): void {
  if (typeof window === "undefined") return;
  const updated = getAccounts().filter((a) => a.userId !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
