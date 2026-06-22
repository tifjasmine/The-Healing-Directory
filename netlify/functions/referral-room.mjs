import { getUser } from "./supabase-user.mjs";

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appACV3Zz7ngug6yt";
const TOKEN = () => process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "";
const TABLES = {
  directory: process.env.AIRTABLE_DIRECTORY_TABLE_ID || "Directory",
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
  const providers = providerIndex(providerRecords);
  const sessions = sessionRecords.map((record) => normalizeSession(record, attendance, ruleRecords, providers))
    .filter((session) => !["draft", "closed", "cancelled", "canceled"].includes(lower(session.status)))
    .filter((session) => !session.date || dateValue(session.date) >= startOfToday())
    .sort((a, b) => dateValue(a.date) - dateValue(b.date));
  return {
    serviceTypes: SERVICE_TYPES,
    sessions,
    attendance: attendance.filter((item) => lower(item.email) === lower(user.email)),
  };
}

async function managerData() {
  const [sessionRecords, attendanceRecords, ruleRecords, providerRecords] = await Promise.all([
    list("sessions"), list("attendance"), list("rules"), list("directory").catch(() => []),
  ]);
  const providers = providerIndex(providerRecords);
  const requests = attendanceRecords.map(normalizeAttendance).sort((a, b) => dateValue(b.created) - dateValue(a.created));
  const sessions = sessionRecords.map((record) => normalizeSession(record, requests, ruleRecords, providers)).sort((a, b) => dateValue(a.date) - dateValue(b.date));
  return { requests, sessions, serviceTypes: SERVICE_TYPES };
}

async function requestSeat(user, body) {
  const sessionId = required(body.sessionId, "Session");
  const serviceType = required(body.serviceType, "Service type");
  const sessionRecord = await get("sessions", sessionId);
  const [attendanceRecords, ruleRecords] = await Promise.all([list("attendance"), list("rules")]);
  const existing = attendanceRecords.map(normalizeAttendance).find((item) => item.sessionId === sessionId && lower(item.email) === lower(user.email));
  if (existing) throw httpError(409, "You already requested this Referral Room date.");

  const session = normalizeSession(sessionRecord, attendanceRecords.map(normalizeAttendance), ruleRecords);
  const rule = findMatchingRule(session.rules, serviceType);
  const roomFull = session.remaining <= 0;
  const typeFull = Boolean(rule && (rule.remaining <= 0 || rule.accepting === false));
  const status = "Pending";
  const reason = roomFull ? "Room Full" : typeFull ? "Provider Type Full" : "";

  const fields = {
    "Name": `${user.email} - ${session.name}`,
  };
  const optionalFields = {
    "Referral Room Event": [sessionId],
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
    "Provider Type": serviceType,
    "Referral Room Seat Rule": rule ? [rule.id] : undefined,
    "Seat Rule": rule ? [rule.id] : undefined,
    "Seat Rule ID": rule?.id,
    "Session Name": [sessionId],
    "Referral Room Name": session.name,
    "Session Date": session.date,
  };
  removeEmpty(fields);
  removeEmpty(optionalFields);
  const record = await createWithOptionalFields("attendance", fields, optionalFields);
  return { ok: true, request: normalizeAttendance(record) };
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
    await createWithOptionalFields("rules", {
      "Name": `${name} - ${rule.serviceType}`,
      "Service Type": rule.serviceType,
    }, {
      "Session": [session.id],
      "Referral Room Event": [session.id],
      "Seat Limit": Number(rule.seatLimit),
      "# Seat Limit": Number(rule.seatLimit),
      "Accepting": true,
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

function normalizeSession(record, attendance, rules, providers = providerIndex([])) {
  const f = record.fields || {};
  const id = record.id;
  const linkedAttendance = attendance.filter((item) => item.sessionId === id);
  const acceptedItems = linkedAttendance.filter((item) => countsAsAccepted(item.status));
  const accepted = acceptedItems.length;
  const rawRules = rules.map(normalizeRule)
    .filter((rule) => rule.sessionId === id && rule.seatLimit > 0)
    .sort((a, b) => (a.displayOrder || 999) - (b.displayOrder || 999) || a.serviceType.localeCompare(b.serviceType));
  const explicitTotalSeats = Number(value(f, ["Total Seats", "Total Seat Cap", "Total Limit", "Seat Limit", "Capacity", "Max Seats", "Seats"])) || totalSeatsFromNotes(text(value(f, ["Notes"])));
  const totalSeats = explicitTotalSeats || rawRules.reduce((sum, rule) => sum + rule.seatLimit, 0) || 8;
  const sessionRules = rawRules.map((rule) => {
    const acceptedForRule = linkedAttendance.filter((item) => countsAsAccepted(item.status) && (
      (item.seatRuleId && item.seatRuleId === rule.id) || providerTypeMatches(providerTypeForAttendance(item, providers), rule.serviceType)
    ));
    return {
      ...rule,
      taken: acceptedForRule.length,
      remaining: Math.max(rule.seatLimit - acceptedForRule.length, 0),
      approvedProviders: acceptedForRule.map((item) => approvedProviderSummary(item, rule, providers)).filter(Boolean),
    };
  });
  const ruleRemaining = sessionRules.length ? sessionRules.filter((rule) => rule.accepting !== false).reduce((sum, rule) => sum + rule.remaining, 0) : null;
  return {
    id, name: text(value(f, ["Session Name", "Name"])) || "Referral Room",
    date: text(value(f, ["Session Date", "Date"])), focus: text(value(f, ["Focus", "Theme"])),
    status: text(value(f, ["Status"])) || "Open", description: text(value(f, ["Description"])),
    notes: text(value(f, ["Notes", "Internal Notes"])), totalSeats, accepted,
    remaining: ruleRemaining == null ? Math.max(totalSeats - accepted, 0) : Math.max(Math.min(totalSeats - accepted, ruleRemaining), 0),
    approvedProviders: acceptedItems.map((item) => approvedProviderSummary(item, {}, providers)).filter(Boolean),
    rules: sessionRules,
  };
}

function normalizeAttendance(record) {
  const f = record.fields || {};
  const linkedSessionId = linked(value(f, ["Session", "Referral Room Event", "Session Name", "Referral Room", "Referral Room Session", "Room", "Event", "Referral Room Date"]))[0] || "";
  const sessionName = text(value(f, [
    "Session Name (from Session Name)",
    "Session Name (from Referral Room Event)",
    "Session Name (from Referral Room)",
    "Session Name Lookup",
    "Session",
    "Referral Room Name",
    "Room Name",
  ])) || readableLinkedName(value(f, ["Session Name", "Referral Room Event"]));
  const sessionDate = text(value(f, [
    "Session Date (from Session Name)",
    "Session Date (from Referral Room Event)",
    "Session Date (from Referral Room)",
    "Session Date Lookup",
    "Session Date",
  ]));
  return {
    id: record.id, sessionId: linkedSessionId,
    seatRuleId: linked(value(f, ["Referral Room Seat Rule", "Seat Rule", "Provider Type Rule"]))[0] || text(value(f, ["Seat Rule ID"])),
    sessionName, sessionDate,
    providerName: text(value(f, ["Provider Name", "Name"])), email: text(value(f, ["Provider Email", "Email"])),
    providerRecordId: linked(value(f, ["Provider", "Directory Provider", "Provider Profile", "Directory Profile"]))[0] || "",
    serviceType: text(value(f, ["Service Type", "Provider Type", "Provider Type / Service", "Category"])), specialtyFocus: text(value(f, ["Specialty Focus", "Focus"])),
    notes: text(value(f, ["Notes"])), status: text(value(f, ["Signup Status", "Status"])) || "Pending",
    reason: text(value(f, ["Waitlist Reason", "Reason"])), attended: truthy(value(f, ["Attended"])),
    verified: truthy(value(f, ["Verified After Attendance", "Verified"])), created: text(value(f, ["Created", "Created At"])),
  };
}

function normalizeProvider(record) {
  const f = record.fields || {};
  const email = text(value(f, ["Email", "Provider Email", "Contact Email"]));
  const name = text(value(f, ["Name", "Full Name", "Provider Name", "Practice Name"])) || email;
  return {
    id: record.id,
    email,
    name,
    serviceType: text(value(f, ["Provider Type", "Service Type", "Profession", "Profession / Title"])),
  };
}

function providerIndex(records) {
  const providers = records.map(normalizeProvider);
  return {
    byEmail: new Map(providers.filter((item) => item.email).map((item) => [lower(item.email), item])),
    byId: new Map(providers.filter((item) => item.id).map((item) => [item.id, item])),
  };
}

function providerForAttendance(item, providers) {
  return providers.byId?.get(item.providerRecordId) || providers.byEmail?.get(lower(item.email));
}

function approvedProviderSummary(item, rule, providers) {
  const profile = providerForAttendance(item, providers);
  const id = item.providerRecordId || profile?.id || "";
  const name = profile?.name || item.providerName || item.email;
  if (!name) return null;
  return {
    name,
    email: item.email,
    serviceType: providerTypeForAttendance(item, providers) || rule.serviceType,
    profileId: id,
    profileUrl: id ? `/provider-details?id=${encodeURIComponent(id)}` : "",
  };
}

function providerTypeForAttendance(item, providers) {
  const profile = providerForAttendance(item, providers);
  return item.serviceType || profile?.serviceType || "";
}

function normalizeRule(record) {
  const f = record.fields || {};
  const acceptingValue = value(f, ["Accepting This Type", "Accepting", "Accepting Requests", "Open"]);
  return {
    id: record.id,
    sessionId: linked(value(f, ["Referral Room Event", "Session", "Referral Room", "Referral Room Session", "Room", "Event", "Referral Room Date"]))[0] || "",
    serviceType: text(value(f, ["Service Type", "Provider Type", "Provider Type / Service", "Category", "Name"])),
    seatLimit: Number(value(f, ["# Seat Limit", "Seat Limit", "Category Cap", "Seats", "Seat Cap", "Limit", "Max Seats"])) || 0,
    accepting: acceptingValue === undefined || truthy(acceptingValue),
    displayOrder: Number(value(f, ["Display Order", "Order", "Sort"])) || 999,
  };
}

async function list(key) { const records = []; let offset = ""; do { const params = new URLSearchParams({ pageSize: "100" }); if (offset) params.set("offset", offset); const result = await airtable(key, "", { params }); records.push(...(result.records || [])); offset = result.offset || ""; } while (offset); return records; }
async function get(key, id) { return airtable(key, id); }
async function create(key, fields) { return airtable(key, "", { method: "POST", body: { records: [{ fields }], typecast: true } }).then((result) => result.records[0]); }
async function createWithOptionalFields(key, requiredFields, optionalFields) {
  const optionalNames = Object.keys(optionalFields);
  let fields = { ...requiredFields, ...optionalFields };
  for (let attempt = 0; attempt <= optionalNames.length + 1; attempt += 1) {
    try {
      return await create(key, fields);
    } catch (error) {
      const missing = optionalNames.find((name) => Object.prototype.hasOwnProperty.call(fields, name) && error.message.includes(name));
      if (missing) {
        delete fields[missing];
        continue;
      }
      if (attempt === 0 && optionalNames.length) {
        fields = { ...requiredFields };
        continue;
      }
      throw error;
    }
  }
  return create(key, requiredFields);
}
async function update(key, id, fields) { return airtable(key, id, { method: "PATCH", body: { fields, typecast: true } }); }
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
function linked(input) { return (Array.isArray(input) ? input : input ? [input] : []).map((item) => typeof item === "object" ? clean(item.id || item.value) : clean(item)).filter((item) => item.startsWith("rec")); }
function readableLinkedName(input) {
  return (Array.isArray(input) ? input : input ? [input] : [])
    .map((item) => {
      if (typeof item === "object") return clean(item.name || item.label || item.value || item.text || "");
      const candidate = clean(item);
      return candidate.startsWith("rec") ? "" : candidate;
    })
    .filter(Boolean)
    .join(", ");
}
function truthy(input) { return input === true || ["true", "yes", "1", "checked", "accepted", "attended", "verified"].includes(lower(text(input))); }
function clean(input) { return String(input ?? "").replace(/\s+/g, " ").trim(); }
function lower(input) { return clean(input).toLowerCase(); }
function compact(input) { return lower(input).replace(/&/g, "and").replace(/[^a-z0-9]/g, ""); }
function providerTypeMatches(left, right) {
  const a = compact(left);
  const b = compact(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}
function findMatchingRule(rules, serviceType) {
  return rules.find((item) => providerTypeMatches(item.serviceType, serviceType)) || null;
}
function countsAsAccepted(status) {
  const value = lower(status);
  return Boolean(value && ["accept", "approv", "confirm", "attend", "verified"].some((word) => value.includes(word)));
}
function required(input, label) { const result = clean(input); if (!result) throw httpError(400, `${label} is required.`); return result; }
function removeEmpty(fields, keepEmpty = false) { Object.keys(fields).forEach((key) => { if (fields[key] == null || (!keepEmpty && typeof fields[key] === "string" && !fields[key])) delete fields[key]; }); }
function totalSeatsFromNotes(notes) { const match = String(notes || "").match(/Total Seats:\s*(\d+)/i); return match ? Number(match[1]) : 0; }
function dateValue(input) { const time = new Date(input || 0).getTime(); return Number.isNaN(time) ? 0 : time; }
function startOfToday() { const date = new Date(); date.setHours(0, 0, 0, 0); return date.getTime(); }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
