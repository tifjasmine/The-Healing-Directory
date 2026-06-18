import React from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Heart,
  HeartHandshake,
  Loader,
  Mail,
  Send,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

const APP_API = "/.netlify/functions/app-api";
const ADMIN_EMAIL = "admin@thehealingdirectory.com";

const FALLBACK_OPTIONS = {
  providerType: ["Therapist", "Coach", "Bodyworker", "Energy Worker", "Holistic Health", "Consultant", "Other"],
  support: ["Anxiety", "Trauma", "Grief", "Relationships", "Identity", "Life Transitions", "Stress", "Spirituality", "Other"],
  services: ["Individual Sessions", "Groups", "Workshops", "Consultation", "Training", "Retreats", "Other"],
  populations: ["Adults", "Teens", "Couples", "Families", "Providers", "LGBTQIA+", "BIPOC", "Other"],
  payment: ["Private Pay", "Sliding Scale", "Insurance", "Out of Network", "Free Consultation", "Other"],
  locations: ["Virtual", "Pennsylvania", "New Jersey", "New York", "Delaware", "Other"],
  availability: ["Accepting New Clients", "Waitlist", "Weekdays", "Evenings", "Weekends", "Virtual", "In Person"],
  responseTime: ["Within 24 hours", "1-2 business days", "Within a week", "Varies", "Other"],
  referralMethod: ["Email introduction", "Consultation link", "Phone call", "Provider form", "Client reaches out directly", "Other"],
  genderIdentity: ["Female", "Male", "Non-binary", "Transgender", "Agender", "Genderfluid", "Genderqueer", "Intersex", "Prefer not to say", "Other"],
  racialEthnicIdentity: ["Black / African Diaspora", "Indigenous / First Nations", "Latinx / Hispanic", "Asian / Asian American", "Middle Eastern / North African", "Pacific Islander", "White", "Multiracial", "Other", "Prefer not to say"],
  heardAboutUs: ["Provider referral", "Client referral", "Instagram", "Facebook", "Google search", "Event", "Referral Room", "Newsletter"],
  collaborationInterests: ["Referrals", "Workshops", "Peer Consultation", "Speaking", "Community Events", "Provider Discounts", "Other"],
  vibe: ["Warm", "Grounding", "Direct", "Creative", "Spiritual", "Clinical", "Collaborative", "Other"],
};

const STEPS = [
  { id: "basics", label: "The basics", icon: User },
  { id: "care", label: "Areas of care", icon: Briefcase },
  { id: "referral", label: "Referral intel", icon: Heart },
  { id: "collab", label: "Collaboration", icon: HeartHandshake },
  { id: "human", label: "The human side", icon: Sparkles },
  { id: "consent", label: "Consent", icon: ClipboardCheck },
];

const EMPTY = {
  name: "",
  pronouns: "",
  profession: "",
  licenseCertification: "",
  profilePhotoUpload: null,
  genderIdentity: [],
  racialEthnicIdentity: [],
  bio: "",
  email: "",
  phone: "",
  website: "",
  consultationLink: "",
  providerType: [],
  additionalProviderType: "",
  concerns: [],
  additionalConcerns: "",
  servicesOffered: [],
  additionalServices: "",
  populationsServed: [],
  additionalPopulations: "",
  payType: [],
  additionalPayTypes: "",
  state: [],
  additionalStates: "",
  availability: [],
  price: "",
  physicalLocations: "",
  availabilitySpecifics: "",
  typicalResponseTime: [],
  preferredReferralMethod: [],
  referralInstructions: "",
  collaborationInterests: [],
  otherCollaboration: "",
  collaborationDetails: "",
  providerToProviderNotes: "",
  styleWords: "",
  clientsDescribeMeAs: "",
  groundingRitual: "",
  outsideSessions: "",
  guidingBelief: "",
  healingTruth: "",
  favoriteComfortPractice: "",
  funFact: "",
  vibe: [],
  consentDirectory: false,
  consentCommunity: false,
  infoOptIn: false,
  signature: "",
  heardAboutUs: [],
};

export default function ProviderSignupPage() {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState(EMPTY);
  const [options, setOptions] = React.useState(FALLBACK_OPTIONS);
  const [notice, setNotice] = React.useState("");
  const [syncWarning, setSyncWarning] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    api("directory-options")
      .then((payload) => {
        if (!active) return;
        const incoming = payload.directoryOptions || {};
        setOptions({
          providerType: choose(incoming.providerType, FALLBACK_OPTIONS.providerType),
          support: choose(incoming.support, FALLBACK_OPTIONS.support),
          services: choose(incoming.services, FALLBACK_OPTIONS.services),
          populations: choose(incoming.populations, FALLBACK_OPTIONS.populations),
          payment: choose(incoming.payment, FALLBACK_OPTIONS.payment),
          locations: choose(incoming.locations, FALLBACK_OPTIONS.locations),
          availability: choose(incoming.availability, FALLBACK_OPTIONS.availability),
          responseTime: choose(incoming.responseTime, FALLBACK_OPTIONS.responseTime),
          referralMethod: choose(incoming.referralMethod, FALLBACK_OPTIONS.referralMethod),
          genderIdentity: mergeOptions(incoming.genderIdentity, FALLBACK_OPTIONS.genderIdentity),
          racialEthnicIdentity: mergeOptions(incoming.identity, FALLBACK_OPTIONS.racialEthnicIdentity),
          heardAboutUs: choose(incoming.heardAboutUs, FALLBACK_OPTIONS.heardAboutUs),
          collaborationInterests: choose(incoming.collaborationInterests, FALLBACK_OPTIONS.collaborationInterests),
          vibe: choose(incoming.vibe, FALLBACK_OPTIONS.vibe),
        });
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key, value) => setForm((current) => ({ ...current, [key]: toggleValue(current[key], value) }));
  const addOther = (key) => (value) => setForm((current) => ({ ...current, [key]: appendText(current[key], value) }));
  const valid = stepIsValid(step, form);

  async function submit(event) {
    event.preventDefault();
    if (!valid) {
      setNotice("Please complete the required fields before submitting.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await api("signup-profile", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          accountType: "provider",
          phone: form.phone,
          website: form.website,
          professionalTitle: form.profession,
          message: form.bio,
          areaInterest: form.providerType,
          application: form,
        },
      });
      if (result.supabaseSync && result.supabaseSync.synced === false) setSyncWarning("");
      setSubmitted(true);
    } catch (error) {
      setNotice(error.message || "Your application could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return <PendingApprovalPage warning={syncWarning} />;

  return <div className="provider-join-page">
    <ProviderSignupNav />
    <header className="provider-join-hero">
      <div className="provider-join-inner">
        <p className="provider-join-kicker">The Healing Directory</p>
        <h1>Join the network</h1>
        <p>Share your profile with colleagues for referrals and with clients so they can find and connect with you.</p>
        <div className="provider-join-steps">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return <button
              key={item.id}
              type="button"
              className={index === step ? "active" : index < step ? "done" : ""}
              onClick={() => setStep(index)}
            >
              <span>{index < step ? <CheckCircle2 size={14} /> : <Icon size={14} />}</span>{item.label}
            </button>;
          })}
        </div>
      </div>
    </header>

    <main className="provider-join-shell">
      <form className="provider-join-card" onSubmit={submit}>
        {step === 0 ? <Basics form={form} change={change} setValue={setValue} toggle={toggle} options={options} /> : null}
        {step === 1 ? <Care form={form} change={change} toggle={toggle} addOther={addOther} options={options} /> : null}
        {step === 2 ? <Referral form={form} change={change} toggle={toggle} options={options} /> : null}
        {step === 3 ? <Collaboration form={form} change={change} toggle={toggle} addOther={addOther} options={options} /> : null}
        {step === 4 ? <Human form={form} change={change} toggle={toggle} options={options} /> : null}
        {step === 5 ? <Consent form={form} change={change} setValue={setValue} /> : null}

        {notice ? <div className="provider-join-error"><AlertCircle size={16} />{notice}</div> : null}

        <div className="provider-join-nav">
          {step > 0 ? <button type="button" className="provider-back" onClick={() => { setNotice(""); setStep((current) => current - 1); }}><ArrowLeft size={15} /> Back</button> : <span />}
          {step < STEPS.length - 1 ? <button type="button" className="provider-next" disabled={!valid} onClick={() => { setNotice(""); setStep((current) => current + 1); }}>Continue <ArrowRight size={15} /></button> : <button className="provider-submit" disabled={busy || !valid}>{busy ? <Loader className="spin" size={15} /> : <Send size={15} />}{busy ? "Submitting" : "Submit application"}</button>}
        </div>
      </form>
      <div className="provider-progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
    </main>
  </div>;
}

function Basics({ form, change, setValue, toggle, options }) {
  return <Section title="The basics" text="Start with who you are and how people can reach you, colleagues and clients alike.">
    <Row><TextField label="Full name" value={form.name} onChange={change("name")} required placeholder="Dr. Jane Smith" /><TextField label="Pronouns" value={form.pronouns} onChange={change("pronouns")} placeholder="she/her, they/them..." /></Row>
    <Row><TextField label="Profession / title" value={form.profession} onChange={change("profession")} required placeholder="Licensed Therapist, Holistic Health Coach..." /><TextField label="License # / certification" value={form.licenseCertification} onChange={change("licenseCertification")} placeholder="LPC #000000, RYT-500..." /></Row>
    <Row><MultiSelect label="Gender Identity" values={form.genderIdentity} options={options.genderIdentity} onToggle={(value) => toggle("genderIdentity", value)} allowCustom={false} /><MultiSelect label="Racial / Ethnic Identity" values={form.racialEthnicIdentity} options={options.racialEthnicIdentity} onToggle={(value) => toggle("racialEthnicIdentity", value)} allowCustom={false} /></Row>
    <PhotoUpload value={form.profilePhotoUpload} onChange={(value) => setValue("profilePhotoUpload", value)} />
    <TextField label="Bio" value={form.bio} onChange={change("bio")} textarea placeholder="Let everyone get to know you and your practice." />
    <Row><TextField label="Email" type="email" value={form.email} onChange={change("email")} required placeholder="you@practice.com" /><TextField label="Phone" value={form.phone} onChange={change("phone")} placeholder="(555) 000-0000" /></Row>
    <Row><TextField label="Website" value={form.website} onChange={change("website")} placeholder="yourwebsite.com" /><TextField label="Consultation / booking link" value={form.consultationLink} onChange={change("consultationLink")} placeholder="calendly.com/..." /></Row>
    <MultiSelect label="How'd you hear about us?" values={form.heardAboutUs} options={options.heardAboutUs} onToggle={(value) => toggle("heardAboutUs", value)} allowCustom={false} />
  </Section>;
}

function Care({ form, change, toggle, addOther, options }) {
  return <Section title="Areas of care" text="Services, concerns, locations, availability, and payment.">
    <Row><MultiSelect label="Provider Type" values={form.providerType} options={options.providerType} onToggle={(value) => toggle("providerType", value)} onAddCustom={addOther("additionalProviderType")} customValue={form.additionalProviderType} customLabel="Additional Provider Type" required /><MultiSelect label="Concerns / areas of support" values={form.concerns} options={options.support} onToggle={(value) => toggle("concerns", value)} onAddCustom={addOther("additionalConcerns")} customValue={form.additionalConcerns} customLabel="Additional Concerns" required /></Row>
    <Row><MultiSelect label="Services offered" values={form.servicesOffered} options={options.services} onToggle={(value) => toggle("servicesOffered", value)} onAddCustom={addOther("additionalServices")} customValue={form.additionalServices} customLabel="Additional Services" required /><MultiSelect label="People served" values={form.populationsServed} options={options.populations} onToggle={(value) => toggle("populationsServed", value)} onAddCustom={addOther("additionalPopulations")} customValue={form.additionalPopulations} customLabel="Additional Populations" required /></Row>
    <Row><MultiSelect label="Payment / insurance" values={form.payType} options={options.payment} onToggle={(value) => toggle("payType", value)} onAddCustom={addOther("additionalPayTypes")} customValue={form.additionalPayTypes} customLabel="Additional Pay Types" required /><MultiSelect label="State" values={form.state} options={options.locations} onToggle={(value) => toggle("state", value)} onAddCustom={addOther("additionalStates")} customValue={form.additionalStates} customLabel="Additional States" required /></Row>
    <Row><MultiSelect label="Availability" values={form.availability} options={options.availability} onToggle={(value) => toggle("availability", value)} allowCustom={false} required /><TextField label="Price" value={form.price} onChange={change("price")} required placeholder="$125/session, sliding scale, varies..." /></Row>
    <TextField label="Physical locations" value={form.physicalLocations} onChange={change("physicalLocations")} required placeholder="Philadelphia, South Jersey, virtual only..." />
    <TextField label="Current availability" value={form.availabilitySpecifics} onChange={change("availabilitySpecifics")} textarea required placeholder="Currently accepting new clients, weekday mornings, evenings, etc." />
  </Section>;
}

function Referral({ form, change, toggle, options }) {
  return <Section title="Referral intel" text="Provider-only referral information.">
    <Row><MultiSelect label="Typical response time" values={form.typicalResponseTime} options={options.responseTime} onToggle={(value) => toggle("typicalResponseTime", value)} /><MultiSelect label="Preferred referral method" values={form.preferredReferralMethod} options={options.referralMethod} onToggle={(value) => toggle("preferredReferralMethod", value)} /></Row>
    <TextField label="Referral instructions" value={form.referralInstructions} onChange={change("referralInstructions")} textarea placeholder="What should another provider include when referring to you?" />
  </Section>;
}

function Collaboration({ form, change, toggle, addOther, options }) {
  return <Section title="Collaboration" text="Provider-to-provider collaboration details.">
    <MultiSelect label="Collaboration interests" values={form.collaborationInterests} options={options.collaborationInterests} onToggle={(value) => toggle("collaborationInterests", value)} onAddCustom={addOther("otherCollaboration")} customValue={form.otherCollaboration} customLabel="Other Collaboration" />
    <TextField label="Collaboration details" value={form.collaborationDetails} onChange={change("collaborationDetails")} textarea placeholder="Workshops, referral relationships, provider discounts, consultation preferences, boundaries..." />
    <TextField label="Additional info" value={form.providerToProviderNotes} onChange={change("providerToProviderNotes")} textarea placeholder="Anything aligned providers should know before referring, collaborating, or reaching out." />
  </Section>;
}

function Human({ form, change, toggle, options }) {
  return <Section title="The human side" text="Warm details to make the profile feel personal.">
    <Row><TextField label="My style in three words" value={form.styleWords} onChange={change("styleWords")} placeholder="Warm, direct, grounding..." /><TextField label="Clients describe me as" value={form.clientsDescribeMeAs} onChange={change("clientsDescribeMeAs")} placeholder="Compassionate, honest, calming..." /></Row>
    <Row><TextField label="My grounding ritual" value={form.groundingRitual} onChange={change("groundingRitual")} placeholder="A walk, hand on heart, tea..." /><TextField label="Outside sessions" value={form.outsideSessions} onChange={change("outsideSessions")} placeholder="Family, movement, creativity..." /></Row>
    <TextField label="Guiding belief" value={form.guidingBelief} onChange={change("guidingBelief")} placeholder="Healing happens when..." />
    <TextField label="What I wish people knew about healing" value={form.healingTruth} onChange={change("healingTruth")} textarea />
    <Row><TextField label="Favorite comfort practice" value={form.favoriteComfortPractice} onChange={change("favoriteComfortPractice")} placeholder="Legs up the wall, journaling..." /><TextField label="Fun fact" value={form.funFact} onChange={change("funFact")} placeholder="Something personal and warm..." /></Row>
    <MultiSelect label="Vibe" values={form.vibe} options={options.vibe} onToggle={(value) => toggle("vibe", value)} allowCustom={false} />
  </Section>;
}

function Consent({ form, change, setValue }) {
  return <Section title="Consent + agreement" text="Required confirmations.">
    <ConsentCheck checked={form.consentDirectory} onChange={(value) => setValue("consentDirectory", value)} title="I consent to being listed in The Healing Directory and confirm that I am who I say I am." text="This includes permission to display my approved provider profile." required />
    <ConsentCheck checked={form.consentCommunity} onChange={(value) => setValue("consentCommunity", value)} title="I agree to be an intentional, compassionate, respectful, and aligned provider within The Healing Directory community." text="This community is built around trust, care, integrity, collaboration, and respect." required />
    <ConsentCheck checked={form.infoOptIn} onChange={(value) => setValue("infoOptIn", value)} title="I would like to receive provider updates from The Healing Directory." text="Examples may include new providers, workshops, referral room updates, collaboration opportunities, and directory announcements." />
    <TextField label="Signature" value={form.signature} onChange={change("signature")} required placeholder="Type your full name" />
  </Section>;
}

function PendingApprovalPage({ warning }) {
  return <div className="provider-join-page">
    <ProviderSignupNav />
    <header className="provider-join-hero">
      <div className="provider-join-inner provider-pending-hero">
        <p className="provider-join-kicker">The Healing Directory</p>
        <h1>Application received</h1>
        <p>Your provider profile is pending review and will not appear publicly until it is approved.</p>
      </div>
    </header>
    <main className="provider-join-shell">
      <section className="provider-join-card provider-pending-card">
        <CheckCircle2 size={46} />
        <h2>Pending approval</h2>
        <p>Thank you for applying to The Healing Directory. We will review your submission and follow up with next steps for account access and password setup after approval.</p>
        {warning ? <p className="provider-sync-warning">{warning}</p> : null}
        <p>Questions? Email <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a>.</p>
        <a className="provider-next" href="/">Back to directory <ArrowRight size={15} /></a>
      </section>
    </main>
  </div>;
}

function ProviderSignupNav() {
  return <nav className="provider-signup-nav" aria-label="Site navigation">
    <a className="provider-signup-brand" href="/"><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></a>
    <div>
      <a href="/">Providers</a>
      <a href="/events">Events</a>
      <a href="/login?next=/client-dashboard">Dashboard</a>
      <a className="provider-signup-login" href="/login">Login</a>
    </div>
  </nav>;
}

function Section({ title, text, children }) {
  return <section className="provider-section"><div className="provider-section-head"><h2>{title}</h2><p>{text}</p></div><div className="provider-fields">{children}</div></section>;
}

function Row({ children }) {
  return <div className="provider-row-fields">{children}</div>;
}

function TextField({ label, required, textarea, helper, ...props }) {
  return <label className={textarea ? "provider-field provider-full" : "provider-field"}><span>{label}{required ? " *" : ""}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}{helper ? <small>{helper}</small> : null}</label>;
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
    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose an image under 5 MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    onChange({ name: file.name, type: file.type, size: file.size, dataUrl });
  }
  return <label className="provider-field provider-full provider-file-field">
    <span>Profile photo</span>
    <input type="file" accept="image/*" onChange={handleFile} />
    {value?.name ? <small>Selected: {value.name}</small> : <small>Upload a headshot or profile image. It will be saved for review with your application.</small>}
    {error ? <small className="field-error">{error}</small> : null}
  </label>;
}

function MultiSelect({ label, values, options, onToggle, onAddCustom, customValue, customLabel, allowCustom = true, required }) {
  const [open, setOpen] = React.useState(false);
  const [custom, setCustom] = React.useState("");
  const ref = React.useRef(null);
  const inputRef = React.useRef(null);
  const selected = Array.isArray(values) ? values : [];
  const menuOptions = uniqueOptions(options || []).filter((option) => allowCustom ? !isOtherValue(option) : true);
  function addCustom() {
    const next = custom.trim();
    if (!next) return;
    if (onAddCustom) onAddCustom(next);
    else if (!selected.includes(next)) onToggle(next);
    setCustom("");
    setOpen(true);
  }
  React.useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className="provider-field provider-multi-field" ref={ref}>
    <span>{label}{required ? " *" : ""}</span>
    <button type="button" className={open ? "provider-multi-trigger open" : "provider-multi-trigger"} onClick={() => setOpen((current) => !current)}>
      <strong>{selected.length ? `${selected.length} selected` : "Choose one or more"}</strong><ChevronDown size={17} />
    </button>
    {selected.length ? <div className="provider-selected">{selected.map((value) => <button type="button" key={value} onClick={() => onToggle(value)}>{value}<X size={12} /></button>)}</div> : null}
    {customValue ? <div className="provider-selected provider-other-selected"><span>{customLabel || "Additional option"}: {customValue}</span></div> : null}
    {open ? <div className="provider-multi-menu">
      {menuOptions.map((option) => <button type="button" key={option} className={selected.includes(option) ? "selected" : ""} onClick={() => onToggle(option)}><span>{selected.includes(option) ? <Check size={14} /> : null}</span>{option}</button>)}
      {allowCustom ? <button type="button" className="provider-other-jump" onClick={() => inputRef.current?.focus()}><span>+</span>Add another option</button> : null}
      {allowCustom ? <div className="provider-other-box">
        <label>
          <span>Other {label.toLowerCase()}</span>
          <input ref={inputRef} value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustom(); } }} placeholder={`Type another ${label.toLowerCase()}`} />
        </label>
        <button type="button" onClick={addCustom}>Add</button>
      </div> : null}
    </div> : null}
  </div>;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Photo could not be read."));
    reader.readAsDataURL(file);
  });
}

function appendText(current, nextValue) {
  const next = String(nextValue || "").trim();
  if (!next) return current || "";
  const existing = String(current || "").split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
  return existing.map((item) => item.toLowerCase()).includes(next.toLowerCase()) ? existing.join(", ") : [...existing, next].join(", ");
}

function ConsentCheck({ checked, onChange, title, text, required }) {
  return <button type="button" className={checked ? "provider-consent checked" : "provider-consent"} onClick={() => onChange(!checked)}>
    <span className="provider-consent-box">{checked ? <Check size={17} /> : null}</span>
    <span><strong>{title}{required ? " *" : ""}</strong><small>{text}</small></span>
  </button>;
}

function stepIsValid(step, form) {
  if (step === 0) return Boolean(form.name.trim() && validEmail(form.email) && form.profession.trim());
  if (step === 1) return Boolean(form.providerType.length && form.concerns.length && form.servicesOffered.length && form.populationsServed.length && form.payType.length && form.state.length && form.availability.length && form.price.trim() && form.physicalLocations.trim() && form.availabilitySpecifics.trim());
  if (step === 5) return Boolean(form.consentDirectory && form.consentCommunity && form.signature.trim());
  return true;
}

function toggleValue(current, value) {
  const list = Array.isArray(current) ? current : [];
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function choose(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function mergeOptions(primary, required) {
  return uniqueOptions([...(Array.isArray(primary) ? primary : []), ...(Array.isArray(required) ? required : [])]);
}

function uniqueOptions(values) {
  const seen = new Set();
  return values.map((value) => String(value || "").trim()).filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isOtherValue(value) {
  return String(value || "").trim().toLowerCase() === "other";
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
