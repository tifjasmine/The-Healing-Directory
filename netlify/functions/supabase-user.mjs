const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export async function getUser(request) {
  const authorization = request?.headers?.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token) throw new Error("This endpoint requires a valid Bearer token");

  const key = SUPABASE_ANON_KEY() || SUPABASE_SERVICE_ROLE_KEY();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error || "This endpoint requires a valid Bearer token");
  return normalizeUser(payload);
}

function normalizeUser(user = {}) {
  const metadata = user.user_metadata || {};
  const appMetadata = user.app_metadata || {};
  const roles = appMetadata.roles || metadata.roles || [];
  return {
    ...user,
    email: user.email || "",
    name: metadata.full_name || metadata.name || "",
    roles: Array.isArray(roles) ? roles : [roles].filter(Boolean),
    user_metadata: metadata,
    userMetadata: metadata,
    app_metadata: appMetadata
  };
}
