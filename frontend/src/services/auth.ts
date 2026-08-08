const AUTH_SESSION_KEY = "auth_session";

export type AuthUser = {
  email: string;
  name: string;
};

export type AuthSession = {
  provider: "supabase";
  accessToken: string;
  user: AuthUser;
};

export function getAuthSession(): AuthSession | null {
  const savedSession = localStorage.getItem(AUTH_SESSION_KEY);

  if (savedSession) {
    try {
      return JSON.parse(savedSession) as AuthSession;
    } catch {
      return null;
    }
  }

  return null;
}

export function getAuthToken() {
  return getAuthSession()?.accessToken ?? null;
}

export function getAuthProvider() {
  return getAuthSession()?.provider ?? null;
}

export function getAuthUser(): AuthUser | null {
  return getAuthSession()?.user ?? null;
}

export function setAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

export function hasAuthSession() {
  return Boolean(getAuthToken());
}

export function getAuthDisplayName() {
  return getAuthUser()?.name ?? "Signed in user";
}