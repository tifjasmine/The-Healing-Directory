import { getUser } from "./supabase-user.mjs";

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appACV3Zz7ngug6yt";
const TOKEN = () => process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "";
const TABLES = {
  directory: process.env.AIRTABLE_DIRECTORY_TABLE_ID || "tblOgiBFqw5iftDAE",
  sessions: process.env.AIRTABLE_REFERRAL_ROOM_TABLE_ID || "The Referral Room",
  attendance: process.env.AIRTABLE_ATTENDANCE_TABLE_ID || "The Referral Room Attendance",
  rules: process.env.AIRTABLE_SEAT_RULES_TABLE_ID || "Referral Room Seat Rules",
};

const SERVICE_TYPES = [
  "Acupuncturist", "Birth & Postpartum Worker", "Bodywork & Massage Therapist", "Chiropractor",
  "Clinical Supervisor", "Coach", "Educator / Facilitator / Retreat Leader",
  "Energy, Sound & Spiritual Healer", "Movement & Yoga Provider", "Nutritionist / Dietitian",
  "Occupational Therapist", "Pelvic Floor Therapist", "Physical Therapist",
  "Psychiatrist / Medication Provider", "Psychologist", "Somatic Practitioner",
  "Therapist / Counselor", "Other",
];

export default async function handler(request) {
  try {
    if (!TOKEN()) return json({ error: "AIRTABLE_TOKEN is not configured." }, 503);
    const user = requireUser(await getUser(request));
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "provider-data";

    if (request.method === "GET") {
      if (action === "provider-data") return json(await providerData(user));
      if (action === "manager-data") return json(await managerData(requireAdmin(user)));
      return json({ error: "Unknown action." }, 404);
    }

    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    const body = await request.json().catch(() => ({}));
    if (action === "request-seat") return json(await requestSeat(user, body));
    if (action === "remove-rsvp") return json(await removeRsvp(user, body));
    if (action === "create-session") return json(await createSession(requireAdmin(user), body));
    if (action === "update-request") return json(await updateRequest(requireAdmin(user), body));
    if (action === "update-session") return json(await updateSession(requireAdmin(user), body));
    return json({ error: "Unknown action." }, 404);
  } catch (error) {
    return json({ error: error.message || "Unexpected server error." }, error.status || 500);
  }
}

async function providerData(user) {
  const [sessionRecords, attendanceRecords, ruleRecords, providerRecords] = await Promise.all([
    list("sessions"), list("attendance"), list("rules"), list("directory").catch(() => []),
  ]);
  const attendance = attendanceRecords.map(normalizeAttendance);
  const providers = providerRecords.map(normalizeDirectoryProvider);
  const openSessions = sessionRecords.map((record) => normalizeSession(record, attendance, ruleRecords, providers))
    .filter((session) => !["draft", "closed", "cancelled", "canceled"].includes(lower(session.status)))
    .sort((a, b) => dateValue(a.date) - dateValue(b.date));
  const futureSessions = openSessions.filter((session) => !session.date || dateValue(session.date) >= startOfToday());
  return {
    serviceTypes: SERVICE_TYPES,
    sessions: futureSessions.length ? futureSessions : openSessions,
    attendance: attendance.filter((item) => lower(item.email) === lower(user.email) && !["cancelled", "canceled"].includes(lower(item.status))),
  };
}

async function managerData() {
  const [sessionRecords, attendanceRecords, ruleRecords, providerRecords] = await Promise.all([
    list("sessions"), list("attendance"), list("rules"), list("directory").catch(() => []),
  ]);
  const requests = attendanceRecords.map(normalizeAttendance).sort((a, b) => dateValue(b.created) - dateValue(a.created));
  const providers = providerRecords.map(normalizeDirectoryProvider);
  const sessions = sessionRecords.map((record) => normalizeSession(record, requests, ruleRecords, providers)).sort((a, b) => dateValue(a.date) - dateValue(b.date));
  return { requests, sessions, serviceTypes: SERVICE_TYPES };
}

async function requestSeat(user, body) {
  const sessionId = required(body.sessionId, "Session");
  const serviceType = required(body.serviceType, "Service type");
  const sessionRecord = await get("sessions", sessionId);
  const [attendanceRecords, ruleRecords] = await Promise.all([list("attendance"), list("rules")]);
  const existing = attendanceRecords.map(normalizeAttendance).find((item) => item.sessionId === sessionId && lower(item.email) === lower(user.email) && !["cancelled", "canceled"].includes(lower(item.status)));
  if (existing) throw httpError(409, "You already requested this Referral Room date.");

  const session = normalizeSession(sessionRecord, attendanceRecords.map(normalizeAttendance), ruleRecords);
  const rule = session.rules.find((item) => lower(item.serviceType) === lower(serviceType));
  const roomFull = session.remaining <= 0;
  const typeFull = !rule || rule.remaining <= 0 || rule.accepting === false;
  const status = roomFull || typeFull ? "Waitlist" : "Pending";
  const reason = roomFull ? "Room Full" : typeFull ? (rule ? "Provider Type Full" : "Provider Type Not Open") : "";

  const fields = {
    "Name": `${user.email} - ${session.name}`,
    "Session": [sessionId],
    "Provider Email": user.email,
    "Email": user.email,
    "Provider Name": clean(body.providerName) || displayName(user),
    "Service Type": serviceType,
    "Specialty Focus": clean(body.specialtyFocus),
    "Notes": clean(body.notes),
    "Signup Status": status,
    "Status": status,
    "Waitlist Reason": reason,
    "Attended": false,
    "Verified After Attendance": false,
  };
  removeEmpty(fields);
  const record = await create("attendance", fields);
  return { ok: true, request: normalizeAttendance(record) };
}

async function removeRsvp(user, body) {
  const id = required(body.requestId, "Request ID");
  const record = await get("attendance", id);
  const request = normalizeAttendance(record);
  if (lower(request.email) !== lower(user.email)) throw httpError(403, "You can only remove your own RSVP.");

  await remove("attendance", id);
  return { ok: true, removedId: id };
}

async function createSession(user, body) {
  const name = required(body.name, "Session name");
  const date = required(body.date, "Session date");
  const totalSeats = Math.max(1, Number(body.totalSeats || 8));
  const rules = Array.isArray(body.rules) ? body.rules.filter((item) => item.serviceType && Number(item.seatLimit) > 0) : [];
  if (!rules.length) throw httpError(400, "Choose at least one open provider type.");
  const fields = {
    "Session Name": name,
    "Session Date": date,
    "Focus": required(body.focus, "Focus"),
    "Description": required(body.description, "Description"),
    "Status": clean(body.status) || "Open",
    "Host Email": user.email,
    "Total Seats": totalSeats,
    "Notes": clean(body.notes),
  };
  removeEmpty(fields);
  const session = await create("sessions", fields);
  for (let index = 0; index < rules.length; index += 1) {
    const rule = rules[index];
    await create("rules", {
      "Name": `${name} - ${rule.serviceType}`,
      "Referral Room Event": [session.id],
      "Service Type": rule.serviceType,
      "# Seat Limit": Number(rule.seatLimit),
      "Accepting This Type": true,
      "Display Order": index + 1,
    });
  }
  return { ok: true, sessionId: session.id };
}

async function updateRequest(user, body) {
  const id = required(body.requestId, "Request ID");
  const status = clean(body.status) || "Pending";
  const attended = body.attended === true || status === "Attended";
  const verified = body.verified === true;
  const fields = {
    "Signup Status": status,
    "Status": status,
    "Waitlist Reason": clean(body.reason),
    "Attended": attended || verified,
    "Verified After Attendance": verified,
    "Manager Note": clean(body.managerNote),
  };
  removeEmpty(fields, true);
  return { ok: true, request: normalizeAttendance(await update("attendance", id, fields)), admin: user.email };
}

async function updateSession(user, body) {
  const id = required(body.sessionId, "Session ID");
  const fields = {};
  if (body.name !== undefined) fields["Session Name"] = clean(body.name);
  if (body.date !== undefined) fields["Session Date"] = clean(body.date);
  if (body.focus !== undefined) fields.Focus = clean(body.focus);
  if (body.status !== undefined) fields.Status = clean(body.status);
  if (body.description !== undefined) fields.Description = clean(body.description);
  if (body.notes !== undefined) fields.Notes = clean(body.notes);
  removeEmpty(fields, true);
  return { ok: true, session: normalizeSession(await update("sessions", id, fields), [], []), admin: user.email };
}

function normalizeSession(record, attendance, rules, providers = []) {
  const f = record.fields || {};
  const id = record.id;
  const linkedAttendance = attendance.filter((item) => item.sessionId === id);
  const acceptedAttendance = linkedAttendance.filter(isSeatHolding);
  const providerMap = {
    byEmail: new Map(providers.filter((item) => item.email).map((item) => [lower(item.email), item])),
    byId: new Map(providers.filter((item) => item.id).map((item) => [item.id, item])),
  };
  const accepted = acceptedAttendance.length;
  const totalSeats = Number(value(f, ["Total Seats", "Total Seat Cap", "Total Limit"])) || totalSeatsFromNotes(text(value(f, ["Notes"]))) || 8;
  const sessionRules = rules.map(normalizeRule).filter((rule) => rule.sessionId === id).map((rule) => {
    const approvedProviders = acceptedAttendance
      .filter((item) => providerTypeMatches(attendanceServiceType(item, providerMap), rule.serviceType))
      .map((item) => approvedProvider(item, providerMap));
    const taken = approvedProviders.length;
    return { ...rule, taken, remaining: Math.max(rule.seatLimit - taken, 0), approvedProviders };
  });
  return {
    id, name: text(value(f, ["Session Name", "Name"])) || "Referral Room",
    date: text(value(f, ["Session Date", "Date"])), focus: text(value(f, ["Focus", "Theme"])),
    status: text(value(f, ["Status"])) || "Open", description: text(value(f, ["Description"])),
    notes: text(value(f, ["Notes", "Internal Notes"])), totalSeats, accepted,
    remaining: Math.max(totalSeats - accepted, 0), rules: sessionRules,
    approvedProviders: acceptedAttendance.map((item) => approvedProvider(item, providerMap)),
  };
}

function approvedProvider(item, providerMap) {
  const provider = providerFor(item, providerMap);
  const fallbackName = item.providerName && !String(item.providerName).includes("@") ? item.providerName : "Approved provider";
  return {
    id: item.id,
    profileId: provider.id || "",
    name: provider.name || fallbackName,
    email: item.email,
    photo: provider.photo || "",
    serviceType: item.serviceType || provider.providerType || "",
    status: item.status
  };
}

function normalizeDirectoryProvider(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    name: text(value(f, ["Provider / Practice Name", "Provider Name", "Name", "Full Name", "Full Name *"])) || "Provider",
    email: text(value(f, ["Email", "Email Address", "Provider Email", "Provider Email Address", "Contact Email", "Login Email"])),
    photo: attachment(value(f, ["Profile Photo", "Photo", "Headshot", "Image"])) || text(value(f, ["Profile Photo URL", "Photo URL", "Headshot URL", "Image URL"])),
    providerType: text(value(f, ["Provider Type", "Provider Types", "Service Type"]))
  };
}

function normalizeAttendance(record) {
  const f = record.fields || {};
  const rawStatus = value(f, ["Signup Status", "Status", "RSVP Status", "Approval Status"]);
  return {
    id: record.id, sessionId: linked(value(f, ["Session Name", "Session", "Referral Room", "Referral Room Session"]))[0] || "",
    providerIds: linked(value(f, ["Provider", "Provider Record", "Provider Link", "Contact", "Member"])),
    sessionName: text(value(f, ["Session Name (from Session Name)", "Session Name", "Referral Room Name"])),
    sessionDate: text(value(f, ["Session Date (from Session Name)", "Session Date"])),
    providerName: text(value(f, ["Provider Name", "Name"])), email: text(value(f, ["Provider Email", "Email"])),
    serviceType: text(value(f, ["Service Type", "Provider Type", "Provider Type (from Provider)", "Provider Type (from Name)"])),
    specialtyFocus: text(value(f, ["Specialty Focus", "Focus"])),
    notes: text(value(f, ["Notes"])), status: text(rawStatus) || "Accepted",
    reason: text(value(f, ["Waitlist Reason", "Reason"])), attended: truthy(value(f, ["Attended"])),
    verified: truthy(value(f, ["Verified After Attendance", "Verified"])), created: text(value(f, ["Created", "Created At"])),
  };
}

function normalizeRule(record) {
  const f = record.fields || {};
  const accepting = value(f, ["Accepting This Type", "Accepting", "Open", "Active"]);
  return {
    id: record.id,
    sessionId: linked(value(f, ["Referral Room Event", "Session", "Referral Room", "Referral Room Session"]))[0] || "",
    serviceType: text(value(f, ["Service Type", "Provider Type", "Provider Category"])),
    seatLimit: Number(value(f, ["# Seat Limit", "Seat Limit", "Category Cap", "Seats"])) || 0,
    accepting: accepting === undefined || truthy(accepting)
  };
}

async function list(key) { const records = []; let offset = ""; do { const params = new URLSearchParams({ pageSize: "100" }); if (offset) params.set("offset", offset); const result = await airtable(key, "", { params }); records.push(...(result.records || [])); offset = result.offset || ""; } while (offset); return records; }
async function get(key, id) { return airtable(key, id); }
async function create(key, fields) { return airtable(key, "", { method: "POST", body: { records: [{ fields }], typecast: true } }).then((result) => result.records[0]); }
async function update(key, id, fields) { return airtable(key, id, { method: "PATCH", body: { fields, typecast: true } }); }
async function remove(key, id) { return airtable(key, id, { method: "DELETE" }); }
async function airtable(key, id = "", options = {}) {
  const query = options.params ? `?${options.params}` : "";
  const endpoint = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLES[key])}${id ? `/${encodeURIComponent(id)}` : ""}${query}`;
  const response = await fetch(endpoint, { method: options.method || "GET", headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, payload.error?.message || `Airtable request failed (${response.status}).`);
  return payload;
}

function requireUser(user) { if (!user?.email) throw httpError(401, "Please log in."); return user; }
function requireAdmin(user) { if (!(user.roles || user.app_metadata?.roles || []).includes("admin")) throw httpError(403, "Administrator access is required."); return user; }
function displayName(user) { return user.user_metadata?.full_name || user.userMetadata?.full_name || user.email.split("@")[0]; }
function value(fields, names) { for (const name of names) if (Object.prototype.hasOwnProperty.call(fields, name)) return fields[name]; return undefined; }
function text(input) { if (input == null) return ""; if (Array.isArray(input)) return input.map(text).filter(Boolean).join(", "); if (typeof input === "object") return text(input.name ?? input.label ?? input.value ?? input.text ?? ""); return clean(input); }
function attachment(input) { const first = (Array.isArray(input) ? input : input ? [input] : [])[0]; return typeof first === "string" ? first : first?.url || first?.thumbnails?.large?.url || first?.thumbnails?.small?.url || ""; }
function linked(input) { return (Array.isArray(input) ? input : input ? [input] : []).map((item) => typeof item === "object" ? clean(item.id || item.value) : clean(item)).filter((item) => item.startsWith("rec")); }
function truthy(input) { return input === true || ["true", "yes", "1", "checked", "accepted", "attended", "verified"].includes(lower(text(input))); }
function clean(input) { return String(input ?? "").replace(/\s+/g, " ").trim(); }
function lower(input) { return clean(input).toLowerCase(); }
function compact(input) { return lower(input).replace(/&/g, "and").replace(/[^a-z0-9]/g, ""); }
function providerTypeMatches(left, right) { const a = compact(left); const b = compact(right); return Boolean(a && b && (a === b || a.includes(b) || b.includes(a))); }
function providerFor(item, providerMap) { return item.providerIds?.map((id) => providerMap.byId.get(id)).find(Boolean) || providerMap.byEmail.get(lower(item.email)) || {}; }
function attendanceServiceType(item, providerMap) { const provider = providerFor(item, providerMap); return item.serviceType || provider.providerType || ""; }
function isSeatHolding(item) {
  const status = lower(item?.status);
  if (!status) return true;
  if (status.includes("cancel") || status.includes("declin") || status.includes("waitlist") || status.includes("pending")) return false;
  return status.includes("accept") || status.includes("attend") || status.includes("verified") || status.includes("approve");
}
function required(input, label) { const result = clean(input); if (!result) throw httpError(400, `${label} is required.`); return result; }
function removeEmpty(fields, keepEmpty = false) { Object.keys(fields).forEach((key) => { if (fields[key] == null || (!keepEmpty && typeof fields[key] === "string" && !fields[key])) delete fields[key]; }); }
function totalSeatsFromNotes(notes) { const match = String(notes || "").match(/Total Seats:\s*(\d+)/i); return match ? Number(match[1]) : 0; }
function dateValue(input) { const time = new Date(input || 0).getTime(); return Number.isNaN(time) ? 0 : time; }
function startOfToday() { const date = new Date(); date.setHours(0, 0, 0, 0); return date.getTime(); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
