import { getUser } from "@netlify/identity";

const BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_DIRECTORY_BASE_ID || "appACV3Zz7ngug6yt";
const TOKEN = () => process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://zpgvztndfkochixhuvaf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const AIRTABLE_AUTO_CREATE_TABLES = lower(process.env.AIRTABLE_AUTO_CREATE_TABLES || "true") !== "false";

const SUPABASE_SIGNUP_TABLES = {
  provider: process.env.SUPABASE_PROVIDER_SIGNUPS_TABLE || "signup_requests",
  client: process.env.SUPABASE_CLIENTS_TABLE || process.env.SUPABASE_MEMBERS_TABLE || "signup_requests",
  fallback: process.env.SUPABASE_SIGNUP_REQUESTS_TABLE || "signup_requests"
};

const TABLES = {
  directory: process.env.AIRTABLE_DIRECTORY_TABLE_ID || "tblOgiBFqw5iftDAE",
  events: process.env.AIRTABLE_EVENTS_TABLE_ID || "Events",
  savedEvents: process.env.AIRTABLE_SAVED_EVENTS_TABLE_ID || "Saved Events",
  savedProviders: process.env.AIRTABLE_SAVED_PROVIDERS_TABLE_ID || "Saved Providers",
  providerSignups: process.env.AIRTABLE_PENDING_PROVIDER_TABLE_ID || process.env.AIRTABLE_PROVIDER_SIGNUPS_TABLE_ID || "Pending Providers",
  clients: process.env.AIRTABLE_CLIENTS_TABLE_ID || process.env.AIRTABLE_MEMBERS_TABLE_ID || "tblGJKhK59EgQRI6V",
  referralRoom: process.env.AIRTABLE_REFERRAL_ROOM_TABLE_ID || "The Referral Room",
  attendance: process.env.AIRTABLE_ATTENDANCE_TABLE_ID || "The Referral Room Attendance",
  seatRules: process.env.AIRTABLE_SEAT_RULES_TABLE_ID || "Referral Room Seat Rules",
  connections: process.env.AIRTABLE_CONNECTIONS_TABLE_ID || "Provider Connections"
};

const TABLE_ALIASES = {
  providerSignups: [
    process.env.AIRTABLE_PENDING_PROVIDER_TABLE_ID,
    process.env.AIRTABLE_PROVIDER_SIGNUPS_TABLE_ID,
    "Pending Providers",
    "Provider Signups",
    "Pending Provider Signups",
    "Provider Applications"
  ],
  clients: [
    process.env.AIRTABLE_CLIENTS_TABLE_ID,
    process.env.AIRTABLE_MEMBERS_TABLE_ID,
    "tblGJKhK59EgQRI6V",
    "Clients",
    "Client",
    "Members",
    "Members/Clients",
    "Client Members",
    "User Members"
  ]
};

const AIRTABLE_BOOTSTRAP_SCHEMAS = {
  providerSignups: {
    name: "Pending Providers",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Email", type: "singleLineText" },
      { name: "Phone", type: "singleLineText" },
      { name: "Website", type: "singleLineText" },
      { name: "Professional Title", type: "singleLineText" },
      { name: "Message", type: "multilineText" },
      { name: "Area of Interest", type: "singleLineText" },
      { name: "Status", type: "singleLineText" },
      { name: "Account Type", type: "singleLineText" },
      { name: "Source", type: "singleLineText" }
    ]
  },
  clients: {
    name: "Members",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Email", type: "singleLineText" },
      { name: "Area of Interest", type: "singleLineText" },
      { name: "Phone", type: "singleLineText" },
      { name: "Website", type: "singleLineText" },
      { name: "Professional Title", type: "singleLineText" },
      { name: "Message", type: "multilineText" },
      { name: "Status", type: "singleLineText" },
      { name: "Account Type", type: "singleLineText" },
      { name: "Source", type: "singleLineText" }
    ]
  }
};

const TABLE_LOOKUP = new Map();
const TABLE_META_CACHE = new Map();

const FIELDS = {
  provider: {
    name: ["Provider / Practice Name", "Provider Name", "Name", "Full Name"],
    email: ["Email", "Provider Email"], phone: ["Phone", "Phone Number"],
    accountType: ["Account Type", "User Type", "Member Type", "Role"],
    photo: ["Profile Photo", "Photo", "Headshot", "Image"],
    photoUrl: ["Profile Photo URL", "Photo URL", "Headshot URL", "Image URL"],
    bio: ["Provider Bio", "Bio", "About", "Description"],
    profession: ["Professional Title", "Profession", "Credentials", "Service Type"],
    license: ["License #/ Certification", "License # / Certification", "License / Certification", "License", "Credentials"],
    identity: ["Racial / Ethnic Identity", "Racial/Ethnic Identity", "Identity"],
    genderIdentity: ["Gender Identity"],
    pronouns: ["Pronouns"],
    type: ["Provider Type", "Provider Types", "Service Type"],
    additionalProviderType: ["Additional Provider Type", "Additional Provider Types"],
    order: ["Order #", "Order", "Display Order", "Sort Order"],
    services: ["Services Offered", "Services"],
    additionalServices: ["Additional Services"],
    support: ["Areas of Support"],
    additionalConcerns: ["Additional Concerns", "Additional Areas of Support"],
    population: ["Populations Served", "Who I Serve", "Population"],
    additionalPopulations: ["Additional Populations", "Additional Populations Served"],
    location: ["State", "Location", "Virtual/In Person", "Neighborhood"],
    additionalStates: ["Additional States", "Additional State"],
    payment: ["Pay Type/Insurance", "Pay Type", "Insurance", "Payment"],
    additionalPayTypes: ["Additional Pay Types", "Additional Payment", "Additional Insurance"],
    availability: ["Availability"],
    price: ["Price", "Pricing"],
    physicalLocations: ["Physical Locations", "Physical Location"],
    availabilitySpecifics: ["Current Availability", "Availability Specifics"],
    website: ["Website", "Web Site"], consult: ["Consultation Link", "Booking Link", "Schedule Link"],
    approved: ["Approved", "Published", "Show in Directory", "Public"],
    verified: ["Verified", "Verified Member", "Referral Room"],
    status: ["Status", "Approval Status", "Request Status"],
    responseTime: ["Typical Response Time", "Response Time"],
    referralMethod: ["Preferred Referral Method"],
    referralInstructions: ["Referral Instructions"],
    collaboration: ["Collaboration", "Collaboration Interests"],
    collaborationInterests: ["Collaboration Interests"],
    otherCollaboration: ["Other Collaboration", "Additional Collaboration"],
    collaborationDetails: ["Collaboration Details"],
    providerNotes: ["Additional Info", "Provider-to-Provider Notes", "Provider Notes"],
    infoOptIn: ["Directory Updates Opt In", "Info Opt In", "Newsletter"],
    agreement: ["Agreement"],
    subscriber: ["Subscriber"],
    consent: ["Consent"],
    signature: ["Signature"],
    heardAboutUs: ["How did you hear about us?", "How'd you hear about us?", "How did you hear about us", "Referral Source"],
    human: ["The Human Side", "Human Side"],
    styleWords: ["My Style In Three Words", "Style In Three Words"],
    clientDescriptors: ["Clients Describe Me As", "Clients Describe Me"],
    groundingRitual: ["My Grounding Ritual", "Grounding Ritual"],
    outsideSessions: ["Outside Sessions", "Outside of Sessions"],
    guidingBelief: ["Guiding Belief", "A Belief That Guides My Work"],
    healingWish: ["What I Wish People Knew About Healing", "Healing Wish"],
    comfortPractice: ["Favorite Comfort Practice", "Comfort Practice"],
    funFact: ["Fun Fact"],
    vibe: ["What's Your Vibe?", "What’s Your Vibe?", "Vibe"]
  },
  event: {
    name: ["Event Name", "Name"], hostName: ["Host Name"], hostEmail: ["Host Email"],
    category: ["Category"], audience: ["Event Audience", "Visibility"], type: ["Event Type"],
    start: ["Date", "Start Date", "Start Date + Time"], end: ["End Time", "End Date"],
    locationType: ["Location Type"], address: ["Address/Link", "Address or Link"],
    description: ["Description"], registration: ["Registration Link"], image: ["Image"],
    imageUrl: ["Event Image URL", "Image URL", "Event Image", "Image Link", "Flyer URL"],
    status: ["Status"], created: ["Created At", "Created"]
  }
};

const SAVE_FIELD_SETS = {
  providerSave: {
    name: ["Name", "Saved Provider Name", "Record Name"],
    saverRecord: ["Saver Info", "Saver", "Member", "Client", "User", "Saved By"],
    saverEmail: ["Saver Email Text", "Saver Email", "Email", "Email Address", "User Email", "Saved By", "Saved By Email", "Client Email", "User's Email"],
    savedProvider: ["Saved Provider Info", "Saved Provider", "Directory", "Directory Record", "Directory Grid View", "Provider", "Provider Link", "Provider Record", "Providers"],
    notes: ["Notes", "Note", "Saved Provider Notes"],
    active: ["Active", "Saved", "Is Active", "Visible"]
  },
  eventSave: {
    name: ["Name", "Saved Event Name", "Record Name"],
    saverRecord: ["Saver Info", "Saver", "Member", "Client", "User", "Saved By"],
    saverEmail: ["Saver Email", "Saver Email Text", "Email", "Email Address", "User Email", "Saved By", "Saved By Email", "Client Email", "User's Email"],
    savedEvent: ["Saved Workshop", "Saved Event", "Saved Events", "Event", "Events", "Workshop", "Workshop Events", "Hosted Event", "Event Record", "Event Link"],
    notes: ["Notes", "Note", "Saved Event Notes"],
    active: ["Active", "Saved", "Is Active", "Visible"]
  },
  providerSignup: {
    name: ["Name", "Full Name", "Provider Name"],
    email: ["Email"],
    phone: ["Phone", "Phone Number", "Mobile"],
    areaInterest: ["Provider Interests", "Provider Interest", "Provider Type Interest", "Interested Provider Type", "Area of Interest", "Interested In"],
    status: ["Status", "Request Status", "Approval Status"],
    accountType: ["Account Type", "Type", "Role", "User Type"],
    source: ["Source", "Referral Source", "Channel", "Signup Source"]
  },
  clientSignup: {
    name: ["Name", "Full Name", "Client Name"],
    email: ["Email"],
    areaInterest: ["Provider Interests", "Provider Interest", "Provider Type Interest", "Interested Provider Type", "Area of Interest", "Interested In"],
    status: ["Status", "Account Status", "Request Status", "Approval Status"],
    accountType: ["Account Type", "Type", "Role", "User Type"],
    source: ["Source", "Referral Source", "Channel", "Signup Source"]
  }
};

const FIELD_NAME_CACHE = new Map();

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
      if (action === "directory-options") return reply({ directoryOptions: await getDirectoryOptions() });
      if (action === "event-options") return reply({ eventOptions: await getEventOptions() });
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
  const providers = providerRecords.map(normalizeProvider).filter((item) => item.isPublic).sort(providerSort);
  const events = eventRecords.map(normalizeEvent).filter((item) => item.isPublic);
  let savedProviderIds = [];
  let savedEventIds = [];

  if (user?.email) {
    const account = await findSaverAccount(user);
    const [providerSaves, eventSaves] = await Promise.all([list("savedProviders"), list("savedEvents")]);
    savedProviderIds = providerSaves.filter((r) => belongsTo(r, user.email, account?.id) && activeRecord(r)).flatMap(providerIds);
    savedEventIds = eventSaves.filter((r) => belongsTo(r, user.email, account?.id) && activeRecord(r)).flatMap(eventIds);
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
  const [providers, events, providerSaves, eventSaves, account] = await Promise.all([
    list("directory"), list("events"), list("savedProviders"), list("savedEvents"), ensureSaverAccount(user)
  ]);
  const myProviderSaves = providerSaves.filter((r) => belongsTo(r, user.email, account?.id) && activeRecord(r));
  const myEventSaves = eventSaves.filter((r) => belongsTo(r, user.email, account?.id) && activeRecord(r));
  const providerMap = new Map(providers.map((r) => [r.id, normalizeProvider(r)]));
  const eventMap = new Map(events.map((r) => [r.id, normalizeEvent(r)]));
  const savedProviders = unique(myProviderSaves.flatMap(providerIds)).map((id) => providerMap.get(id)).filter(Boolean);
  const savedEvents = unique(myEventSaves.flatMap(eventIds)).map((id) => eventMap.get(id)).filter(Boolean);
  const upcoming = savedEvents.filter((event) => event.start && new Date(event.start).getTime() >= Date.now()).length;
  const accountType = accountTypeForUser(user);
  const signup = accountType === "provider" ? await findSignupByEmail("provider", user.email).catch(() => null) : account;
  return {
    account: { ...accountFromRecord(user, account, accountType), interests: accountInterests(account, signup, accountType) },
    savedProviders,
    savedEvents,
    counts: { savedProviders: savedProviders.length, savedEvents: savedEvents.length, upcomingEvents: upcoming }
  };
}

async function myEvents(user) {
  const [events, saves, account] = await Promise.all([list("events"), list("savedEvents"), ensureSaverAccount(user)]);
  const normalized = events.map(normalizeEvent);
  const hosted = normalized.filter((event) => lower(event.hostEmail) === lower(user.email));
  const ids = unique(saves.filter((r) => belongsTo(r, user.email, account?.id) && activeRecord(r)).flatMap(eventIds));
  const saved = ids.map((id) => normalized.find((event) => event.id === id)).filter(Boolean);
  return { hosted, saved };
}

async function savedProviders(user) {
  const [providers, saves, account] = await Promise.all([list("directory"), list("savedProviders"), ensureSaverAccount(user)]);
  const providerMap = new Map(providers.map((r) => [r.id, normalizeProvider(r)]));
  const mapped = await mappedFields("providerSave");
  const items = saves.filter((r) => belongsTo(r, user.email, account?.id)).map((record) => {
    const id = providerIds(record)[0];
    return {
      id: record.id, active: activeRecord(record), notes: mapped.notes ? text(pick(record.fields || {}, [mapped.notes])) : "",
      savedAt: text(pick(record.fields || {}, ["Saved At", "Created", "Created At", "Created Date", "Date"])), provider: providerMap.get(id)
    };
  }).filter((item) => item.provider);
  return { items };
}

async function toggleProvider(user, body) {
  if (!body.providerId) throw httpError(400, "Missing provider ID.");
  const provider = normalizeProvider(await get("directory", body.providerId));
  const account = await ensureSaverAccount(user);
  const saves = await list("savedProviders");
  const mapped = await mappedFields("providerSave");
  const existing = saves.find((r) => belongsTo(r, user.email, account.id) && providerIds(r).includes(body.providerId));
  const existingByLinkedField = mapped.savedProvider ? saves.find((r) => providerIds(r).includes(body.providerId) && belongsTo(r, user.email, account.id)) : null;
  const active = body.active !== false;
  const fields = {
    [mapped.name]: `${user.email} saved ${provider.name}`,
    [mapped.savedProvider]: [body.providerId],
    [mapped.active]: active
  };
  if (mapped.saverRecord) fields[mapped.saverRecord] = [account.id];
  if (mapped.saverEmail) fields[mapped.saverEmail] = user.email;
  if (body.notes !== undefined && mapped.notes) fields[mapped.notes] = String(body.notes || "");

  const current = existing || existingByLinkedField;
  const record = current ? await updateSafe("savedProviders", current.id, fields) : await createSafe("savedProviders", fields);
  return { ok: true, active, recordId: record.id };
}

async function toggleEvent(user, body) {
  if (!body.eventId) throw httpError(400, "Missing event ID.");
  const event = normalizeEvent(await get("events", body.eventId));
  const account = await ensureSaverAccount(user);
  const saves = await list("savedEvents");
  const mapped = await mappedFields("eventSave");
  const existing = saves.find((r) => belongsTo(r, user.email, account.id) && eventIds(r).includes(body.eventId));
  const existingByLinkedField = mapped.savedEvent ? saves.find((r) => eventIds(r).includes(body.eventId) && belongsTo(r, user.email, account.id)) : null;
  const active = body.active !== false;
  const fields = {
    [mapped.name]: `${user.email} saved ${event.name}`,
    [mapped.savedEvent]: [body.eventId],
    [mapped.active]: active
  };
  if (mapped.saverRecord) fields[mapped.saverRecord] = [account.id];
  if (mapped.saverEmail) fields[mapped.saverEmail] = user.email;
  if (body.notes !== undefined && mapped.notes) fields[mapped.notes] = String(body.notes || "");
  const current = existing || existingByLinkedField;
  const record = current ? await updateSafe("savedEvents", current.id, fields) : await createSafe("savedEvents", fields);
  return { ok: true, active, recordId: record.id };
}

async function saveEvent(user, body) {
  const fields = {
    "Event Name": required(body.eventName, "Event name"),
    "Host Name": publicUser(user)?.name || user.email.split("@")[0],
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
    "Image": attachmentFromUrl(body.imageUrl),
    "Event Image URL": clean(body.imageUrl),
    "Status": "Pending Review"
  };
  removeEmpty(fields);

  if (body.recordId) {
    const current = normalizeEvent(await get("events", body.recordId));
    if (lower(current.hostEmail) !== lower(user.email) && !isAdmin(user)) throw httpError(403, "You cannot edit this event.");
    return { ok: true, event: normalizeEvent(await updateSafe("events", body.recordId, fields)) };
  }
  return { ok: true, event: normalizeEvent(await createSafe("events", fields)) };
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
  const accountType = accountTypeForUser(user);
  const account = await ensureSaverAccount(user);
  const accountDetails = accountFromRecord(user, account, accountType);
  const signup = accountType === "provider" ? await findSignupByEmail(accountDetails.accountType, user.email).catch(() => null) : account;
  return {
    account: { ...accountDetails, interests: accountInterests(account, signup, accountDetails.accountType) },
    directoryOptions: await getDirectoryOptions()
  };
}

async function signupProfile(body) {
  const email = requiredEmail(body.email);
  const accountType = clean(body.accountType) || "client";
  const name = required(body.name || email.split("@")[0], "Name");
  const normalizedType = lower(accountType) === "provider" ? "provider" : "client";
  const status = normalizedType === "provider" ? "Pending Review" : "Approved";
  const syncPayload = {
    name,
    email,
    status,
    accountType: normalizedType,
    phone: body.phone,
    website: body.website,
    professionalTitle: body.professionalTitle,
    message: body.message,
    areaInterest: body.areaInterest || body.interests || body.application?.areaInterest,
    application: body.application || {}
  };
  const signup = await recordSignup(normalizedType, syncPayload);
  const supabaseSync = await syncSignupToSupabase(normalizedType, syncPayload);
  const mapped = await mappedFields(normalizedType === "provider" ? "providerSignup" : "clientSignup");

  const directoryAccount = normalizedType === "provider"
    ? await updateSafe("directory", (await ensureDirectoryAccount({ email, name, accountType: normalizedType })).id, await providerApplicationFields({ ...body.application, name, email, phone: body.phone, website: body.website, professionalTitle: body.professionalTitle, message: body.message }))
    : signup;

  return {
    ok: true,
    signup: {
      id: signup.id,
      status: text(signup.fields?.[mapped.status] || status),
      table: signup.table || signupTableForType(normalizedType),
      warning: signup.syncWarning
    },
    supabaseSync,
    account: accountFromRecord({ email, user_metadata: { full_name: name, account_type: normalizedType } }, directoryAccount)
  };
}

async function providerApplicationFields(application = {}) {
  const fields = {};
  const table = await metadataTable("directory").catch(() => null);
  const add = (aliases, value) => setResolvedAlias(fields, table, aliases, value);
  const uploadedPhotoUrl = await uploadProviderAsset(application.profilePhotoUpload, application.email || application.name, "profile-photo");
  add(FIELDS.provider.name, application.name);
  add(FIELDS.provider.pronouns, application.pronouns);
  add(FIELDS.provider.profession, application.profession || application.professionalTitle);
  add(FIELDS.provider.license, application.licenseCertification || application.license);
  add(FIELDS.provider.photoUrl, uploadedPhotoUrl || application.photoUrl);
  add(FIELDS.provider.genderIdentity, application.genderIdentity);
  add(FIELDS.provider.identity, application.racialEthnicIdentity || application.identity);
  add(FIELDS.provider.email, application.email);
  add(FIELDS.provider.phone, application.phone);
  add(FIELDS.provider.website, application.website);
  add(FIELDS.provider.consult, application.consultationLink);
  add(FIELDS.provider.bio, application.bio || application.message);
  add(FIELDS.provider.accountType, "provider");
  add(FIELDS.provider.status, "Pending Review");
  add(FIELDS.provider.approved, false);
  add(FIELDS.provider.type, application.providerType || application.serviceType);
  add(FIELDS.provider.additionalProviderType, application.additionalProviderType);
  add(FIELDS.provider.services, application.servicesOffered || application.services);
  add(FIELDS.provider.additionalServices, application.additionalServices);
  add(FIELDS.provider.support, application.concerns || application.support);
  add(FIELDS.provider.additionalConcerns, application.additionalConcerns);
  add(FIELDS.provider.population, application.populationsServed || application.populations);
  add(FIELDS.provider.additionalPopulations, application.additionalPopulations);
  add(FIELDS.provider.location, application.state || application.location);
  add(FIELDS.provider.additionalStates, application.additionalStates);
  add(FIELDS.provider.payment, application.payType || application.payment);
  add(FIELDS.provider.additionalPayTypes, application.additionalPayTypes);
  add(FIELDS.provider.availability, application.availability);
  add(FIELDS.provider.price, application.price);
  add(FIELDS.provider.physicalLocations, application.physicalLocations);
  add(FIELDS.provider.availabilitySpecifics, application.availabilitySpecifics || application.currentAvailability);
  add(FIELDS.provider.responseTime, application.typicalResponseTime || application.responseTime);
  add(FIELDS.provider.referralMethod, application.preferredReferralMethod || application.referralMethod);
  add(FIELDS.provider.referralInstructions, application.referralInstructions);
  add(FIELDS.provider.collaborationInterests, application.collaborationInterests);
  add(FIELDS.provider.otherCollaboration, application.otherCollaboration);
  add(FIELDS.provider.collaborationDetails, application.collaborationDetails);
  add(FIELDS.provider.providerNotes, application.providerToProviderNotes || application.providerNotes);
  if (application.consentCommunity !== undefined) add(FIELDS.provider.agreement, application.consentCommunity ? "Yes" : "No");
  if (application.infoOptIn !== undefined) {
    add(FIELDS.provider.infoOptIn, application.infoOptIn ? "Yes" : "No");
    add(FIELDS.provider.subscriber, application.infoOptIn ? "Yes" : "No");
  }
  if (application.consentDirectory !== undefined) add(FIELDS.provider.consent, application.consentDirectory ? "Yes" : "No");
  add(FIELDS.provider.signature, application.signature);
  add(FIELDS.provider.heardAboutUs, application.heardAboutUs);
  add(FIELDS.provider.styleWords, application.styleWords);
  add(FIELDS.provider.clientDescriptors, application.clientsDescribeMeAs || application.clientDescriptors);
  add(FIELDS.provider.groundingRitual, application.groundingRitual);
  add(FIELDS.provider.outsideSessions, application.outsideSessions);
  add(FIELDS.provider.guidingBelief, application.guidingBelief);
  add(FIELDS.provider.healingWish, application.healingTruth || application.healingWish);
  add(FIELDS.provider.comfortPractice, application.favoriteComfortPractice || application.comfortPractice);
  add(FIELDS.provider.funFact, application.funFact);
  add(FIELDS.provider.vibe, application.vibe);
  return fields;
}

async function saveAccount(user, body) {
  const accountType = lower(body.accountType) === "provider" ? "provider" : "client";
  let saved;
  if (accountType === "provider") {
    const account = await ensureDirectoryAccountForUser(user, {
      email: user.email,
      name: body.name || publicUser(user)?.name || user.email.split("@")[0],
      accountType
    });
    const fields = {};
    const table = await metadataTable("directory").catch(() => null);
    setResolvedAlias(fields, table, FIELDS.provider.name, body.name);
    setResolvedAlias(fields, table, FIELDS.provider.email, user.email);
    setResolvedAlias(fields, table, FIELDS.provider.accountType, accountType);
    setResolvedAlias(fields, table, FIELDS.provider.type, body.interests || body.areaInterest);
    saved = Object.keys(fields).length ? await updateSafe("directory", account.id, fields) : account;
  } else {
    saved = await ensureMemberAccount({
      email: user.email,
      name: body.name || publicUser(user)?.name || user.email.split("@")[0],
      accountType,
      status: "Approved",
      areaInterest: body.interests || body.areaInterest,
      source: "account"
    });
  }
  const signup = await recordSignup(accountType, {
    name: body.name || publicUser(user)?.name || user.email.split("@")[0],
    email: user.email,
    accountType,
    status: accountType === "provider" ? "Pending Review" : "Approved",
    areaInterest: body.interests || body.areaInterest,
    source: "account"
  }).catch((error) => ({ syncWarning: error.message }));
  const supabaseSync = await syncSignupToSupabase(accountType, {
    name: body.name || publicUser(user)?.name || user.email.split("@")[0],
    email: user.email,
    accountType,
    status: accountType === "provider" ? "Pending Review" : "Approved",
    areaInterest: body.interests || body.areaInterest
  });
  return { ok: true, account: { ...accountFromRecord(user, saved, accountType), interests: arrayRaw(body.interests || body.areaInterest) }, signup, supabaseSync };
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
  setAlias(fields, FIELDS.provider.photoUrl, body.photoUrl);
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
  const approvalStatus = lower(text(pick(f, FIELDS.provider.status)));
  const accountType = lower(text(pick(f, FIELDS.provider.accountType)));
  const clientAccount = ["client", "community", "community member", "member"].includes(accountType);
  const explicitlyApproved = truthy(approvalValue) || ["approved", "active", "published", "live", "open"].includes(approvalStatus);
  return {
    id: record.id, name: text(pick(f, FIELDS.provider.name)) || "Provider",
    accountType,
    order: numberValue(pick(f, FIELDS.provider.order)),
    email: text(pick(f, FIELDS.provider.email)), phone: text(pick(f, FIELDS.provider.phone)),
    photo: attachment(pick(f, FIELDS.provider.photo)) || text(pick(f, FIELDS.provider.photoUrl)), bio: text(pick(f, FIELDS.provider.bio)),
    profession: text(pick(f, FIELDS.provider.profession)), pronouns: text(pick(f, FIELDS.provider.pronouns)),
    providerType: array(pick(f, FIELDS.provider.type)), services: array(pick(f, FIELDS.provider.services)),
    support: array(pick(f, FIELDS.provider.support)), populations: array(pick(f, FIELDS.provider.population)),
    location: array(pick(f, FIELDS.provider.location)), payment: array(pick(f, FIELDS.provider.payment)),
    website: text(pick(f, FIELDS.provider.website)), consultationLink: text(pick(f, FIELDS.provider.consult)),
    humanSide: text(pick(f, FIELDS.provider.human)), collaboration: text(pick(f, FIELDS.provider.collaboration)),
    verified: truthy(pick(f, FIELDS.provider.verified)), approved: truthy(approvalValue),
    isPublic: !clientAccount && explicitlyApproved
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
    image: attachment(pick(f, FIELDS.event.image)) || text(pick(f, FIELDS.event.imageUrl)), status, created: text(pick(f, FIELDS.event.created)),
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
  return {
    support: await selectOptions("directory", FIELDS.provider.support),
    providerType: await selectOptions("directory", FIELDS.provider.type),
    payment: await selectOptions("directory", FIELDS.provider.payment),
    services: await selectOptions("directory", FIELDS.provider.services),
    populations: await selectOptions("directory", FIELDS.provider.population),
    locations: await selectOptions("directory", FIELDS.provider.location),
    availability: await selectOptions("directory", FIELDS.provider.availability),
    identity: await selectOptions("directory", FIELDS.provider.identity),
    genderIdentity: await selectOptions("directory", FIELDS.provider.genderIdentity),
    responseTime: await selectOptions("directory", FIELDS.provider.responseTime),
    referralMethod: await selectOptions("directory", FIELDS.provider.referralMethod),
    heardAboutUs: await selectOptions("directory", FIELDS.provider.heardAboutUs),
    collaborationInterests: await selectOptions("directory", FIELDS.provider.collaborationInterests),
    vibe: await selectOptions("directory", FIELDS.provider.vibe),
  };
}

async function getEventOptions() {
  return {
    category: await selectOptions("events", FIELDS.event.category),
    audience: await selectOptions("events", FIELDS.event.audience),
    eventType: await selectOptions("events", FIELDS.event.type),
    locationType: await selectOptions("events", FIELDS.event.locationType),
  };
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
  const tableNameOrId = await resolveAirtableTableName(key);
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, payload.error?.message || `Airtable metadata request failed (${response.status}).`);
  return (payload.tables || []).find((table) => table.id === tableNameOrId || table.name === tableNameOrId);
}

async function resolveAirtableTableName(key) {
  if (TABLE_LOOKUP.has(key)) return TABLE_LOOKUP.get(key);
  const candidates = resolveTableCandidates(key);
  const tables = await getAirtableTables();

  const match = tables.find((table) => candidates.some((candidate) => table.id === candidate || lower(table.name) === lower(candidate)));
  if (match) {
    const resolved = match.name || match.id;
    TABLE_LOOKUP.set(key, resolved);
    return resolved;
  }

  const created = await ensureAirtableTable(key, candidates);
  if (created) {
    TABLE_LOOKUP.set(key, created);
    return created;
  }

  const fallback = candidates[0] || TABLES[key];
  if (!fallback) throw httpError(500, `Missing Airtable table configuration: ${key}`);
  TABLE_LOOKUP.set(key, fallback);
  return fallback;
}

function resolveTableCandidates(key) {
  const base = TABLES[key];
  if (key === "providerSignups" || key === "clients") {
    return unique([base, ...TABLE_ALIASES[key]]);
  }
  return [base].filter(Boolean);
}

async function ensureAirtableTable(key, candidates = []) {
  if (!AIRTABLE_AUTO_CREATE_TABLES) return null;
  const schema = AIRTABLE_BOOTSTRAP_SCHEMAS[key];
  if (!schema) return null;
  const desiredName = getPreferredTableName(key, candidates);
  const response = await createAirtableTable({
    ...schema,
    name: desiredName
  });
  if (!response) return null;
  TABLE_META_CACHE.clear();
  return response;
}

function getPreferredTableName(key, candidates = []) {
  return (candidates || []).find((candidate) => candidate && !/^rec/.test(candidate)) || (AIRTABLE_BOOTSTRAP_SCHEMAS[key]?.name || key);
}

async function createAirtableTable(definition) {
  try {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: definition.name, fields: definition.fields })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return null;
    return payload?.name || definition?.name || null;
  } catch {
    return null;
  }
}

async function getAirtableTables() {
  if (TABLE_META_CACHE.has("tables")) return TABLE_META_CACHE.get("tables");

  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw httpError(response.status, payload.error?.message || `Airtable metadata request failed (${response.status}).`);

  const tables = payload.tables || [];
  TABLE_META_CACHE.set("tables", tables);
  return tables;
}

async function mappedFields(key) {
  const set = SAVE_FIELD_SETS[key];
  if (!set) return {};
  const cached = FIELD_NAME_CACHE.get(key);
  if (cached) return cached;

  const tableName = key === "providerSignup" ? "providerSignups" : key === "clientSignup" ? "clients" : key.startsWith("provider") ? "savedProviders" : "savedEvents";
  const table = await metadataTable(tableName);
  const fields = {};
  for (const [alias, names] of Object.entries(set)) {
    fields[alias] = findField(table, names);
  }
  FIELD_NAME_CACHE.set(key, fields);
  return fields;
}

function findField(table, names) {
  const matches = new Set(
    names.map((name) => lower(name))
  );
  const found = table?.fields?.find((field) => matches.has(lower(field.name)));
  return found?.name || names[0];
}

function signupTableForType(accountType) {
  return lower(accountType) === "provider" ? "providerSignups" : "clients";
}

async function recordSignup(accountType, body) {
  const table = signupTableForType(accountType);
  const result = await safeAirtableSignup(table, accountType, body);
  if (result) return result;
  if (lower(accountType) !== "provider") throw httpError(500, "Members table was not found in Airtable, so the member account was not recorded.");
  const fallbackTable = "directory";
  const fields = buildSignupFallbackFields(accountType, body);
  const fallbackRecord = await createSafe(fallbackTable, fields);
  return {
    id: fallbackRecord.id,
    fields: fallbackRecord.fields,
    table: fallbackTable,
    syncWarning: accountType === "provider" ? "Provider signup table was not found in Airtable; your signup was stored in Directory as a fallback." : "Clients table was not found in Airtable; your signup was stored in Directory as a fallback."
  };
}

async function safeAirtableSignup(table, accountType, body) {
  const set = accountType === "provider" ? SAVE_FIELD_SETS.providerSignup : SAVE_FIELD_SETS.clientSignup;
  const fields = {};
  if (!set) throw httpError(500, "Unknown signup table configuration.");

  const mapped = await mappedFields(accountType === "provider" ? "providerSignup" : "clientSignup");
  const tableMeta = await metadataTable(table).catch(() => null);

  setAirtableValue(fields, tableMeta, mapped.name, body.name);
  setAirtableValue(fields, tableMeta, mapped.email, body.email);
  setAirtableValue(fields, tableMeta, mapped.accountType, body.accountType);
  setAirtableValue(fields, tableMeta, mapped.status, body.status);
  setAirtableValue(fields, tableMeta, mapped.phone, body.phone);
  setAirtableValue(fields, tableMeta, mapped.website, body.website);
  setAirtableValue(fields, tableMeta, mapped.professionalTitle, body.professionalTitle);
  setAirtableValue(fields, tableMeta, mapped.message, body.message);
  setAirtableValue(fields, tableMeta, mapped.areaInterest, body.areaInterest);
  setAirtableValue(fields, tableMeta, mapped.source, body.source || "app");

  const records = await list(table);
  const existing = records.find((record) => {
    const existingEmail = firstEmail(pick(record.fields || {}, [mapped.email]));
    return existingEmail && lower(existingEmail) === lower(body.email);
  });
  if (existing) {
    const nextFields = { ...fields };
    nextFields[mapped.status] = body.status;
    try {
      return updateSafe(table, existing.id, nextFields);
    } catch (error) {
      if (!isMissingAirtableTable(error.message)) throw error;
      return null;
    }
  }

  try {
    return createSafe(table, fields);
  } catch (error) {
    if (!isMissingAirtableTable(error.message)) throw error;
    return null;
  }
}

function buildSignupFallbackFields(accountType, body) {
  const mapped = accountType === "provider" ? {
    email: "Email",
    accountType: "Account Type",
    status: "Status",
    name: "Name",
    notes: "Notes"
  } : {
    email: "Email",
    accountType: "Account Type",
    status: "Status",
    name: "Name"
  };
  const output = {
    [mapped.email]: body.email,
    [mapped.accountType]: accountType,
    [mapped.status]: body.status,
    [mapped.name]: body.name
  };
  if (body.phone) output.Phone = body.phone;
  if (body.website) output.Website = body.website;
  if (body.professionalTitle) output["Professional Title"] = body.professionalTitle;
  if (body.message) output[mapped.notes || "Message"] = body.message;
  if (body.areaInterest) output["Area of Interest"] = listText(body.areaInterest);
  return output;
}

function isMissingAirtableTable(message) {
  const textMessage = String(message || "");
  return textMessage.includes("Could not find table") || textMessage.includes("Unknown table") || textMessage.includes("does not exist");
}

async function syncSignupToSupabase(accountType, body) {
  const syncTargets = lower(accountType) === "provider"
    ? unique([SUPABASE_SIGNUP_TABLES.provider, SUPABASE_SIGNUP_TABLES.fallback].filter(Boolean))
    : unique([SUPABASE_SIGNUP_TABLES.fallback, "signup_requests", SUPABASE_SIGNUP_TABLES.client].filter(Boolean));

  const payload = {
    email: body.email,
    full_name: body.name,
    account_type: accountType,
    status: lower(accountType) === "provider" ? "pending" : "approved",
    phone: clean(body.phone),
    website: clean(body.website),
    professional_title: clean(body.professionalTitle),
    message: clean(body.message),
    area_interest: listText(body.areaInterest),
    source: "app"
  };
  removeEmpty(payload);

  if (!SUPABASE_SERVICE_ROLE_KEY()) {
    return { synced: false, reason: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
  }

  const attempted = [];
  const errors = [];

  for (const tableName of syncTargets) {
    attempted.push(tableName);
    const outcome = await upsertSupabaseRow(tableName, payload, "email");
    if (outcome.ok) return { synced: true, table: tableName, recordId: outcome.recordId, attempted, note: outcome.note };
    errors.push(outcome.message);
    const notFound = /Could not find the table/i.test(outcome.message || "") || /does not exist/i.test(outcome.message || "") || /not found/i.test(outcome.message || "");
    if (!notFound) break;
  }

  return { synced: false, table: syncTargets[0], attempted, reason: errors[0] || "Signup sync to Supabase failed." };
}

async function upsertSupabaseRow(tableName, record, onConflictField = "email") {
  let nextRecord = { ...record };
  let useConflict = Boolean(onConflictField);
  const removedColumns = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const conflictParam = useConflict ? `?on_conflict=${encodeURIComponent(onConflictField)}` : "";
      const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(tableName)}${conflictParam}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY(),
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY()}`,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=merge-duplicates"
      },
      body: JSON.stringify([nextRecord])
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const row = Array.isArray(payload) && payload[0] ? payload[0] : null;
      return { ok: true, recordId: row?.id || row?.record_id || row?.uid || "", note: removedColumns.length ? `upserted without unsupported columns: ${removedColumns.join(", ")}` : row ? "upserted" : "recorded" };
    }

    if (response.status === 409 || payload.code === "23505" || /duplicate|conflict/i.test(payload.message || "")) {
      const existing = await lookupSupabaseByEmail(tableName, record.email);
      if (existing) return { ok: true, recordId: existing.id || existing.record_id || existing.uid || "", note: "existing" };
    }

    const message = payload.error?.message || payload.message || response.statusText || `Supabase upsert failed (${response.status}).`;
      const badColumn = supabaseBadColumnName(message);
      if (badColumn && Object.prototype.hasOwnProperty.call(nextRecord, badColumn)) {
        delete nextRecord[badColumn];
        removedColumns.push(badColumn);
        if (!Object.keys(nextRecord).length) return { ok: false, status: response.status, message };
        continue;
      }
      if (useConflict && /no unique|no exclusion|ON CONFLICT|on conflict/i.test(message)) {
        useConflict = false;
        continue;
      }
      return { ok: false, status: response.status, message };
    } catch (error) {
      return { ok: false, message: error.message || "Supabase request could not be completed." };
    }
  }
  return { ok: false, message: "Supabase sync could not match the table schema." };
}

async function lookupSupabaseByEmail(tableName, email) {
  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(tableName)}?select=id,email&email=eq.${encodeURIComponent(email)}&limit=1`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY(),
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY()}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ([]));
    return Array.isArray(payload) ? payload[0] || null : null;
  } catch {
    return null;
  }
}

function supabaseBadColumnName(message) {
  const textMessage = String(message || "");
  const quoted = textMessage.match(/'([^']+)'\s+column/i);
  if (quoted?.[1]) return quoted[1];
  const missing = textMessage.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+(?:does not exist|not found)/i);
  if (missing?.[1]) return missing[1];
  const schema = textMessage.match(/schema cache.*?['"]([a-zA-Z0-9_]+)['"]/i);
  if (schema?.[1]) return schema[1];
  return "";
}

async function findDirectoryByEmail(email) {
  const records = await list("directory");
  return records.find((record) => lower(text(pick(record.fields || {}, FIELDS.provider.email))) === lower(email));
}

async function findSignupByEmail(accountType, email) {
  const table = signupTableForType(accountType);
  const mapped = await mappedFields(lower(accountType) === "provider" ? "providerSignup" : "clientSignup");
  const records = await list(table);
  return records.find((record) => {
    const existingEmail = firstEmail(pick(record.fields || {}, [mapped.email]));
    return existingEmail && lower(existingEmail) === lower(email);
  });
}

function setOptional(fields, fieldName, value) {
  if (!fieldName) return;
  setAlias(fields, [fieldName], value);
}

function setAirtableValue(fields, table, fieldName, value) {
  if (!fieldName) return;
  const field = table?.fields?.find((item) => item.name === fieldName);
  if (field?.type === "multipleAttachments") {
    const attachments = arrayRaw(value)
      .map((item) => {
        if (typeof item === "object" && item?.url) return { url: clean(item.url) };
        const url = clean(item);
        return /^https?:\/\//i.test(url) ? { url } : null;
      })
      .filter(Boolean);
    if (attachments.length) fields[fieldName] = attachments;
    return;
  }
  const values = arrayRaw(value).flatMap((item) => String(item || "").split(/[,;\n]+/)).map(clean).filter(Boolean);
  let nextValue;
  if (field?.type === "multipleSelects") nextValue = values;
  else if (field?.type === "singleSelect") nextValue = values[0] || "";
  else if (Array.isArray(value)) nextValue = listText(value);
  else if (typeof value === "boolean") nextValue = value;
  else nextValue = clean(value);
  if (Array.isArray(nextValue) ? !nextValue.length : nextValue === "" || nextValue === undefined || nextValue === null) return;
  fields[fieldName] = nextValue;
}

async function ensureDirectoryAccountForUser(user, fallback) {
  const currentEmail = requiredEmail(user.email);
  const existing = await findDirectoryByEmail(currentEmail);
  if (existing) return existing;

  const metadata = user.user_metadata || user.userMetadata || {};
  const previousEmail = lower(metadata.previous_email || metadata.previousEmail || "");
  const previous = previousEmail ? await findDirectoryByEmail(previousEmail) : null;
  if (previous) {
    const table = await metadataTable("directory").catch(() => null);
    const fields = {};
    setResolvedAlias(fields, table, FIELDS.provider.email, currentEmail);
    setResolvedAlias(fields, table, FIELDS.provider.name, fallback.name || publicUser(user)?.name || currentEmail);
    setResolvedAlias(fields, table, FIELDS.provider.accountType, fallback.accountType || publicUser(user)?.accountType || "client");
    return updateSafe("directory", previous.id, fields);
  }

  return ensureDirectoryAccount({ ...fallback, email: currentEmail });
}

async function ensureDirectoryAccount({ email, name, accountType }) {
  const cleanEmail = requiredEmail(email);
  const existing = await findDirectoryByEmail(cleanEmail);
  if (existing) return existing;
  const fields = {};
  const table = await metadataTable("directory").catch(() => null);
  setResolvedAlias(fields, table, FIELDS.provider.email, cleanEmail);
  setResolvedAlias(fields, table, FIELDS.provider.name, name || cleanEmail);
  setResolvedAlias(fields, table, FIELDS.provider.accountType, accountType || "client");
  if (lower(accountType) === "provider") setResolvedAlias(fields, table, FIELDS.provider.status, "Pending Review");
  return createSafe("directory", fields);
}

async function ensureSaverAccount(user) {
  const accountType = accountTypeForUser(user);
  if (accountType === "provider") {
    return ensureDirectoryAccountForUser(user, {
      email: user.email,
      name: publicUser(user)?.name || user.email.split("@")[0],
      accountType
    });
  }
  return ensureMemberAccount({
    email: user.email,
    name: publicUser(user)?.name || user.email.split("@")[0],
    accountType: "client",
    status: "Approved",
    areaInterest: user.user_metadata?.area_interest || user.userMetadata?.area_interest || user.user_metadata?.areaInterest || user.userMetadata?.areaInterest,
    source: "app"
  });
}

async function findSaverAccount(user) {
  const accountType = accountTypeForUser(user);
  if (accountType === "provider") return findDirectoryByEmail(user.email);
  return findSignupByEmail("client", user.email).catch(() => null);
}

async function ensureMemberAccount(body) {
  const record = await safeAirtableSignup("clients", "client", {
    name: body.name,
    email: body.email,
    accountType: "client",
    status: body.status || "Approved",
    areaInterest: body.areaInterest,
    source: body.source || "app"
  });
  if (!record) throw httpError(500, "Members table was not found in Airtable, so the member account was not recorded.");
  return record;
}

function accountTypeForUser(user) {
  const publicAccountType = lower(publicUser(user)?.accountType);
  return hasProviderAccess(user) || publicAccountType === "provider" ? "provider" : "client";
}

function accountInterests(accountRecord, signupRecord, accountType) {
  if (lower(accountType) === "provider") {
    const providerTypes = array(pick(accountRecord.fields || {}, FIELDS.provider.type));
    if (providerTypes.length) return providerTypes;
  }
  const mapped = lower(accountType) === "provider" ? SAVE_FIELD_SETS.providerSignup : SAVE_FIELD_SETS.clientSignup;
  const aliases = mapped?.areaInterest || ["Area of Interest"];
  const signupInterests = arrayRaw(pick(signupRecord?.fields || {}, aliases));
  if (signupInterests.length) return signupInterests;
  return array(pick(accountRecord.fields || {}, FIELDS.provider.type));
}

function accountFromRecord(user, record, forcedAccountType = "") {
  if (!record) {
    return {
      id: "",
      email: user.email || "",
      name: publicUser(user)?.name || "",
      accountType: forcedAccountType || user.user_metadata?.account_type || user.userMetadata?.account_type || "client"
    };
  }
  const f = record.fields || {};
  return {
    id: record.id,
    email: text(pick(f, FIELDS.provider.email)) || user.email || "",
    name: text(pick(f, FIELDS.provider.name)) || publicUser(user)?.name || "",
    accountType: forcedAccountType || text(pick(f, FIELDS.provider.accountType)) || user.user_metadata?.account_type || user.userMetadata?.account_type || "client"
  };
}

function setAlias(fields, names, value) {
  if (!names?.length) return;
  const nextValue = Array.isArray(value) ? listText(value) : typeof value === "boolean" ? value : clean(value);
  if (nextValue === "" || nextValue === undefined || nextValue === null) return;
  fields[names[0]] = nextValue;
}

function setResolvedAlias(fields, table, names, value) {
  if (!names?.length) return;
  setAirtableValue(fields, table, findField(table, names), value);
}

function listText(value) {
  return arrayRaw(value).flatMap((item) => String(item || "").split(/[,;\n]+/)).map(clean).filter(Boolean).join(", ");
}

function attachmentFromUrl(value) {
  const url = clean(value);
  return /^https?:\/\//i.test(url) ? [{ url }] : undefined;
}

async function uploadProviderAsset(file, owner = "", kind = "upload") {
  if (!file?.dataUrl || !SUPABASE_SERVICE_ROLE_KEY()) return "";
  const match = String(file.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return "";
  const mimeType = clean(file.type || match[1] || "application/octet-stream");
  if (!mimeType.startsWith("image/")) return "";
  const extension = clean((file.name || "").split(".").pop() || mimeType.split("/").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "jpg";
  const bucket = "provider-uploads";
  const safeOwner = slug(owner || "provider");
  const objectPath = `provider-applications/${safeOwner}-${Date.now()}-${kind}.${extension}`;
  const bytes = Buffer.from(match[2], "base64");
  try {
    await ensureSupabaseBucket(bucket);
    const endpoint = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY(),
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY()}`,
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: bytes
    });
    if (!response.ok) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  } catch {
    return "";
  }
}

async function ensureSupabaseBucket(bucket) {
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY(),
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 5242880, allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"] })
    });
  } catch {
    // Bucket may already exist or storage may be unavailable. Upload will decide whether to continue.
  }
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
    const badField = badAirtableFieldName(error.message);
    if (badField && Object.prototype.hasOwnProperty.call(fields, badField)) {
      delete fields[badField];
      if (!Object.keys(fields).length) throw error;
      return mutateSafe(operation, fields);
    }
    throw error;
  }
}

function badAirtableFieldName(message) {
  const textMessage = String(message || "");
  const unknown = textMessage.match(/Unknown field name: "([^"]+)"/i);
  if (unknown?.[1]) return unknown[1];
  const cannotAccept = textMessage.match(/Field "?([^"]+)"? cannot accept/i);
  if (cannotAccept?.[1]) return cannotAccept[1];
  const cannotUpdate = textMessage.match(/Cannot update field "?([^"]+)"?/i);
  if (cannotUpdate?.[1]) return cannotUpdate[1];
  return "";
}

async function airtable(key, id = "", options = {}) {
  const table = await resolveAirtableTableName(key);
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
function belongsTo(record, email, accountRecordId = "") {
  const fields = record.fields || {};
  if (accountRecordId) {
    const linkedAccountIds = linkedIds(pick(fields, ["Saver Info", "Saver", "Member", "Client", "User", "Saved By"]));
    if (linkedAccountIds.includes(accountRecordId)) return true;
  }
  const candidates = [
    "Saver Email Text", "Saver Email", "Email", "User Email", "User's Email", "Saved By", "Saved By Email",
    "Client Email", "Owner Email", "Member Email", "Creator", "Host Email", "Invite Email", "User Email Address"
  ];
  const fieldEmailValues = candidates.flatMap((name) => collectEmailsFromValue(fields[name]));
  const allFieldValues = Object.values(fields).flatMap((value) => collectEmailsFromValue(value));
  const allValues = [...fieldEmailValues, ...allFieldValues];
  return allValues.some((value) => lower(firstEmail(value)) === lower(email));
}
function activeRecord(record) {
  const value = pick(record.fields || {}, ["Active", "Saved", "Is Active", "Visible"]);
  return value === undefined || truthy(value);
}
function providerIds(record) {
  const values = pick(record.fields || {}, ["Saved Provider Info", "Saved Provider", "Directory", "Directory Record", "Directory Grid View", "Provider", "Saved Providers", "Providers", "Provider Record"]);
  const listed = linkedIds(values);
  if (listed.length) return listed;
  return extractRecordIds(record.fields || {});
}

function eventIds(record) {
  const values = pick(record.fields || {}, ["Saved Workshop", "Saved Event", "Saved Events", "Event", "Events", "Workshop", "Saved Workshops", "Workshop Events", "Event Record", "Event Link"]);
  const listed = linkedIds(values);
  if (listed.length) return listed;
  return extractRecordIds(record.fields || {});
}
function linkedIds(value) { return arrayRaw(value).map((v) => typeof v === "object" ? clean(v.id || v.recordId || v.value) : clean(v)).filter((v) => v.startsWith("rec")); }

function extractRecordIds(fields) {
  return Object.values(fields)
    .flatMap((value) => arrayRaw(value))
    .map((value) => {
      if (value == null) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") return clean(value.id || value.recordId || value.value || value.url || value.text || value.name);
      return "";
    })
    .filter((value) => /^rec[a-zA-Z0-9]{14}$/.test(value));
}
function collectEmailsFromValue(value) {
  const emails = [];
  for (const item of arrayRaw(value)) {
    if (item == null) continue;
    if (typeof item === "object") {
      const candidate = firstEmail(item.email || item.value || item.text || item.name || item.label || item.url);
      if (candidate) emails.push(candidate);
      continue;
    }
    if (typeof item === "string") emails.push(item);
  }
  return emails;
}
function firstEmail(value) {
  if (value == null) return "";
  if (typeof value === "string") {
    const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : value;
  }
  if (typeof value === "object") return firstEmail(value.email || value.value || value.text || value.name || value.label || "");
  return String(value);
}
function pick(fields, names) { for (const name of names) if (Object.prototype.hasOwnProperty.call(fields, name)) return fields[name]; return undefined; }
function text(value) { if (value == null) return ""; if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", "); if (typeof value === "object") return text(value.name ?? value.label ?? value.value ?? value.text ?? value.url ?? ""); return clean(value); }
function array(value) { return arrayRaw(value).map(text).flatMap((v) => v.split(/[,;\n]+/)).map(clean).filter(Boolean); }
function arrayRaw(value) { return value == null ? [] : Array.isArray(value) ? value : [value]; }
function attachment(value) { const first = arrayRaw(value)[0]; return typeof first === "string" ? first : first?.url || first?.thumbnails?.large?.url || ""; }
function truthy(value) { if (value === true || value === 1) return true; return ["true", "yes", "approved", "published", "active", "open", "1", "checked"].includes(lower(text(value))); }
function clean(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function slug(value) { return lower(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "provider"; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function required(value, label) { const cleanValue = clean(value); if (!cleanValue) throw httpError(400, `${label} is required.`); return cleanValue; }
function removeEmpty(fields, keepEmpty = false) { Object.keys(fields).forEach((key) => { if (fields[key] == null || (!keepEmpty && typeof fields[key] === "string" && !fields[key].trim())) delete fields[key]; }); }
function dateValue(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) ? 0 : time; }
function statusKey(value) { const status = lower(value); if (status.includes("pending") || status.includes("review")) return "pending"; if (status.includes("approved") || status.includes("published")) return "approved"; if (status.includes("declined") || status.includes("rejected")) return "declined"; return "other"; }
function providerSort(a, b) {
  if (a.order !== b.order) return a.order - b.order;
  return (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" });
}
function numberValue(value) {
  const valueOrNumber = Number(String(value || "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(valueOrNumber) ? valueOrNumber : Infinity;
}
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function reply(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
