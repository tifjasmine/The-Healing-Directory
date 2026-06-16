import { getUser } from "@netlify/identity";

const BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_DIRECTORY_BASE_ID || "appACV3Zz7ngug6yt";
const TOKEN = () => process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "";

const TABLES = {
  directory: process.env.AIRTABLE_DIRECTORY_TABLE_ID || "tblOgiBFqw5iftDAE",
  events: process.env.AIRTABLE_EVENTS_TABLE_ID || "Events",
  savedEvents: process.env.AIRTABLE_SAVED_EVENTS_TABLE_ID || "Saved Events",
  savedProviders: process.env.AIRTABLE_SAVED_PROVIDERS_TABLE_ID || "Saved Providers",
  referralRoom: process.env.AIRTABLE_REFERRAL_ROOM_TABLE_ID || "The Referral Room",
  attendance: process.env.AIRTABLE_ATTENDANCE_TABLE_ID || "The Referral Room Attendance",
  seatRules: process.env.AIRTABLE_SEAT_RULES_TABLE_ID || "Referral Room Seat Rules",
  connections: process.env.AIRTABLE_CONNECTIONS_TABLE_ID || "Provider Connections"
};

const FIELDS = {
  provider: {
    name: ["Provider / Practice Name", "Provider Name", "Name", "Full Name"],
    email: ["Email", "Provider Email"], phone: ["Phone", "Phone Number"],
    accountType: ["Account Type", "User Type", "Member Type", "Role"],
    photo: ["Profile Photo", "Photo", "Headshot", "Image"],
    bio: ["Provider Bio", "Bio", "About", "Description"],
    profession: ["Professional Title", "Profession", "Credentials", "Service Type"],
    license: ["License / Certification", "License # / Certification", "License", "Credentials"],
    identity: ["Racial / Ethnic Identity", "Identity"],
    pronouns: ["Pronouns"], type: ["Service Type", "Provider Type", "Provider Types"],
    services: ["Additional Services", "Services Offered", "Services"],
    support: ["Areas of Support"],
    population: ["Populations Served", "Who I Serve", "Population"],
    location: ["State", "Location", "Virtual/In Person", "Neighborhood"],
    payment: ["Payment", "Pay Type", "Insurance", "Additional Payment"],
    availability: ["Availability"],
    price: ["Price", "Pricing"],
    physicalLocations: ["Physical Locations", "Physical Location"],
    availabilitySpecifics: ["Availability Specifics", "Current Availability"],
    website: ["Website", "Web Site"], consult: ["Consultation Link", "Booking Link", "Schedule Link"],
    approved: ["Approved", "Published", "Show in Directory", "Public"],
    verified: ["Verified", "Verified Member", "Referral Room"],
    responseTime: ["Typical Response Time", "Response Time"],
    referralMethod: ["Preferred Referral Method"],
    referralInstructions: ["Referral Instructions"],
    collaboration: ["Collaboration", "Collaboration Interests"],
    collaborationInterests: ["Collaboration Interests"],
    collaborationDetails: ["Collaboration Details", "Provider Discount Details"],
    providerNotes: ["Provider-to-Provider Notes", "Provider Notes"],
    infoOptIn: ["Directory Updates Opt In", "Info Opt In", "Newsletter"],
    human: ["The Human Side", "Human Side"],
    styleWords: ["My Style In Three Words", "Style In Three Words"],
    clientDescriptors: ["Clients Describe Me As", "Clients Describe Me"],
    groundingRitual: ["My Grounding Ritual", "Grounding Ritual"],
    outsideSessions: ["Outside Sessions", "Outside of Sessions"],
    guidingBelief: ["Guiding Belief", "A Belief That Guides My Work"],
    healingWish: ["What I Wish People Knew About Healing", "Healing Wish"],
    comfortPractice: ["Favorite Comfort Practice", "Comfort Practice"],
    funFact: ["Fun Fact"],
    vibe: ["Vibe"]
  },
  event: {
    name: ["Event Name", "Name"], hostName: ["Host Name"], hostEmail: ["Host Email"],
    category: ["Category"], audience: ["Event Audience", "Visibility"], type: ["Event Type"],
    start: ["Date", "Start Date", "Start Date + Time"], end: ["End Time", "End Date"],
    locationType: ["Location Type"], address: ["Address/Link", "Address or Link"],
    description: ["Description"], registration: ["Registration Link"], image: ["Image"],
    status: ["Status"], created: ["Created At", "Created"]
  }
};

export default async function handler(request) {
  try {
    if (!TOKEN()) return reply({ configured: false, error: "AIRTABLE_TOKEN is not configured." }, 503);

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "bootstrap";
    const user = await getUser();

    if (request.method === "GET") {
      if (action === "bootstrap") return reply(await bootstrap(user));
      if (action === "provider") return reply(await getProvider(url.searchParams.get("id"), user));
      if (action === "event") return reply(await getEvent(url.searchParams.get("id"), user));
      if (action === "me") return reply({ user: publicUser(user) });
      if (action === "dashboard") return reply(await dashboard(requireUser(user)));
      if (action === "my-events") return reply(await myEvents(requireUser(user)));
      if (action === "saved-providers") return reply(await savedProviders(requireUser(user)));
      if (action === "admin-events") return reply(await adminEvents(requireAdmin(user)));
      if (action === "account-settings") return reply(await accountSettings(requireUser(user)));
      if (action === "my-profile") return reply(await myProfile(requireUser(user)));
      return reply({ error: "Unknown action." }, 404);
    }

    if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
    const body = await request.json().catch(() => ({}));

    if (action === "signup-profile") return reply(await signupProfile(body));
    if (action === "toggle-provider") return reply(await toggleProvider(requireUser(user), body));
    if (action === "toggle-event") return reply(await toggleEvent(requireUser(user), body));
    if (action === "save-event") return reply(await saveEvent(requireUser(user), body));
    if (action === "save-account") return reply(await saveAccount(requireUser(user), body));
    if (action === "save-profile") return reply(await saveProfile(requireUser(user), body));
    if (action === "admin-event") return reply(await updateAdminEvent(requireAdmin(user), body));
    return reply({ error: "Unknown action." }, 404);
  } catch (error) {
    const status = error.status || 500;
    return reply({ error: error.message || "Unexpected server error." }, status);
  }
}

async function bootstrap(user) {
  const [providerRecords, eventRecords, directoryOptions] = await Promise.all([list("directory"), list("events"), getDirectoryOptions()]);
  const providers = providerRecords.map(normalizeProvider).filter((item) => item.isPublic);
  const events = eventRecords.map(normalizeEvent).filter((item) => item.isPublic);
  let savedProviderIds = [];
  let savedEventIds = [];

  if (user?.email) {
    const [providerSaves, eventSaves] = await Promise.all([list("savedProviders"), list("savedEvents")]);
    savedProviderIds = providerSaves.filter((r) => belongsTo(r, user.email) && activeRecord(r)).flatMap(providerIds);
    savedEventIds = eventSaves.filter((r) => belongsTo(r, user.email) && activeRecord(r)).flatMap(eventIds);
  }

  return { configured: true, user: publicUser(user), providers, events, directoryOptions, savedProviderIds: unique(savedProviderIds), savedEventIds: unique(savedEventIds) };
}

async function getProvider(id, user) {
  if (!id) throw httpError(400, "Missing provider ID.");
  const profile = normalizeProfile(await get("directory", id));
  const canSeeProviderConnection = hasProviderAccess(user);
  if (!canSeeProviderConnection) {
    delete profile.referralMethod;
    delete profile.referralInstructions;
    delete profile.collaborationInterests;
    delete profile.collaborationDetails;
    delete profile.providerNotes;
  }
  return { provider: { ...profile, providerConnectionVisible: canSeeProviderConnection } };
}

async function getEvent(id, user) {
  if (!id) throw httpError(400, "Missing event ID.");
  const event = normalizeEvent(await get("events", id));
  const owns = Boolean(user?.email && lower(event.hostEmail) === lower(user.email));
  const admin = isAdmin(user);
  if (!event.isPublic && !owns && !admin) throw httpError(404, "Event not found.");
  return { event };
}

async function dashboard(user) {
  const [providers, events, providerSaves, eventSaves] = await Promise.all([
    list("directory"), list("events"), list("savedProviders"), list("savedEvents")
  ]);
  const myProviderSaves = providerSaves.filter((r) => belongsTo(r, user.email) && activeRecord(r));
  const myEventSaves = eventSaves.filter((r) => belongsTo(r, user.email) && activeRecord(r));
  const providerMap = new Map(providers.map((r) => [r.id, normalizeProvider(r)]));
  const eventMap = new Map(events.map((r) => [r.id, normalizeEvent(r)]));
  const savedProviders = unique(myProviderSaves.flatMap(providerIds)).map((id) => providerMap.get(id)).filter(Boolean);
  const savedEvents = unique(myEventSaves.flatMap(eventIds)).map((id) => eventMap.get(id)).filter(Boolean);
  const upcoming = savedEvents.filter((event) => event.start && new Date(event.start).getTime() >= Date.now()).length;
  return { savedProviders, savedEvents, counts: { savedProviders: savedProviders.length, savedEvents: savedEvents.length, upcomingEvents: upcoming } };
}

async function myEvents(user) {
  const [events, saves] = await Promise.all([list("events"), list("savedEvents")]);
  const normalized = events.map(normalizeEvent);
  const hosted = normalized.filter((event) => lower(event.hostEmail) === lower(user.email));
  const ids = unique(saves.filter((r) => belongsTo(r, user.email) && activeRecord(r)).flatMap(eventIds));
  const saved = ids.map((id) => normalized.find((event) => event.id === id)).filter(Boolean);
  return { hosted, saved };
}

async function savedProviders(user) {
  const [providers, saves] = await Promise.all([list("directory"), list("savedProviders")]);
  const providerMap = new Map(providers.map((r) => [r.id, normalizeProvider(r)]));
  const items = saves.filter((r) => belongsTo(r, user.email)).map((record) => {
    const id = providerIds(record)[0];
    return { id: record.id, active: activeRecord(record), notes: text(pick(record.fields, ["Notes"])), savedAt: text(pick(record.fields, ["Saved At", "Created"])), provider: providerMap.get(id) };
  }).filter((item) => item.provider);
  return { items };
}

async function toggleProvider(user, body) {
  if (!body.providerId) throw httpError(400, "Missing provider ID.");
  const provider = normalizeProvider(await get("directory", body.providerId));
  const saves = await list("savedProviders");
  const existing = saves.find((r) => belongsTo(r, user.email) && providerIds(r).includes(body.providerId));
  const active = body.active !== false;
  const fields = { "Name": `${user.email} saved ${provider.name}`, "Saver Email Text": user.email, "Saved Provider": [body.providerId], "Active": active };
  if (body.notes !== undefined) fields.Notes = String(body.notes || "");
  const record = existing ? await update("savedProviders", existing.id, fields) : await create("savedProviders", fields);
  return { ok: true, active, recordId: record.id };
}

async function toggleEvent(user, body) {
  if (!body.eventId) throw httpError(400, "Missing event ID.");
  const event = normalizeEvent(await get("events", body.eventId));
  const saves = await list("savedEvents");
  const existing = saves.find((r) => belongsTo(r, user.email) && eventIds(r).includes(body.eventId));
  const active = body.active !== false;
  const fields = { "Name": `${user.email} saved ${event.name}`, "Saver Email": user.email, "Saved Workshop": [body.eventId], "Active": active };
  const record = existing ? await update("savedEvents", existing.id, fields) : await create("savedEvents", fields);
  return { ok: true, active, recordId: record.id };
}

async function saveEvent(user, body) {
  const fields = {
    "Event Name": required(body.eventName, "Event name"),
    "Host Email": user.email,
    "Category": clean(body.category),
    "Event Audience": clean(body.eventAudience),
    "Event Type": clean(body.eventType),
    "Date": required(body.date, "Start date"),
    "End Time": required(body.endTime, "End date"),
    "Location Type": clean(body.locationType),
    "Address/Link": clean(body.addressLink),
    "Description": required(body.description, "Description"),
    "Registration Link": clean(body.registrationLink),
    "Status": "Pending Review"
  };
  removeEmpty(fields);

  if (body.recordId) {
    const current = normalizeEvent(await get("events", body.recordId));
    if (lower(current.hostEmail) !== lower(user.email) && !isAdmin(user)) throw httpError(403, "You cannot edit this event.");
    return { ok: true, event: normalizeEvent(await update("events", body.recordId, fields)) };
  }
  return { ok: true, event: normalizeEvent(await create("events", fields)) };
}

async function adminEvents() {
  const records = await list("events");
  const events = records.map(normalizeEvent).sort((a, b) => dateValue(b.created || b.start) - dateValue(a.created || a.start));
  return { events, counts: events.reduce((out, event) => { const key = statusKey(event.status); out[key] = (out[key] || 0) + 1; out.total += 1; return out; }, { total: 0 }) };
}

async function updateAdminEvent(user, body) {
  if (!body.recordId) throw httpError(400, "Missing event ID.");
  const fields = {};
  if (body.status !== undefined) fields.Status = clean(body.status);
  if (body.eventName !== undefined) fields["Event Name"] = clean(body.eventName);
  if (body.description !== undefined) fields.Description = String(body.description || "").trim();
  if (body.adminNotes !== undefined) fields["Admin Notes"] = String(body.adminNotes || "").trim();
  removeEmpty(fields, true);
  const record = await update("events", body.recordId, fields);
  return { ok: true, event: normalizeEvent(record), admin: user.email };
}

async function accountSettings(user) {
  const account = await ensureDirectoryAccount({
    email: user.email,
    name: publicUser(user)?.name || user.email.split("@")[0],
    accountType: "client"
  });
  return { account: accountFromRecord(user, account) };
}

async function signupProfile(body) {
  const email = requiredEmail(body.email);
  const accountType = clean(body.accountType) || "client";
  const name = required(body.name || email.split("@")[0], "Name");
  const account = await ensureDirectoryAccount({ email, name, accountType });
  return { ok: true, account: accountFromRecord({ email, user_metadata: { full_name: name, account_type: accountType } }, account) };
}

async function saveAccount(user, body) {
  const account = await ensureDirectoryAccount({
    email: user.email,
    name: body.name || publicUser(user)?.name || user.email.split("@")[0],
    accountType: body.accountType || "client"
  });
  const fields = {};
  setAlias(fields, FIELDS.provider.name, body.name);
  setAlias(fields, FIELDS.provider.accountType, body.accountType);
  const saved = Object.keys(fields).length ? await updateSafe("directory", account.id, fields) : account;
  return { ok: true, account: accountFromRecord(user, saved) };
}

async function myProfile(user) {
  const profile = await ensureDirectoryAccount({
    email: user.email,
    name: publicUser(user)?.name || user.email.split("@")[0],
    accountType: "provider"
  });
  return { profile: normalizeProfile(profile) };
}

async function saveProfile(user, body) {
  const profile = await ensureDirectoryAccount({
    email: user.email,
    name: body.name || publicUser(user)?.name || user.email.split("@")[0],
    accountType: "provider"
  });
  const fields = {};
  setAlias(fields, FIELDS.provider.name, body.name);
  setAlias(fields, FIELDS.provider.pronouns, body.pronouns);
  setAlias(fields, FIELDS.provider.profession, body.profession);
  setAlias(fields, FIELDS.provider.license, body.license);
  setAlias(fields, FIELDS.provider.identity, body.identity);
  setAlias(fields, FIELDS.provider.email, user.email);
  setAlias(fields, FIELDS.provider.phone, body.phone);
  setAlias(fields, FIELDS.provider.website, body.website);
  setAlias(fields, FIELDS.provider.consult, body.consultationLink);
  setAlias(fields, FIELDS.provider.bio, body.bio);
  setAlias(fields, FIELDS.provider.accountType, "provider");
  setAlias(fields, FIELDS.provider.type, body.providerType);
  setAlias(fields, FIELDS.provider.services, body.services);
  setAlias(fields, FIELDS.provider.support, body.support);
  setAlias(fields, FIELDS.provider.population, body.populations);
  setAlias(fields, FIELDS.provider.location, body.location);
  setAlias(fields, FIELDS.provider.payment, body.payment);
  setAlias(fields, FIELDS.provider.availability, body.availability);
  setAlias(fields, FIELDS.provider.price, body.price);
  setAlias(fields, FIELDS.provider.physicalLocations, body.physicalLocations);
  setAlias(fields, FIELDS.provider.availabilitySpecifics, body.availabilitySpecifics);
  setAlias(fields, FIELDS.provider.responseTime, body.responseTime);
  setAlias(fields, FIELDS.provider.referralMethod, body.referralMethod);
  setAlias(fields, FIELDS.provider.referralInstructions, body.referralInstructions);
  setAlias(fields, FIELDS.provider.collaborationInterests, body.collaborationInterests);
  setAlias(fields, FIELDS.provider.collaborationDetails, body.collaborationDetails);
  setAlias(fields, FIELDS.provider.providerNotes, body.providerNotes);
  if (body.infoOptIn !== undefined) setAlias(fields, FIELDS.provider.infoOptIn, body.infoOptIn ? "Yes" : "No");
  setAlias(fields, FIELDS.provider.styleWords, body.styleWords);
  setAlias(fields, FIELDS.provider.clientDescriptors, body.clientDescriptors);
  setAlias(fields, FIELDS.provider.groundingRitual, body.groundingRitual);
  setAlias(fields, FIELDS.provider.outsideSessions, body.outsideSessions);
  setAlias(fields, FIELDS.provider.guidingBelief, body.guidingBelief);
  setAlias(fields, FIELDS.provider.healingWish, body.healingWish);
  setAlias(fields, FIELDS.provider.comfortPractice, body.comfortPractice);
  setAlias(fields, FIELDS.provider.funFact, body.funFact);
  setAlias(fields, FIELDS.provider.vibe, body.vibe);
  const saved = await updateSafe("directory", profile.id, fields);
  return { ok: true, profile: normalizeProfile(saved) };
}

function normalizeProvider(record) {
  const f = record.fields || {};
  const approvalValue = pick(f, FIELDS.provider.approved);
  const accountType = lower(text(pick(f, FIELDS.provider.accountType)));
  const providerSignals = Boolean(
    text(pick(f, FIELDS.provider.profession)) ||
    text(pick(f, FIELDS.provider.bio)) ||
    text(pick(f, FIELDS.provider.website)) ||
    array(pick(f, FIELDS.provider.type)).length
  );
  const clientAccount = ["client", "community", "community member", "member"].includes(accountType);
  return {
    id: record.id, name: text(pick(f, FIELDS.provider.name)) || "Provider",
    accountType,
    email: text(pick(f, FIELDS.provider.email)), phone: text(pick(f, FIELDS.provider.phone)),
    photo: attachment(pick(f, FIELDS.provider.photo)), bio: text(pick(f, FIELDS.provider.bio)),
    profession: text(pick(f, FIELDS.provider.profession)), pronouns: text(pick(f, FIELDS.provider.pronouns)),
    providerType: array(pick(f, FIELDS.provider.type)), services: array(pick(f, FIELDS.provider.services)),
    support: array(pick(f, FIELDS.provider.support)), populations: array(pick(f, FIELDS.provider.population)),
    location: array(pick(f, FIELDS.provider.location)), payment: array(pick(f, FIELDS.provider.payment)),
    website: text(pick(f, FIELDS.provider.website)), consultationLink: text(pick(f, FIELDS.provider.consult)),
    humanSide: text(pick(f, FIELDS.provider.human)), collaboration: text(pick(f, FIELDS.provider.collaboration)),
    verified: truthy(pick(f, FIELDS.provider.verified)), approved: truthy(approvalValue),
    isPublic: !clientAccount && (approvalValue === undefined ? providerSignals : truthy(approvalValue))
  };
}

function normalizeProfile(record) {
  const f = record.fields || {};
  return {
    ...normalizeProvider(record),
    license: text(pick(f, FIELDS.provider.license)),
    identity: text(pick(f, FIELDS.provider.identity)),
    availability: array(pick(f, FIELDS.provider.availability)),
    price: text(pick(f, FIELDS.provider.price)),
    physicalLocations: text(pick(f, FIELDS.provider.physicalLocations)),
    availabilitySpecifics: text(pick(f, FIELDS.provider.availabilitySpecifics)),
    responseTime: text(pick(f, FIELDS.provider.responseTime)),
    referralMethod: text(pick(f, FIELDS.provider.referralMethod)),
    referralInstructions: text(pick(f, FIELDS.provider.referralInstructions)),
    collaborationInterests: array(pick(f, FIELDS.provider.collaborationInterests)),
    collaborationDetails: text(pick(f, FIELDS.provider.collaborationDetails)),
    providerNotes: text(pick(f, FIELDS.provider.providerNotes)),
    infoOptIn: truthy(pick(f, FIELDS.provider.infoOptIn)),
    styleWords: text(pick(f, FIELDS.provider.styleWords)),
    clientDescriptors: text(pick(f, FIELDS.provider.clientDescriptors)),
    groundingRitual: text(pick(f, FIELDS.provider.groundingRitual)),
    outsideSessions: text(pick(f, FIELDS.provider.outsideSessions)),
    guidingBelief: text(pick(f, FIELDS.provider.guidingBelief)),
    healingWish: text(pick(f, FIELDS.provider.healingWish)),
    comfortPractice: text(pick(f, FIELDS.provider.comfortPractice)),
    funFact: text(pick(f, FIELDS.provider.funFact)),
    vibe: array(pick(f, FIELDS.provider.vibe))
  };
}

function normalizeEvent(record) {
  const f = record.fields || {};
  const status = text(pick(f, FIELDS.event.status)) || "Pending Review";
  return {
    id: record.id, name: text(pick(f, FIELDS.event.name)) || "Event",
    hostName: text(pick(f, FIELDS.event.hostName)), hostEmail: text(pick(f, FIELDS.event.hostEmail)),
    category: text(pick(f, FIELDS.event.category)), audience: text(pick(f, FIELDS.event.audience)),
    eventType: text(pick(f, FIELDS.event.type)), start: text(pick(f, FIELDS.event.start)), end: text(pick(f, FIELDS.event.end)),
    locationType: text(pick(f, FIELDS.event.locationType)), address: text(pick(f, FIELDS.event.address)),
    description: text(pick(f, FIELDS.event.description)), registration: text(pick(f, FIELDS.event.registration)),
    image: attachment(pick(f, FIELDS.event.image)), status, created: text(pick(f, FIELDS.event.created)),
    isPublic: ["approved", "active", "published", "live", "open"].includes(lower(status))
  };
}

async function list(key) {
  const records = [];
  let offset = "";
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const payload = await airtable(key, "", { params });
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset);
  return records;
}

async function get(key, id) { return airtable(key, id); }
async function create(key, fields) { return airtable(key, "", { method: "POST", body: { records: [{ fields }], typecast: true } }).then((p) => p.records[0]); }
async function update(key, id, fields) { return airtable(key, id, { method: "PATCH", body: { fields, typecast: true } }); }

async function getDirectoryOptions() {
  return { support: await selectOptions("directory", FIELDS.provider.support) };
}

async function selectOptions(key, fieldNames) {
  try {
    const table = await metadataTable(key);
    const field = table?.fields?.find((item) => fieldNames.includes(item.name));
    const choices = field?.options?.choices || [];
    return unique(choices.map((choice) => clean(choice.name)));
  } catch {
    return [];
  }
}

async function metadataTable(key) {
  const tableNameOrId = TABLES[key];
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, payload.error?.message || `Airtable metadata request failed (${response.status}).`);
  return (payload.tables || []).find((table) => table.id === tableNameOrId || table.name === tableNameOrId);
}

async function findDirectoryByEmail(email) {
  const records = await list("directory");
  return records.find((record) => lower(text(pick(record.fields || {}, FIELDS.provider.email))) === lower(email));
}

async function ensureDirectoryAccount({ email, name, accountType }) {
  const cleanEmail = requiredEmail(email);
  const existing = await findDirectoryByEmail(cleanEmail);
  if (existing) return existing;
  const fields = {};
  setAlias(fields, FIELDS.provider.email, cleanEmail);
  setAlias(fields, FIELDS.provider.name, name || cleanEmail);
  setAlias(fields, FIELDS.provider.accountType, accountType || "client");
  if (lower(accountType) === "provider") setAlias(fields, FIELDS.provider.approved, "Pending Review");
  return createSafe("directory", fields);
}

function accountFromRecord(user, record) {
  const f = record.fields || {};
  return {
    id: record.id,
    email: text(pick(f, FIELDS.provider.email)) || user.email || "",
    name: text(pick(f, FIELDS.provider.name)) || publicUser(user)?.name || "",
    accountType: text(pick(f, FIELDS.provider.accountType)) || user.user_metadata?.account_type || user.userMetadata?.account_type || "client"
  };
}

function setAlias(fields, names, value) {
  const nextValue = Array.isArray(value) ? listText(value) : typeof value === "boolean" ? value : clean(value);
  if (nextValue === "" || nextValue === undefined || nextValue === null) return;
  fields[names[0]] = nextValue;
}

function listText(value) {
  return arrayRaw(value).flatMap((item) => String(item || "").split(/[,;\n]+/)).map(clean).filter(Boolean).join(", ");
}

function requiredEmail(value) {
  const email = lower(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, "A valid email is required.");
  return email;
}

async function createSafe(key, fields) { return mutateSafe(() => create(key, fields), fields); }
async function updateSafe(key, id, fields) { return mutateSafe(() => update(key, id, fields), fields); }

async function mutateSafe(operation, fields) {
  try {
    return await operation();
  } catch (error) {
    const badField = unknownFieldName(error.message);
    if (badField && Object.prototype.hasOwnProperty.call(fields, badField)) {
      delete fields[badField];
      if (!Object.keys(fields).length) throw error;
      return mutateSafe(operation, fields);
    }
    throw error;
  }
}

function unknownFieldName(message) {
  const match = String(message || "").match(/Unknown field name: "([^"]+)"/i);
  return match?.[1] || "";
}

async function airtable(key, id = "", options = {}) {
  const table = TABLES[key];
  if (!table) throw httpError(500, `Missing Airtable table configuration: ${key}`);
  const query = options.params ? `?${options.params}` : "";
  const endpoint = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}${id ? `/${encodeURIComponent(id)}` : ""}${query}`;
  const response = await fetch(endpoint, {
    method: options.method || "GET",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, payload.error?.message || `Airtable request failed (${response.status}).`);
  return payload;
}

function requireUser(user) { if (!user?.email) throw httpError(401, "Please log in."); return user; }
function requireAdmin(user) { requireUser(user); if (!isAdmin(user)) throw httpError(403, "Administrator access is required."); return user; }
function isAdmin(user) { return (user?.roles || user?.app_metadata?.roles || []).includes("admin"); }
function hasProviderAccess(user) { const roles = user?.roles || user?.app_metadata?.roles || []; const type = lower(user?.user_metadata?.account_type || user?.userMetadata?.account_type || user?.user_metadata?.accountType || user?.userMetadata?.accountType); return roles.includes("admin") || roles.includes("provider") || type === "provider"; }
function publicUser(user) { return user ? { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.userMetadata?.full_name || "", roles: user.roles || user.app_metadata?.roles || [], accountType: user.user_metadata?.account_type || user.userMetadata?.account_type || user.user_metadata?.accountType || user.userMetadata?.accountType || "" } : null; }
function belongsTo(record, email) { return lower(text(pick(record.fields || {}, ["Saver Email Text", "Saver Email", "Email", "User Email"]))) === lower(email); }
function activeRecord(record) { const value = pick(record.fields || {}, ["Active"]); return value === undefined || truthy(value); }
function providerIds(record) { return linkedIds(pick(record.fields || {}, ["Saved Provider", "Directory Grid View", "Provider"])); }
function eventIds(record) { return linkedIds(pick(record.fields || {}, ["Saved Workshop", "Event", "Events"])); }
function linkedIds(value) { return arrayRaw(value).map((v) => typeof v === "object" ? clean(v.id || v.recordId || v.value) : clean(v)).filter((v) => v.startsWith("rec")); }
function pick(fields, names) { for (const name of names) if (Object.prototype.hasOwnProperty.call(fields, name)) return fields[name]; return undefined; }
function text(value) { if (value == null) return ""; if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", "); if (typeof value === "object") return text(value.name ?? value.label ?? value.value ?? value.text ?? value.url ?? ""); return clean(value); }
function array(value) { return arrayRaw(value).map(text).flatMap((v) => v.split(/[,;\n]+/)).map(clean).filter(Boolean); }
function arrayRaw(value) { return value == null ? [] : Array.isArray(value) ? value : [value]; }
function attachment(value) { const first = arrayRaw(value)[0]; return typeof first === "string" ? first : first?.url || first?.thumbnails?.large?.url || ""; }
function truthy(value) { if (value === true || value === 1) return true; return ["true", "yes", "approved", "published", "active", "open", "1", "checked"].includes(lower(text(value))); }
function clean(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function required(value, label) { const cleanValue = clean(value); if (!cleanValue) throw httpError(400, `${label} is required.`); return cleanValue; }
function removeEmpty(fields, keepEmpty = false) { Object.keys(fields).forEach((key) => { if (fields[key] == null || (!keepEmpty && typeof fields[key] === "string" && !fields[key].trim())) delete fields[key]; }); }
function dateValue(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) ? 0 : time; }
function statusKey(value) { const status = lower(value); if (status.includes("pending") || status.includes("review")) return "pending"; if (status.includes("approved") || status.includes("published")) return "approved"; if (status.includes("declined") || status.includes("rejected")) return "declined"; return "other"; }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function reply(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
