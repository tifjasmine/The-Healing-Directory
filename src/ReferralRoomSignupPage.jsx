import React from "react";

const APP_API = "/.netlify/functions/app-api";
const FUTURE_DATE_VALUE = "future-not-listed";

const CIRCLE_THEMES = [
  "Women's Wellness",
  "Anxiety + Stress",
  "ADHD + Executive Functioning",
  "Depression + Mood Support",
  "Postpartum + Parenting",
  "Pregnancy + Birth Support",
  "Trauma-Informed Care",
  "Body-Based / Somatic Healing",
  "Couples + Relationships",
  "Teens + Young Adults",
  "Burnout + Work Stress",
  "Chronic Pain / Illness",
  "Eating + Body Image",
  "Grief + Loss",
  "LGBTQIA+ Affirming Care",
  "Neurodivergent-Affirming Care",
  "Highly Sensitive People",
  "Supporting Men",
  "Family Support",
  "Other",
];

const PROVIDER_TYPES = [
  "Therapists / Counselors",
  "Psychologists",
  "Psychiatrists / Medication Providers",
  "Primary Care Providers",
  "OB/GYNs",
  "Pediatric Providers",
  "Pelvic Floor Therapists",
  "Physical Therapists",
  "Occupational Therapists",
  "Lactation Consultants",
  "Doulas / Birth Workers",
  "Chiropractors",
  "Massage Therapists",
  "Acupuncturists",
  "Somatic Practitioners",
  "Yoga / Movement Providers",
  "Nutritionists / Dietitians",
  "Coaches",
  "Couples / Relationship Providers",
  "Other",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["Morning", "Early Afternoon", "Late Afternoon", "Evening"];

const EMPTY = {
  name: "",
  email: "",
  practiceName: "",
  phone: "",
  website: "",
  social: "",
  title: "",
  specialties: "",
  state: "",
  city: "",
  acceptingClients: "",
  insurance: "",
  selectedDates: [],
  circleThemes: [],
  providerTypes: [],
  days: [],
  times: [],
  notes: "",
};

export default function ReferralRoomSignupPage() {
  const [form, setForm] = React.useState(EMPTY);
  const [sessions, setSessions] = React.useState([]);
  const [options, setOptions] = React.useState({ circleThemes: CIRCLE_THEMES, providerTypes: PROVIDER_TYPES, days: DAYS, times: TIMES });
  const [notice, setNotice] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    api("referral-room-public-options")
      .then((payload) => {
        setSessions(payload.sessions || []);
        setOptions({
          circleThemes: payload.circleThemes?.length ? payload.circleThemes : CIRCLE_THEMES,
          providerTypes: withOther(payload.providerTypes?.length ? payload.providerTypes : PROVIDER_TYPES),
          days: payload.days?.length ? payload.days : DAYS,
          times: payload.times?.length ? payload.times : TIMES,
        });
      })
      .catch(() => {
        setSessions([]);
        setOptions({ circleThemes: CIRCLE_THEMES, providerTypes: PROVIDER_TYPES, days: DAYS, times: TIMES });
      });
  }, []);

  const change = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };
  const toggle = (key, value) => setForm((current) => ({ ...current, [key]: toggleValue(current[key], value) }));

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const firstKey = Object.keys(errors)[0];
      setNotice(errors[firstKey]);
      document.querySelector(`[data-field="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      await api("referral-room-interest", { method: "POST", body: { ...form, website: normalizeWebsite(form.website) } });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(error.message || "Your interest form could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="referral-interest-page">
    <header className="referral-interest-nav">
      <a className="referral-interest-brand" href="/">
        <LotusLogo />
        <span><strong>The Healing Directory</strong><small>Relationship-based care</small></span>
      </a>
      <a href="/login">Already a member? Sign in</a>
    </header>

    <section className="referral-interest-hero">
      <div>
        <h1>Join The Referral Room</h1>
        <h2>Small, curated circles where aligned providers meet, share how they work, and build the kind of referral relationships that actually serve clients well.</h2>
      </div>
    </section>

    <section className="referral-interest-strip">
      <InfoItem icon="🌿" title="Theme-based circles" text="Each circle centers a care theme - anxiety, postpartum, somatic healing, and more." />
      <InfoItem icon="🤝" title="5-8 providers per room" text="Small by design - so everyone has room to actually connect, not just network." />
      <InfoItem icon="✓" title="Path to verification" text="Attending and participating may help your profile become Verified in The Healing Directory." />
    </section>

    {submitted ? <SuccessState /> : <main className="referral-interest-main">
      <aside className="referral-interest-nonmember-note">
        <strong>Just want to connect without becoming a member?</strong>
        <p>No problem. You do not need to join The Healing Directory to network with other providers in The Referral Room.</p>
      </aside>
      <form className="referral-interest-form" onSubmit={submit}>
        <SectionTitle>About you</SectionTitle>
        <div className="referral-interest-grid two">
          <Field fieldKey="name" error={fieldErrors.name} label="Full name" required value={form.name} onChange={change("name")} placeholder="Your full name" />
          <Field fieldKey="email" error={fieldErrors.email} label="Email address" required type="email" value={form.email} onChange={change("email")} placeholder="you@practice.com" />
        </div>
        <div className="referral-interest-grid two">
          <Field fieldKey="practiceName" error={fieldErrors.practiceName} label="Practice or business name" required value={form.practiceName} onChange={change("practiceName")} placeholder="Your practice name" />
          <Field label="Phone number" type="tel" value={form.phone} onChange={change("phone")} placeholder="(optional)" />
        </div>
        <div className="referral-interest-grid two">
          <Field fieldKey="website" error={fieldErrors.website} label="Website" required type="text" inputMode="url" value={form.website} onChange={change("website")} placeholder="www.yourpractice.com" />
          <Field label="Social media" value={form.social} onChange={change("social")} placeholder="Instagram, LinkedIn, etc. (optional)" />
        </div>
        <Field fieldKey="title" error={fieldErrors.title} label="Your professional title or role" required value={form.title} onChange={change("title")} placeholder="e.g. Licensed Therapist, Registered Dietitian, Somatic Practitioner, Doula..." />

        <SectionTitle>Your practice</SectionTitle>
        <Field label="Primary areas of specialization or expertise" value={form.specialties} onChange={change("specialties")} placeholder="e.g. Women's health, ADHD, grief, trauma, relationships..." />
        <div className="referral-interest-grid two">
          <SelectField fieldKey="state" error={fieldErrors.state} label="State you primarily serve clients" required value={form.state} onChange={change("state")} options={["New Jersey", "Pennsylvania", "Virtual / both"]} />
          <Field label="City you primarily serve clients" value={form.city} onChange={change("city")} placeholder="e.g. Princeton, Philadelphia..." />
        </div>
        <div className="referral-interest-grid two">
          <SelectField label="Are you currently accepting new clients?" value={form.acceptingClients} onChange={change("acceptingClients")} options={["Yes", "Limited availability", "Waitlist only", "Depends on the service", "No"]} />
          <Field label="Do you accept insurance?" value={form.insurance} onChange={change("insurance")} placeholder="If yes, which kinds?" />
        </div>

        <SectionTitle>Circle interest</SectionTitle>
        <OptionGroup label="Which upcoming Referral Room dates interest you?" helper="Select all that apply." values={form.selectedDates} options={[...sessions.map((session) => ({ label: session.label, value: session.id })), { label: "Future dates not listed yet", value: FUTURE_DATE_VALUE }]} onToggle={(value) => toggle("selectedDates", value)} />
        <OptionGroup label="Which theme-based circles interest you?" helper="Select all that apply." values={form.circleThemes} options={options.circleThemes.map((label) => ({ label, value: label }))} onToggle={(value) => toggle("circleThemes", value)} />
        <OptionGroup label="What kinds of providers would you love to connect with?" helper="Select all that apply." values={form.providerTypes} options={options.providerTypes.map((label) => ({ label, value: label }))} onToggle={(value) => toggle("providerTypes", value)} />

        <SectionTitle>Availability</SectionTitle>
        <div className="referral-interest-grid two">
          <ToggleGroup label="Days that work best" values={form.days} options={options.days} onToggle={(value) => toggle("days", value)} />
          <ToggleGroup label="Time of day that works best" values={form.times} options={options.times} onToggle={(value) => toggle("times", value)} />
        </div>
        <Field label="Anything else you'd like us to know?" textarea value={form.notes} onChange={change("notes")} placeholder="Share anything about your interest, availability, practice, or the kinds of connections you're hoping to make..." />

        {notice ? <p className="referral-interest-error">{notice}</p> : null}
        <button className="referral-interest-submit" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit my interest"}</button>
        <p className="referral-interest-note">We will get back to you within 24 hours with next steps.</p>
      </form>
    </main>}
  </div>;
}

function SectionTitle({ children }) {
  return <h3 className="referral-interest-section-title">{children}</h3>;
}

function Field({ fieldKey, error, label, required, textarea, ...props }) {
  return <label className={`referral-interest-field${error ? " has-error" : ""}`} data-field={fieldKey || undefined}><span>{label}{required ? <b> *</b> : null}</span>{textarea ? <textarea rows={5} aria-invalid={error ? "true" : undefined} {...props} /> : <input aria-invalid={error ? "true" : undefined} {...props} />}{error ? <em>{error}</em> : null}</label>;
}

function SelectField({ fieldKey, error, label, required, options, ...props }) {
  return <label className={`referral-interest-field${error ? " has-error" : ""}`} data-field={fieldKey || undefined}><span>{label}{required ? <b> *</b> : null}</span><select aria-invalid={error ? "true" : undefined} {...props}><option value="">Select...</option>{options.map((option) => <option key={option}>{option}</option>)}</select>{error ? <em>{error}</em> : null}</label>;
}

function OptionGroup({ label, helper, values, options, onToggle }) {
  const selected = Array.isArray(values) ? values : [];
  return <section className="referral-interest-options"><h4>{label} {helper ? <small>{helper}</small> : null}</h4><div>{options.map((option) => {
    const active = selected.includes(option.value);
    return <button type="button" key={option.value} className={active ? "active" : ""} onClick={() => onToggle(option.value)}><span>{active ? "✓" : ""}</span>{option.label}</button>;
  })}</div></section>;
}

function ToggleGroup({ label, values, options, onToggle }) {
  const selected = Array.isArray(values) ? values : [];
  return <section className="referral-interest-toggle-group"><h4>{label}</h4><div>{options.map((option) => <button type="button" key={option} className={selected.includes(option) ? "active" : ""} onClick={() => onToggle(option)}>{option}</button>)}</div></section>;
}

function InfoItem({ icon, title, text }) {
  return <article><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></article>;
}

function SuccessState() {
  return <main className="referral-interest-success">
    <span>✓</span>
    <h2>You're on the list</h2>
    <p>Thank you for your interest. We'll review your response and reach out with next steps, dates, and circle details within 24 hours.</p>
    <a href="/">Back to The Healing Directory</a>
  </main>;
}

function LotusLogo() {
  return <svg viewBox="0 0 60 60" aria-hidden="true">
    <path d="M30 8C30 8 22 16 22 26c0 6 4 10 8 12 4-2 8-6 8-12C38 16 30 8 30 8Z" fill="#3C7A57" opacity=".9" />
    <path d="M16 18c0 0-4 10 0 18 2 4 6 6 10 6-2-4-3-9-2-14C20 26 17 22 16 18Z" fill="#BB6A40" opacity=".85" />
    <path d="M44 18c0 0 4 10 0 18-2 4-6 6-10 6 2-4 3-9 2-14C40 26 43 22 44 18Z" fill="#BB6A40" opacity=".85" />
    <path d="M10 30c0 0 0 10 6 16 4 4 10 4 14 3-4-3-8-7-8-13C18 36 13 34 10 30Z" fill="#D4A853" opacity=".8" />
    <path d="M50 30c0 0 0 10-6 16-4 4-10 4-14 3 4-3 8-7 8-13C42 36 47 34 50 30Z" fill="#D4A853" opacity=".8" />
  </svg>;
}

function toggleValue(values, value) {
  const list = Array.isArray(values) ? values : [];
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validWebsite(value) {
  const next = normalizeWebsite(value);
  try {
    const url = new URL(next);
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

function normalizeWebsite(value) {
  const next = String(value || "").trim();
  if (!next) return "";
  return /^https?:\/\//i.test(next) ? next : `https://${next}`;
}

function validateForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Please enter your full name.";
  if (!validEmail(form.email)) errors.email = "Please enter a valid email address.";
  if (!form.practiceName.trim()) errors.practiceName = "Please enter your practice or business name.";
  if (!validWebsite(form.website)) errors.website = "Please enter a valid website, like www.yourpractice.com.";
  if (!form.title.trim()) errors.title = "Please enter your professional title or role.";
  if (!form.state.trim()) errors.state = "Please select the state you primarily serve.";
  return errors;
}

function withOther(options) {
  const list = Array.isArray(options) ? options : [];
  return list.some((item) => String(item).toLowerCase() === "other") ? list : [...list, "Other"];
}

async function api(action, options = {}) {
  const url = new URL(APP_API, window.location.origin);
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
