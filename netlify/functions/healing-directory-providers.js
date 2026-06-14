const DEFAULT_BASE_ID = "appJbWRXBOpmfNcUQ";
const DEFAULT_TABLE_ID = "tblOgiBFqw5iftDAE";
const DEFAULT_VIEW_ID = "viwd0UGAiaOGCprXo";

const FIELD_CANDIDATES = {
  name: ["Name", "Provider Name", "Full Name", "name"],
  pronouns: ["Pronouns", "pronouns"],
  profession: ["Profession", "Title", "Professional Title", "Credentials", "profession"],
  bio: ["Bio", "Provider Bio", "About", "Description", "bio"],
  photo: ["Photo", "Profile Photo", "Headshot", "Image", "profilePhotoUrl"],
  email: ["Email", "Provider Email", "email"],
  phone: ["Phone", "Phone Number", "provider phone", "phone"],
  website: ["Website", "Web Site", "Site", "website"],
  consultationLink: ["Consultation Link", "Consult Link", "Booking Link", "Schedule Link", "Calendly", "consultationLink"],
  providerType: ["Provider Type", "Provider Types", "Type", "providerType"],
  servicesOffered: ["Services Offered", "Services", "Offerings", "servicesOffered"],
  areasOfSupport: ["Areas of Support", "Concerns", "Specialties", "areasOfSupport"],
  populationsServed: ["Populations Served", "Population", "Who I Serve", "populationsServed"],
  state: ["State", "Location", "Locations", "Virtual/In Person", "state"],
  payment: ["Payment", "Pay Type", "Insurance", "Fees", "additionalPayment", "payType"],
  approved: ["Approved", "Public", "Published", "Show in Directory", "approved"],
  verified: ["Verified", "Referral Room", "Verified Member", "referralRoom"]
};

function getEnvField(key) {
  const envKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
  return process.env[`AIRTABLE_DIRECTORY_FIELD_${envKey}`];
}

function pickField(fields, key) {
  const names = [getEnvField(key), ...(FIELD_CANDIDATES[key] || [])].filter(Boolean);
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(fields, name)) return fields[name];
  }
  return undefined;
}

function unwrapValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    if (value.length > 0 && value[0] && typeof value[0] === "object" && value[0].url) return value[0].url;
    return value.map((item) => unwrapValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    if (value.url !== undefined) return unwrapValue(value.url);
    if (value.value !== undefined) return unwrapValue(value.value);
    if (value.label !== undefined) return unwrapValue(value.label);
    if (value.name !== undefined) return unwrapValue(value.name);
    if (value.title !== undefined) return unwrapValue(value.title);
    if (value.text !== undefined) return unwrapValue(value.text);
    return "";
  }
  if (typeof value === "boolean") return value ? "true" : "";
  return String(value).replace(/\s+/g, " ").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((item) => unwrapValue(item)).filter(Boolean);
  return unwrapValue(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function isTruthy(value) {
  if (value === undefined) return false;
  if (value === true || value === 1) return true;
  const text = unwrapValue(value).toLowerCase();
  return ["true", "yes", "approved", "published", "public", "show", "1"].includes(text);
}

function recordToProvider(record) {
  const fields = record.fields || {};
  const name = unwrapValue(pickField(fields, "name"));
  return {
    id: record.id,
    name: name || "Provider",
    pronouns: unwrapValue(pickField(fields, "pronouns")),
    profession: unwrapValue(pickField(fields, "profession")),
    bio: unwrapValue(pickField(fields, "bio")),
    photo: unwrapValue(pickField(fields, "photo")),
    email: unwrapValue(pickField(fields, "email")),
    phone: unwrapValue(pickField(fields, "phone")),
    website: unwrapValue(pickField(fields, "website")),
    consultationLink: unwrapValue(pickField(fields, "consultationLink")),
    providerType: toArray(pickField(fields, "providerType")),
    servicesOffered: toArray(pickField(fields, "servicesOffered")),
    areasOfSupport: toArray(pickField(fields, "areasOfSupport")),
    populationsServed: toArray(pickField(fields, "populationsServed")),
    state: toArray(pickField(fields, "state")),
    payment: toArray(pickField(fields, "payment")),
    approved: isTruthy(pickField(fields, "approved")),
    verified: isTruthy(pickField(fields, "verified"))
  };
}

async function fetchAllRecords() {
  const token = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_DIRECTORY_BASE_ID || DEFAULT_BASE_ID;
  const tableId = process.env.AIRTABLE_DIRECTORY_TABLE_ID || DEFAULT_TABLE_ID;
  const viewId = process.env.AIRTABLE_DIRECTORY_VIEW_ID || DEFAULT_VIEW_ID;
  if (!token || !baseId || !tableId) return { configured: false, records: [] };

  const records = [];
  let offset = "";
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (viewId) params.set("view", viewId);
    if (offset) params.set("offset", offset);
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${params}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Airtable request failed: ${response.status} ${await response.text()}`);
    const payload = await response.json();
    records.push(...(payload.records || []));
    offset = payload.offset || "";
  } while (offset);
  return { configured: true, records };
}

exports.handler = async function handler() {
  try {
    const { configured, records } = await fetchAllRecords();
    const providers = records.map(recordToProvider);
    const approvedProviders = providers.filter((provider) => provider.approved);
    return json(200, { configured, providers: approvedProviders.length ? approvedProviders : providers });
  } catch (error) {
    return json(500, { error: "Unable to load Healing Directory providers.", details: error.message });
  }
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    body: JSON.stringify(payload)
  };
}
