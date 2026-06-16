const SUPABASE_URL = process.env.SUPABASE_URL || "https://zpgvztndfkochixhuvaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export default async function handler(request) {
  try {
    if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
    if (!SUPABASE_SERVICE_ROLE_KEY()) return reply({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured." }, 503);

    const body = await request.json().catch(() => ({}));
    const accountType = lower(body.accountType) === "provider" ? "provider" : "client";
    const record = {
      account_type: accountType,
      full_name: required(body.name || body.fullName, "Full name"),
      email: requiredEmail(body.email),
      phone: clean(body.phone),
      website: clean(body.website),
      professional_title: clean(body.professionalTitle),
      message: clean(body.message),
      status: accountType === "client" ? "approved" : "pending"
    };
    removeEmpty(record);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/signup_requests`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY(),
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY()}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(record)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409 || payload.code === "23505") return reply({ error: "A signup request already exists for this email." }, 409);
      return reply({ error: payload.message || "Signup request could not be saved." }, response.status);
    }
    const saved = Array.isArray(payload) ? payload[0] : payload;
    return reply({ ok: true, status: saved?.status || record.status, requestId: saved?.id || "" });
  } catch (error) {
    return reply({ error: error.message || "Signup request could not be saved." }, error.status || 500);
  }
}

function required(value, label) {
  const next = clean(value);
  if (!next) throw httpError(400, `${label} is required.`);
  return next;
}

function requiredEmail(value) {
  const email = lower(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "A valid email is required.");
  return email;
}

function removeEmpty(record) {
  Object.keys(record).forEach((key) => {
    if (record[key] === "") delete record[key];
  });
}

function clean(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function reply(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
