/** Mock login session for the demo. Not real authentication. */
export interface Session {
  businessName: string;
}

const KEY = "invoice-tracker.session";

export const DEMO_BUSINESS = "Bansal Auto Components";

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.loggedIn && typeof data.businessName === "string" && data.businessName ? { businessName: data.businessName } : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ loggedIn: true, businessName: session.businessName }));
  } catch {
    // Storage unavailable (private mode, blocked): the session just won't survive a refresh.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
