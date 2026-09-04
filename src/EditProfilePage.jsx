import React from "react";
import {
  Camera,
  Check,
  ChevronDown,
  RefreshCw,
  RotateCcw,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { getAccessToken } from "./authClient.js";

const API = "/.netlify/functions/app-api";

const FALLBACK_OPTIONS = {
  providerType: ["Acupuncturist", "Birth & Postpartum Provider", "Bodywork & Massage Therapist", "Chiropractor", "Clinical Supervisor", "Coach", "Educator / Facilitator / Retreat Leader", "Energy, Sound & Spiritual Healer", "Movement & Yoga Provider", "Nutritionist / Dietitian", "Occupational Therapist", "Pelvic Floor Therapist", "Physical Therapist", "Psychiatrist / Medication Provider", "Psychologist", "Somatic Practitioner", "Therapist / Counselor", "Speech Therapist | Reading Specialist", "Energy Healer", "Sound & Spiritual Healer"],
  support: ["ADHD & Executive Functioning", "Anxiety, Stress & Overwhelm", "Attachment & Inner Child Work", "Autism & Neurodivergence", "Body Image & Eating Concerns", "Burnout & Exhaustion", "Chronic Pain & Illness", "Depression & Mood", "Digestive & Gut Health", "Family Dynamics & Divorce", "Geriatric Care", "Grief & Loss", "Intimacy & Couples", "LGBTQIA+ & Gender Identity", "Life Transitions", "Mentorship", "Motherhood & Identity Shifts", "Nervous System & Emotional Regulation", "Pelvic & Sexual Health", "Physical Health", "Pregnancy, Postpartum & Fertility", "PTSD and Trauma", "Reading, Spelling, & Language Development", "Relationships & Communication", "Self-Worth & Identity", "Sleep, Fatigue & Low Energy", "Spiritual Transition & Faith", "Substance Use & Addiction Recovery"],
  services: ["Acupuncture", "Birth, Postpartum & Lactation Support", "Bodywork & Massage", "Chiropractic Care", "Clinical Supervision & Consultation", "Couples & Relationship Support", "Creative Arts Therapy", "EMDR & Trauma-Informed Modalities", "Energy & Sound Healing", "Family Support", "Group Sessions & Circles", "Individual Sessions", "Movement & Yoga Therapy", "Nutrition & Health Support", "Occupational Therapy", "Parenting & Motherhood", "Pelvic Floor Therapy", "Physical Therapy", "Psychedelic Integration", "Somatic & Body-Based Therapy", "Spiritual & Faith-Based Support", "Workshops, Courses & Retreats"],
  populations: ["Adolescents", "Adults", "All", "BIPOC", "Children", "College Students", "Couples", "First Responders", "LGBTQIA+", "Men", "Mothers", "Parents", "Senior Citizens", "Women", "Fathers"],
  payment: ["Aetna", "BCBS", "Carelon", "Cigna", "CVAP", "EAP", "Government Plans", "Highmark", "Horizon", "Lotus Fund", "MVP", "Optum", "Oxford", "Private Pay", "Quest", "Sliding Scale", "Tricare", "UBH", "United Healthcare", "UPMC", "VA Insurance", "Superbills Available", "Towergate Insurance", "Other", "HSA"],
  location: ["All states", "Some services all states", "New Jersey", "Pennsylvania", "Other", "Virtual"],
  availability: ["Morning", "Afternoon", "Evening", "Weekend"],
  responseTime: ["Same Day", "Within 24 hrs", "1-2 Business Days", "3-5 Business Days", "Weekly"],
  referralMethod: ["Warm Intro", "Email", "Website Form", "Phone", "Text", "Consultation Link"],
  genderIdentity: ["Female", "Male", "Non-binary", "Transgender", "Agender", "Genderfluid", "Genderqueer", "Intersex", "Prefer not to say", "Other"],
  identity: ["Black / African Diaspora", "Indigenous / First Nations", "Latinx / Hispanic", "Asian / Asian American", "Middle Eastern / North African", "Pacific Islander", "White", "Multiracial", "Other", "Prefer not to say"],
  collaborationInterests: ["Business card swaps", "Client referral discounts", "Cohost workshops and events", "Collaborative care for shared clients", "Cross-promotion on social media", "Guest teaching / speaking", "Friendships and meetups", "Peer support", "Podcast and interview opportunities", "Provider discounts", "Other", "Referrals", "Peer Consultation", "Workshops"],
  vibe: ["Calm and grounding", "Creative and adaptive", "Direct and challenging", "Focused and structured", "Warm and nurturing"],
};

const HIDDEN_SERVICE_OPTIONS = ["Birth", "Postpartum & Lactation Support", "Workshops", "Courses & Retreats"];

const EMPTY_PROFILE = {
  id: "",
  listingType: "Individual Provider",
  name: "",
  pronouns: "",
  profession: "",
  license: "",
  genderIdentity: [],
  identity: [],
  email: "",
  phone: "",
  website: "",
  consultationLink: "",
  bio: "",
  photo: "",
  photoUrl: "",
  profilePhotoUpload: null,
  providerType: [],
  additionalProviderType: "",
  services: [],
  additionalServices: "",
  support: [],
  additionalConcerns: "",
  populations: [],
  additionalPopulations: "",
  payment: [],
  additionalPayTypes: "",
  location: [],
  additionalStates: "",
  availability: [],
  price: "",
  physicalLocations: "",
  availabilitySpecifics: "",
  responseTime: [],
  referralMethod: [],
  referralInstructions: "",
  collaborationInterests: [],
  otherCollaboration: "",
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
  vibe: [],
};

const EMPTY_OPTIONS = {
  providerType: [],
  services: [],
  support: [],
  populations: [],
  payment: [],
  location: [],
  availability: [],
  identity: [],
  genderIdentity: [],
  responseTime: [],
  referralMethod: [],
  collaborationInterests: [],
  vibe: [],
};

export default function EditProfilePage({ user, setNotice }) {
  const [form, setForm] = React.useState(() => ({ ...EMPTY_PROFILE, email: user?.email || "" }));
  const [initial, setInitial] = React.useState(() => ({ ...EMPTY_PROFILE, email: user?.email || "" }));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [options, setOptions] = React.useState(EMPTY_OPTIONS);

  React.useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);
    setStatus("");

    Promise.all([api("my-profile"), api("directory-options").catch(() => ({ directoryOptions: {} }))])
      .then(([payload, optionPayload]) => {
        if (!alive) return;
        const next = hydrateProfile(payload.profile, user);
        const incoming = optionPayload.directoryOptions || {};
        setOptions({
          providerType: incoming.providerType || [],
          services: withoutOptions(incoming.services || [], HIDDEN_SERVICE_OPTIONS),
          support: incoming.support || [],
          populations: incoming.populations || [],
          payment: incoming.payment || [],
          location: incoming.locations || [],
          availability: incoming.availability || [],
          identity: incoming.identity || [],
          genderIdentity: incoming.genderIdentity || [],
          responseTime: incoming.responseTime || [],
          referralMethod: incoming.referralMethod || [],
          collaborationInterests: incoming.collaborationInterests || [],
          vibe: incoming.vibe || [],
        });
        setForm(next);
        setInitial(next);
        setStatus("");
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
  }, [setNotice, user?.email]);

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

  const isGroupPractice = form.listingType === "Group Practice";

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
          <h2>{form.name || (isGroupPractice ? "Practice name" : "Your name")}</h2>
          <p>{form.profession || (isGroupPractice ? "Practice focus" : "Provider profession")}</p>
          <div className="preview-divider" />
          <span>{form.email || user?.email || "Email connected to this account"}</span>
        </aside>

        <form className="profile-editor" onSubmit={save}>
          <ProfileSection title="Profile basics" text="Main public profile information.">
            <div className="photo-editor">
              <ProfilePhoto form={form} />
              <div>
                <p className="eyebrow ink">Profile photo</p>
                <h3>Current profile photo</h3>
                <p>Upload a headshot or profile image. It will update the photo shown on your profile after saving.</p>
                <PhotoUpload value={form.profilePhotoUpload} onChange={(value) => update("profilePhotoUpload", value)} />
              </div>
            </div>

            <div className="profile-form-grid">
              <ListingTypeButtons value={form.listingType} onChange={(value) => update("listingType", value)} profile />
              <Field label={isGroupPractice ? "Practice name" : "Name"} value={form.name} onChange={(value) => update("name", value)} required />
              {isGroupPractice ? null : <Field label="Pronouns" value={form.pronouns} onChange={(value) => update("pronouns", value)} />}
              <Field label={isGroupPractice ? "Practice focus" : "Profession"} value={form.profession} onChange={(value) => update("profession", value)} required />
              <Field label="License / certification, if applicable" value={form.license} onChange={(value) => update("license", value)} />
              {isGroupPractice ? null : <MultiField label="Gender identity" value={form.genderIdentity} options={options.genderIdentity} onChange={(value) => update("genderIdentity", value)} fallback={FALLBACK_OPTIONS.genderIdentity} />}
              {isGroupPractice ? null : <MultiField label="Racial / ethnic identity" value={form.identity} options={options.identity} onChange={(value) => update("identity", value)} fallback={FALLBACK_OPTIONS.identity} />}
              <Field label="Email" value={form.email} readOnly />
              <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
              <Field label="Website" value={form.website} onChange={(value) => update("website", value)} />
              <Field label="Consultation link" value={form.consultationLink} onChange={(value) => update("consultationLink", value)} />
              <Field label={isGroupPractice ? "About the practice" : "Bio"} value={form.bio} onChange={(value) => update("bio", value)} textarea full required />
            </div>
          </ProfileSection>

          <ProfileSection title="Areas of care" text="Services, concerns, locations, availability, and payment.">
            <div className="profile-form-grid">
              <MultiField label="Provider type" value={form.providerType} options={options.providerType} onChange={(value) => update("providerType", value)} fallback={FALLBACK_OPTIONS.providerType} required />
              <Field label="Additional Provider Type" value={form.additionalProviderType} onChange={(value) => update("additionalProviderType", value)} />
              <MultiField label="Concerns / areas of support" value={form.support} options={options.support} onChange={(value) => update("support", value)} fallback={FALLBACK_OPTIONS.support} required />
              <Field label="Additional Concerns" value={form.additionalConcerns} onChange={(value) => update("additionalConcerns", value)} />
              <MultiField label="Services offered" value={form.services} options={options.services} onChange={(value) => update("services", value)} fallback={FALLBACK_OPTIONS.services} />
              <Field label="Additional Services" value={form.additionalServices} onChange={(value) => update("additionalServices", value)} />
              <MultiField label="People served" value={form.populations} options={options.populations} onChange={(value) => update("populations", value)} fallback={FALLBACK_OPTIONS.populations} />
              <Field label="Additional Populations" value={form.additionalPopulations} onChange={(value) => update("additionalPopulations", value)} />
              <MultiField label="Payment / insurance" value={form.payment} options={options.payment} onChange={(value) => update("payment", value)} fallback={FALLBACK_OPTIONS.payment} />
              <Field label="Additional Pay Types" value={form.additionalPayTypes} onChange={(value) => update("additionalPayTypes", value)} />
              <MultiField label="State" value={form.location} options={options.location} onChange={(value) => update("location", value)} fallback={FALLBACK_OPTIONS.location} />
              <Field label="Additional States" value={form.additionalStates} onChange={(value) => update("additionalStates", value)} />
              <MultiField label="General Availability" value={form.availability} options={options.availability} onChange={(value) => update("availability", value)} fallback={FALLBACK_OPTIONS.availability} />
              <Field label="Availability Specifics" value={form.availabilitySpecifics} onChange={(value) => update("availabilitySpecifics", value)} textarea full />
              <Field label="Price" value={form.price} onChange={(value) => update("price", value)} />
              <Field label="Physical locations" value={form.physicalLocations} onChange={(value) => update("physicalLocations", value)} full />
            </div>
          </ProfileSection>

          <ProfileSection title="Provider intel" text="Referral and collaboration details for aligned providers.">
            <div className="profile-form-grid">
              <MultiField label="Typical response time" value={form.responseTime} options={options.responseTime} onChange={(value) => update("responseTime", value)} fallback={FALLBACK_OPTIONS.responseTime} />
              <MultiField label="Preferred referral method" value={form.referralMethod} options={options.referralMethod} onChange={(value) => update("referralMethod", value)} fallback={FALLBACK_OPTIONS.referralMethod} />
              <Field label="Referral instructions" value={form.referralInstructions} onChange={(value) => update("referralInstructions", value)} textarea full />
              <MultiField label="Collaboration interests" value={form.collaborationInterests} options={options.collaborationInterests} onChange={(value) => update("collaborationInterests", value)} fallback={FALLBACK_OPTIONS.collaborationInterests} full />
              <Field label="Other Collaboration" value={form.otherCollaboration} onChange={(value) => update("otherCollaboration", value)} />
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
              <MultiField label="Vibe" value={form.vibe} options={options.vibe} onChange={(value) => update("vibe", value)} fallback={FALLBACK_OPTIONS.vibe} />
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
  const photo = form.profilePhotoUpload?.dataUrl || form.photoUrl || form.photo;
  return (
    <div className="profile-photo">
      {photo ? <img src={photo} alt="" /> : <span>{label}</span>}
    </div>
  );
}

function PhotoUpload({ value, onChange }) {
  const [error, setError] = React.useState("");

  async function handleFile(event) {
    const file = event.target.files?.[0];
    setError("");
    if (!file) {
      onChange(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose an image under 10MB.");
      return;
    }
    try {
      onChange(await prepareImageUpload(file));
    } catch (error) {
      setError(error.message || "Photo could not be read.");
    }
  }

  return (
    <label className="profile-photo-upload">
      <span>Upload photo</span>
      <input type="file" accept="image/*" onChange={handleFile} />
      <small>{value?.name ? `Selected: ${value.name}` : "JPG, PNG, or WebP. Large photos will be resized before saving."}</small>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

function Field({ label, value, onChange, textarea, full, helper, required, readOnly, placeholder }) {
  return (
    <label className={full ? "profile-field full" : "profile-field"}>
      <span>{label}{required ? " *" : ""}</span>
      {textarea ? (
        <textarea value={value || ""} onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly} rows={6} placeholder={placeholder} />
      ) : (
        <input value={value || ""} onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly} placeholder={placeholder} />
      )}
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

function MultiField({ label, value, options, onChange, fallback, full, required }) {
  const [open, setOpen] = React.useState(false);
  const selected = toList(value);
  const choices = unique([...(options || []), ...toList(fallback), ...selected]);

  function toggle(valueToToggle) {
    const next = selected.includes(valueToToggle)
      ? selected.filter((item) => item !== valueToToggle)
      : [...selected, valueToToggle];
    onChange(next);
  }

  return (
    <div className={full ? "profile-field profile-multi-field full" : "profile-field profile-multi-field"}>
      <span>{label}{required ? " *" : ""}</span>
      <button type="button" className={open ? "profile-multi-trigger open" : "profile-multi-trigger"} onClick={() => setOpen((current) => !current)}>
        <strong>{selected.length ? `${selected.length} selected` : "Choose one or more"}</strong>
        <ChevronDown size={16} />
      </button>
      {selected.length ? <div className="profile-selected-pills">{selected.map((item) => <button type="button" key={item} onClick={() => toggle(item)}>{item}<X size={12} /></button>)}</div> : null}
      {open ? <div className="profile-multi-menu">
        {choices.map((choice) => <button type="button" key={choice} className={selected.includes(choice) ? "selected" : ""} onClick={() => toggle(choice)}><span>{selected.includes(choice) ? <Check size={13} /> : null}</span>{choice}</button>)}
      </div> : null}
    </div>
  );
}

function ListingTypeButtons({ value, onChange, profile }) {
  const options = ["Individual Provider", "Group Practice"];
  return <div className={profile ? "profile-field profile-listing-type full" : "provider-field provider-listing-type provider-full"}>
    <span>Listing Type *</span>
    <div>
      {options.map((option) => <button
        key={option}
        type="button"
        className={value === option ? "selected" : ""}
        onClick={() => onChange(option)}
      >
        {option}
      </button>)}
    </div>
  </div>;
}

function hydrateProfile(profile = {}, user) {
  return {
    ...EMPTY_PROFILE,
    ...profile,
    listingType: profile.listingType || "Individual Provider",
    email: profile.email || user?.email || "",
    photoUrl: profile.photo || "",
    profilePhotoUpload: null,
    genderIdentity: toList(profile.genderIdentity),
    identity: toList(profile.identity),
    providerType: toList(profile.providerType),
    additionalProviderType: profile.additionalProviderType || "",
    services: withoutOptions(toList(profile.services), HIDDEN_SERVICE_OPTIONS),
    additionalServices: profile.additionalServices || "",
    support: toList(profile.support),
    additionalConcerns: profile.additionalConcerns || "",
    populations: toList(profile.populations),
    additionalPopulations: profile.additionalPopulations || "",
    payment: toList(profile.payment),
    additionalPayTypes: profile.additionalPayTypes || "",
    location: toList(profile.location),
    additionalStates: profile.additionalStates || "",
    availability: toList(profile.availability),
    collaborationInterests: toList(profile.collaborationInterests),
    otherCollaboration: profile.otherCollaboration || "",
    vibe: toList(profile.vibe),
    infoOptIn: profile.infoOptIn === true || profile.infoOptIn === "Yes",
  };
}

function serializeProfile(form) {
  return {
    ...form,
    photoUrl: form.photoUrl,
    profilePhotoUpload: form.profilePhotoUpload,
    genderIdentity: toList(form.genderIdentity),
    identity: toList(form.identity),
    providerType: toList(form.providerType),
    services: withoutOptions(toList(form.services), HIDDEN_SERVICE_OPTIONS),
    support: toList(form.support),
    populations: toList(form.populations),
    payment: toList(form.payment),
    location: toList(form.location),
    availability: toList(form.availability),
    collaborationInterests: toList(form.collaborationInterests),
    vibe: toList(form.vibe),
  };
}

async function prepareImageUpload(file) {
  const original = await fileToDataUrl(file);
  if (file.type === "image/gif") return { name: file.name, type: file.type, size: file.size, dataUrl: original };
  const image = await loadImage(original);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  if (scale === 1 && file.size <= 3.5 * 1024 * 1024) return { name: file.name, type: file.type, size: file.size, dataUrl: original };
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return { name: file.name.replace(/\.[^.]+$/, ".jpg"), type: "image/jpeg", size: Math.round((dataUrl.length * 3) / 4), dataUrl };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo could not be resized."));
    image.src = src;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function toText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return value == null ? "" : String(value);
}

function toList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set((values || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function withoutOptions(values, hidden) {
  const hiddenSet = new Set((hidden || []).map((value) => String(value).trim().toLowerCase()));
  return (values || []).filter((value) => !hiddenSet.has(String(value).trim().toLowerCase()));
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
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Supabase-Access-Token"] = token;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);

  return payload;
}
