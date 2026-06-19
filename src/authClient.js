const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SESSION_KEY = "thd_supabase_session";

let fetchPatched = false;

installAuthenticatedFetch();

export async function signup(email, password, metadata = {}) {
  return authRequest("/auth/v1/signup", {
    email,
    password,
    data: metadata,
    options: { emailRedirectTo: `${window.location.origin}/login` }
  });
}

export async function login(email, password) {
  const session = await authRequest("/auth/v1/token?grant_type=password", { email, password });
  storeSession(session);
  return normalizeUser(session.user);
}

export async function logout() {
  const session = getSession();
  if (session?.access_token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(session.access_token)
    }).catch(() => null);
  }
  clearSession();
}

export async function getUser() {
  const session = await ensureSession();
  if (!session?.access_token) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(session.access_token)
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  return normalizeUser(await response.json());
}

export async function updateUser(updates = {}) {
  const session = await ensureSession();
  if (!session?.access_token) throw new Error("Please log in.");
  const body = {};
  if (updates.password) body.password = updates.password;
  if (updates.email) body.email = updates.email;
  if (updates.userMetadata || updates.data) body.data = updates.userMetadata || updates.data;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: authHeaders(session.access_token),
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error || "Account could not be updated.");
  return normalizeUser(payload);
}

export async function requestPasswordRecovery(email) {
  return authRequest("/auth/v1/recover", {
    email,
    gotrue_meta_security: {},
    redirect_to: `${window.location.origin}/reset-password`
  });
}

export async function acceptInvite(_token, password) {
  return updateUser({ password });
}

export async function handleAuthCallback() {
  const hash = window.location.hash || "";
  if (!hash.includes("access_token=") && !hash.includes("refresh_token=")) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const session = {
    access_token: params.get("access_token") || "",
    refresh_token: params.get("refresh_token") || "",
    expires_in: Number(params.get("expires_in") || 3600),
    expires_at: Math.floor(Date.now() / 1000) + Number(params.get("expires_in") || 3600),
    token_type: params.get("token_type") || "bearer"
  };
  storeSession(session);
  window.history.replaceState({}, "", window.location.pathname + window.location.search);
  const type = params.get("type") || (params.get("token_type") ? "login" : "");
  const user = await getUser();
  return { type, token: session.access_token, user };
}

export async function refreshSession() {
  return ensureSession(true);
}

export function getAccessToken() {
  return getSession()?.access_token || "";
}

function installAuthenticatedFetch() {
  if (fetchPatched || typeof window === "undefined" || !window.fetch) return;
  fetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("/.netlify/functions/")) {
      const token = getAccessToken();
      if (token) {
        const headers = new Headers(init.headers || {});
        headers.set("Authorization", `Bearer ${token}`);
        init = { ...init, headers };
      }
    }
    return originalFetch(input, init);
  };
}

async function authRequest(path, body) {
  if (!SUPABASE_ANON_KEY) throw new Error("Supabase public anon key is not configured.");
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || "Authentication could not be completed.");
  if (payload.access_token) storeSession(payload);
  return payload;
}

async function ensureSession(force = false) {
  const session = getSession();
  if (!session?.access_token) return null;
  const expiresAt = Number(session.expires_at || 0);
  const shouldRefresh = force || (session.refresh_token && expiresAt && expiresAt < Math.floor(Date.now() / 1000) + 60);
  if (!shouldRefresh) return session;
  const refreshed = await authRequest("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: session.refresh_token
  }).catch(() => null);
  return refreshed || getSession();
}

function authHeaders(accessToken = "") {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json"
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function storeSession(session) {
  if (!session?.access_token) return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function normalizeUser(user = {}) {
  if (!user?.email) return null;
  const metadata = user.user_metadata || user.userMetadata || {};
  const appMetadata = user.app_metadata || {};
  const roles = appMetadata.roles || metadata.roles || [];
  return {
    ...user,
    id: user.id,
    email: user.email,
    name: metadata.full_name || metadata.name || user.name || "",
    roles: Array.isArray(roles) ? roles : [roles].filter(Boolean),
    user_metadata: metadata,
    userMetadata: metadata,
    app_metadata: appMetadata
  };
}
