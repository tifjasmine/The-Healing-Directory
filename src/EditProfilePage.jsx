import React from "react";
import {
  Camera,
  Mail,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  UserRound,
} from "lucide-react";

const API = "/.netlify/functions/app-api";

const EMPTY_PROFILE = {
  id: "",
  name: "",
  pronouns: "",
  profession: "",
  license: "",
  identity: "",
  email: "",
  phone: "",
  website: "",
  consultationLink: "",
  bio: "",
  photo: "",
  providerType: "",
  services: "",
  support: "",
  populations: "",
  payment: "",
  location: "",
  availability: "",
  price: "",
  physicalLocations: "",
  availabilitySpecifics: "",
  responseTime: "",
  referralMethod: "",
  referralInstructions: "",
  collaborationInterests: "",
  collaborationDetails: "",
  providerNotes: "",
  infoOptIn: false,
  styleWords: "",
  clientDescriptors: "",
  groundingRitual: "",
  outsideSessions: "",
  guidingBelief: "",
  healingWish: "",
  comfortPractice: "",
  funFact: "",
  vibe: "",
};

export default function EditProfilePage({ user, setNotice }) {
  const [form, setForm] = React.useState(() => ({ ...EMPTY_PROFILE, email: user?.email || "" }));
  const [initial, setInitial] = React.useState(() => ({ ...EMPTY_PROFILE, email: user?.email || "" }));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    api("my-profile")
      .then((payload) => {
        if (!alive) return;
        const next = hydrateProfile(payload.profile, user);
        setForm(next);
        setInitial(next);
      })
      .catch((error) => {
        const message = error.message || "Profile could not load.";
        setStatus(message);
        setNotice?.(message);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [setNotice, user]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetChanges() {
    setForm(initial);
    setStatus("Changes reset.");
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const payload = await api("save-profile", {
        method: "POST",
        body: serializeProfile(form),
      });
      const next = hydrateProfile(payload.profile, user);
      setForm(next);
      setInitial(next);
      setStatus("Profile saved.");
      setNotice?.("Profile saved.");
    } catch (error) {
      const message = error.message || "Profile could not be saved.";
      setStatus(message);
      setNotice?.(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="edit-profile-page">
      <section className="edit-profile-hero dark-hero">
        <p className="brand-pill light">
          <UserRound size={16} />
          Your provider profile
        </p>
        <h1>Edit your Directory profile.</h1>
        <p>Update your public profile, provider intel, services, availability, and human-side details.</p>
        {loading ? (
          <span className="loading-pill">
            <RefreshCw className="spin" size={15} />
            Loading options...
          </span>
        ) : null}
      </section>

      <section className="edit-profile-layout">
        <aside className="profile-preview account-card">
          <ProfilePhoto form={form} />
          <h2>{form.name || "Your name"}</h2>
          <p>{form.profession || "Provider profession"}</p>
          <div className="preview-divider" />
          <span>{form.email || user?.email || "Email connected to this account"}</span>

          <div className="message-card">
            <Mail size={20} />
            <strong>Message provider</strong>
            <p>Preview how contact details will feel on your public profile.</p>
            <textarea readOnly value="Example: Hi, I found your profile through The Healing Directory and would love to connect about a referral..." />
            <button type="button">
              <Send size={16} />
              Send message
            </button>
          </div>
        </aside>

        <form className="profile-editor" onSubmit={save}>
          <ProfileSection title="Profile basics" text="Main public profile information.">
            <div className="photo-editor">
              <ProfilePhoto form={form} />
              <div>
                <p className="eyebrow ink">Profile photo</p>
                <h3>Current profile photo</h3>
                <p>Photo uploads are still managed from the connected Directory record. This page keeps the saved image visible while you edit the rest of the profile.</p>
                <span className="photo-note">
                  <Camera size={16} />
                  Airtable attachment field
                </span>
              </div>
            </div>

            <div className="profile-form-grid">
              <Field label="Name" value={form.name} onChange={(value) => update("name", value)} required />
              <Field label="Pronouns" value={form.pronouns} onChange={(value) => update("pronouns", value)} />
              <Field label="Profession" value={form.profession} onChange={(value) => update("profession", value)} required />
              <Field label="License / certification" value={form.license} onChange={(value) => update("license", value)} />
              <Field label="Racial / ethnic identity" value={form.identity} onChange={(value) => update("identity", value)} />
              <Field label="Email" value={form.email} readOnly />
              <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
              <Field label="Website" value={form.website} onChange={(value) => update("website", value)} />
              <Field label="Consultation link" value={form.consultationLink} onChange={(value) => update("consultationLink", value)} />
              <Field label="Bio" value={form.bio} onChange={(value) => update("bio", value)} textarea full required />
            </div>
          </ProfileSection>

          <ProfileSection title="Areas of care" text="Services, concerns, locations, availability, and payment. Use commas to separate multiple selections.">
            <div className="profile-form-grid">
              <Field label="Service type" value={form.providerType} onChange={(value) => update("providerType", value)} helper="Example: Therapist / Counselor, Somatic Practitioner" required />
              <Field label="Concerns / areas of support" value={form.support} onChange={(value) => update("support", value)} helper="Example: Anxiety, Depression, Trauma" required />
              <Field label="Services offered" value={form.services} onChange={(value) => update("services", value)} />
              <Field label="People served" value={form.populations} onChange={(value) => update("populations", value)} />
              <Field label="Payment / insurance" value={form.payment} onChange={(value) => update("payment", value)} />
              <Field label="State" value={form.location} onChange={(value) => update("location", value)} />
              <Field label="Availability" value={form.availability} onChange={(value) => update("availability", value)} />
              <Field label="Price" value={form.price} onChange={(value) => update("price", value)} />
              <Field label="Physical locations" value={form.physicalLocations} onChange={(value) => update("physicalLocations", value)} full />
              <Field label="Availability specifics" value={form.availabilitySpecifics} onChange={(value) => update("availabilitySpecifics", value)} textarea full />
            </div>
          </ProfileSection>

          <ProfileSection title="Provider intel" text="Referral and collaboration details for aligned providers.">
            <div className="profile-form-grid">
              <Field label="Typical response time" value={form.responseTime} onChange={(value) => update("responseTime", value)} />
              <Field label="Preferred referral method" value={form.referralMethod} onChange={(value) => update("referralMethod", value)} />
              <Field label="Referral instructions" value={form.referralInstructions} onChange={(value) => update("referralInstructions", value)} textarea full />
              <Field label="Collaboration interests" value={form.collaborationInterests} onChange={(value) => update("collaborationInterests", value)} helper="Example: Workshops, cross-promotion, peer support" full />
              <Field label="Collaboration details" value={form.collaborationDetails} onChange={(value) => update("collaborationDetails", value)} textarea full />
              <Field label="Provider-to-provider notes" value={form.providerNotes} onChange={(value) => update("providerNotes", value)} textarea full />
            </div>

            <label className="toggle-row">
              <span>Send me additional information about The Healing Directory, Referral Room updates, and collaboration opportunities.</span>
              <input type="checkbox" checked={form.infoOptIn} onChange={(event) => update("infoOptIn", event.target.checked)} />
            </label>
          </ProfileSection>

          <ProfileSection title="The human side" text="Warm details to make the profile feel personal.">
            <div className="profile-form-grid">
              <Field label="My style in three words" value={form.styleWords} onChange={(value) => update("styleWords", value)} />
              <Field label="Clients describe me as" value={form.clientDescriptors} onChange={(value) => update("clientDescriptors", value)} />
              <Field label="My grounding ritual" value={form.groundingRitual} onChange={(value) => update("groundingRitual", value)} />
              <Field label="Outside sessions" value={form.outsideSessions} onChange={(value) => update("outsideSessions", value)} />
              <Field label="Guiding belief" value={form.guidingBelief} onChange={(value) => update("guidingBelief", value)} full />
              <Field label="What I wish people knew about healing" value={form.healingWish} onChange={(value) => update("healingWish", value)} textarea full />
              <Field label="Favorite comfort practice" value={form.comfortPractice} onChange={(value) => update("comfortPractice", value)} />
              <Field label="Fun fact" value={form.funFact} onChange={(value) => update("funFact", value)} />
              <Field label="Vibe" value={form.vibe} onChange={(value) => update("vibe", value)} helper="Example: Warm and nurturing, calm and grounding" />
            </div>
          </ProfileSection>

          <div className="profile-actions sticky-actions">
            {status ? <span className="inline-status">{status}</span> : null}
            <button type="button" className="button tertiary" onClick={resetChanges}>
              <RotateCcw size={16} />
              Reset changes
            </button>
            <button className="button" disabled={saving}>
              {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function ProfileSection({ title, text, children }) {
  return (
    <section className="profile-section">
      <button type="button" className="section-disclosure" tabIndex={-1} aria-hidden="true">^</button>
      <h2>{title}</h2>
      <p className="section-copy">{text}</p>
      {children}
    </section>
  );
}

function ProfilePhoto({ form }) {
  const label = initials(form.name || form.email || "TH");
  return (
    <div className="profile-photo">
      {form.photo ? <img src={form.photo} alt="" /> : <span>{label}</span>}
    </div>
  );
}

function Field({ label, value, onChange, textarea, full, helper, required, readOnly }) {
  return (
    <label className={full ? "profile-field full" : "profile-field"}>
      <span>{label}{required ? " *" : ""}</span>
      {textarea ? (
        <textarea value={value || ""} onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly} rows={6} />
      ) : (
        <input value={value || ""} onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly} />
      )}
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function hydrateProfile(profile = {}, user) {
  return {
    ...EMPTY_PROFILE,
    ...profile,
    email: profile.email || user?.email || "",
    providerType: toText(profile.providerType),
    services: toText(profile.services),
    support: toText(profile.support),
    populations: toText(profile.populations),
    payment: toText(profile.payment),
    location: toText(profile.location),
    availability: toText(profile.availability),
    collaborationInterests: toText(profile.collaborationInterests),
    vibe: toText(profile.vibe),
    infoOptIn: profile.infoOptIn === true || profile.infoOptIn === "Yes",
  };
}

function serializeProfile(form) {
  return {
    ...form,
    providerType: toList(form.providerType),
    services: toList(form.services),
    support: toList(form.support),
    populations: toList(form.populations),
    payment: toList(form.payment),
    location: toList(form.location),
    availability: toList(form.availability),
    collaborationInterests: toList(form.collaborationInterests),
    vibe: toList(form.vibe),
  };
}

function toText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value == null ? "" : String(value);
}

function toList(value) {
  return String(value || "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function initials(value) {
  const parts = String(value || "TH").split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "T";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1] || "H";
  return `${first}${second}`.toUpperCase();
}

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);

  const response = await fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);

  return payload;
}
