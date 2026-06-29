import React from "react";
import { getAccessToken, getUser, logout, refreshSession } from "./authClient.js";
import {
  ArrowLeft, CalendarDays, CircleUserRound, Clock, ExternalLink, LogOut,
  Image as ImageIcon, Info, MapPin, Pencil, Plus, RefreshCw, Search, Save, Send, Sparkles,
} from "lucide-react";

const API = "/.netlify/functions/app-api";
const EVENT_OPTION_FALLBACKS = {
  category: ["Workshop", "Support Group", "Training", "Referral Room", "Retreat", "Community Event", "Other"],
  audience: ["Community", "For Providers"],
  eventType: ["Workshop", "Healing Circle / Support Group", "Training", "Referral Room", "Retreat", "Other"],
  locationType: ["Virtual", "In Person", "Hybrid"],
};

export default function EventWorkspace({ path }) {
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    getUser().then((current) => {
      if (!current) {
        window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setUser({ email: current.email || "", name: current.name || current.userMetadata?.full_name || "", canEditEventHost: false });
      setReady(true);
    });
  }, []);

  if (!ready || !user) return <div className="state"><RefreshCw className="spin" /><h2>Checking account...</h2></div>;
  return <div className="app-shell event-workspace">
    <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <nav className="site-nav"><button onClick={() => go("/")}>Providers</button><button onClick={() => go("/events")}>Events</button><button onClick={() => go("/dashboard")}>Dashboard</button></nav>
      <div className="account-actions"><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></div>
    </header>
    {path === "/my-events" ? <MyEvents user={user} /> : <EventEditor user={user} editing={path === "/edit-event"} />}
  </div>;
}

function MyEvents({ user }) {
  const [payload, setPayload] = React.useState({ hosted: [], saved: [] });
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  React.useEffect(() => { api("my-events").then(setPayload).finally(() => setLoading(false)); }, []);
  const hosted = payload.hosted || [];
  const counts = {
    all: hosted.length,
    upcoming: hosted.filter((event) => new Date(event.start).getTime() >= Date.now()).length,
    past: hosted.filter((event) => new Date(event.start).getTime() < Date.now()).length,
    pending: hosted.filter((event) => lower(event.status).includes("pending")).length,
    draft: hosted.filter((event) => lower(event.status).includes("draft")).length,
  };
  const events = hosted.filter((event) => {
    const text = [event.name, event.category, event.eventType, event.audience].join(" ").toLowerCase();
    const time = new Date(event.start).getTime();
    const matches = filter === "all" || (filter === "upcoming" && time >= Date.now()) || (filter === "past" && time < Date.now()) || lower(event.status).includes(filter);
    return matches && (!query || text.includes(query.toLowerCase()));
  });

  return <main className="my-events-page">
    <section className="my-events-hero"><div>
      <div className="workspace-actions"><button onClick={() => go("/events")}><ArrowLeft size={16} /> Browse Events</button><button className="warm" onClick={() => go("/add-event")}><Plus size={16} /> Add Event</button></div>
      <p className="eyebrow">The Healing Directory</p><h1>Manage your<br />hosted events.</h1>
    </div></section>
    <section className="my-events-panel">
      <div className="my-events-heading"><div><p className="eyebrow ink">My Events</p><h2>Your event listings.</h2></div><button className="button event-gold" onClick={() => go("/add-event")}><Plus size={17} /> Add Event</button></div>
      <label className="workspace-search"><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event name, category, type, audience..." /></label>
      <div className="workspace-filters">{Object.keys(counts).map((key) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{capitalize(key)} <span>{counts[key]}</span></button>)}</div>
    </section>
    <section className="hosted-event-grid">{loading ? <WorkspaceState label="Loading your events" /> : events.map((event) => <HostedEventCard key={event.id} event={event} />)}</section>
  </main>;
}

function HostedEventCard({ event }) {
  return <article className="hosted-event-card">
    <div className="hosted-image">{event.image ? <img src={event.image} alt="" /> : <img src="/healing-directory-logo.svg" alt="" />}{event.status && !lower(event.status).includes("approved") ? <span className="hosted-status">{event.status}</span> : null}</div>
    <div className="hosted-copy"><div className="hosted-tags"><span>{event.category || event.eventType}</span>{event.audience ? <span>{event.audience}</span> : null}</div><h3>{event.name}</h3><p>{truncate(event.description, 90)}</p><div className="hosted-facts"><span><CalendarDays />{formatDate(event.start)}</span><span><Clock />{formatTimeRange(event.start, event.end)}</span><span><MapPin />{event.locationType || "Location TBA"}</span></div><div className="hosted-links">{event.address ? <a href={href(event.address)} target="_blank" rel="noreferrer">Address / Link <ExternalLink size={14} /></a> : null}{event.registration ? <a href={href(event.registration)} target="_blank" rel="noreferrer">Registration <ExternalLink size={14} /></a> : null}</div><div className="hosted-actions"><button className="button event-gold" onClick={() => go(`/edit-event?id=${event.id}`)}><Pencil size={16} /> Edit Event</button><button className="button event-outline" onClick={() => go(`/event-details?id=${event.id}`)}>View Details</button></div></div>
  </article>;
}

function EventEditor({ user, editing }) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("recordId");
  const [form, setForm] = React.useState({ eventName: "", category: "", eventAudience: "Community", eventType: "Workshop", date: "", endTime: "", locationType: "Virtual", addressLink: "", registrationLink: "", imageUrl: "", eventImageUpload: null, description: "", alternateEventHost: "" });
  const [options, setOptions] = React.useState(EVENT_OPTION_FALLBACKS);
  const [currentEvent, setCurrentEvent] = React.useState(null);
  const [canEditEventHost, setCanEditEventHost] = React.useState(Boolean(user.canEditEventHost));
  const [loading, setLoading] = React.useState(editing);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  React.useEffect(() => {
    let live = true;
    api("me")
      .then(({ user: current }) => {
        if (!live) return;
        setCanEditEventHost(Boolean(current?.canEditEventHost || current?.roles?.includes("admin")));
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  React.useEffect(() => {
    api("event-options").then(({ eventOptions = {} }) => {
      setOptions({
        category: withFallback(eventOptions.category, EVENT_OPTION_FALLBACKS.category),
        audience: withFallback(eventOptions.audience, EVENT_OPTION_FALLBACKS.audience),
        eventType: withFallback(eventOptions.eventType, EVENT_OPTION_FALLBACKS.eventType),
        locationType: withFallback(eventOptions.locationType, EVENT_OPTION_FALLBACKS.locationType),
      });
    }).catch(() => setOptions(EVENT_OPTION_FALLBACKS));
  }, []);
  React.useEffect(() => {
    if (!editing) return;
    if (!id) {
      setMessage("Missing event ID. Please open this from My Events.");
      setLoading(false);
      return;
    }
    api("event", { query: { id } }).then(({ event }) => {
      setCurrentEvent(event);
      setCanEditEventHost((current) => current || Boolean(event.canEditEventHost));
      if (lower(event.hostEmail) && lower(event.hostEmail) !== lower(user.email) && !event.canEditEventHost) {
        setMessage("This event belongs to another provider account. Open the event from the account that created it.");
        return;
      }
      setForm({ eventName: event.name || "", category: event.category || "", eventAudience: event.audience || "Community", eventType: event.eventType || "Workshop", date: localDate(event.start), endTime: localDate(event.end), locationType: event.locationType || "Virtual", addressLink: event.address || "", registrationLink: event.registration || "", imageUrl: event.image || "", eventImageUpload: null, description: event.description || "", alternateEventHost: event.alternateEventHost || "" });
    }).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [editing, id, user.email]);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const canEdit = !editing || !currentEvent?.hostEmail || lower(currentEvent.hostEmail) === lower(user.email) || canEditEventHost;
  async function submit(event) {
    event.preventDefault(); setSaving(true); setMessage("");
    if (!canEdit) {
      setMessage("This event belongs to another provider account. Open the event from the account that created it.");
      setSaving(false);
      return;
    }
    try {
      await api("save-event", { method: "POST", body: { ...form, recordId: editing ? id : "" } });
      window.location.assign(editing ? "/my-events?saved=1" : "/my-events?submitted=1");
    }
    catch (error) { setMessage(error.message); setSaving(false); }
  }
  const locked = editing && (!canEdit || (message && !currentEvent));
  if (loading) return <WorkspaceState label="Loading event editor" />;
  return <main className="event-editor-page">
    <section className={`event-editor-hero ${editing ? "with-summary" : ""}`}>
      <div>
        <div className="workspace-actions"><button onClick={() => go(editing ? "/my-events" : "/events")}><ArrowLeft size={16} /> {editing ? "Back to My Events" : "Back to Events"}</button><button onClick={() => go(editing ? "/events" : "/my-events")}>{editing ? "Browse Events" : "My Events"}</button></div>
        <p className="eyebrow">The Healing Directory</p>
        <h1>{editing ? "Edit your event listing." : "Create your event listing."}</h1>
        <p>{editing ? "Update your workshop, circle, training, referral room event, or community offering. Saved changes move the listing back into review before appearing as approved." : "Add community-facing workshops, circles, trainings, referral room events, and healing offerings."}</p>
      </div>
      {editing ? <aside className="event-edit-summary"><Sparkles /><span>Editing</span><strong>{currentEvent?.name || form.eventName || "Event listing"}</strong><em>{currentEvent?.status || "Pending Review"}</em></aside> : null}
    </section>
    <form className="event-editor-card" onSubmit={submit}>
      <p className="eyebrow ink">Event details</p><h2>{editing ? "Update the listing." : "Share the details."}</h2>
      {locked ? <div className="editor-message">{message}</div> : null}
      <div className="host-email-card"><label>{editing ? "Connected Host Email" : "Host Email"} *</label><strong>{user.email}</strong><p>{editing ? "This is locked to the logged-in provider account so the event stays connected to the correct dashboard." : "This event stays connected to your provider account."}</p></div>
      {canEditEventHost ? <div className="host-email-card alternate-host-card"><label>Event Host</label><input value={form.alternateEventHost} onChange={change("alternateEventHost")} placeholder="Optional alternate host name" /><p>This saves to Alternate Event Host in Airtable. Leave blank to use the connected host.</p></div> : null}
      {editing ? <div className="editor-alert"><Info size={18} /><span><strong>Changes are pending review.</strong><small>When you save edits, this event moves to Pending Review so updated details can be checked before being marked approved again.</small></span></div> : null}
      <EditorSection number="01" title="Basic information" text="Name the event and choose how it should be categorized."><EditorField label="Event Name" value={form.eventName} onChange={change("eventName")} placeholder="Ex: Nervous System Reset Circle" required /><EditorSelect label="Category" value={form.category} onChange={change("category")} options={options.category} placeholder="Choose a category" /><EditorSelect label="Event Audience" value={form.eventAudience} onChange={change("eventAudience")} options={options.audience} /><EditorSelect label="Event Type" value={form.eventType} onChange={change("eventType")} options={options.eventType} /></EditorSection>
      <EditorSection number="02" title="Time and location" text={editing ? "Update when it is happening and where people should go." : "Add when it is happening and where people should go."}><EditorField label="Start Date + Time" type="datetime-local" value={form.date} onChange={change("date")} required /><EditorField label="End Date + Time" type="datetime-local" value={form.endTime} onChange={change("endTime")} required /><EditorSelect label="Location Type" value={form.locationType} onChange={change("locationType")} options={options.locationType} /><EditorField label="Address or Link" value={form.addressLink} onChange={change("addressLink")} placeholder="Zoom link, registration page, studio address, etc." /><EditorField label="Registration Link" value={form.registrationLink} onChange={change("registrationLink")} placeholder="Optional" /><EventImageUpload value={form.eventImageUpload} imageUrl={form.imageUrl} onChange={(value) => setValue("eventImageUpload", value)} /></EditorSection>
      <EditorSection number="03" title="Description" text="Let people know what this event is about, who it's for, what they can expect, and anything important to know before attending." single><EditorField label="Description" value={form.description} onChange={change("description")} textarea placeholder="Share what the event includes, who it's meant for, and what attendees will experience." required /></EditorSection>
      {message && !locked ? <div className="editor-message">{message}</div> : null}<div className="editor-submit split">{editing ? <button type="button" className="button event-outline" onClick={() => go(`/event-details?id=${id}`)}><ExternalLink size={16} /> View Details</button> : null}<button className="button event-gold" disabled={saving || locked}>{saving ? <RefreshCw className="spin" size={17} /> : editing ? <Save size={17} /> : <Send size={17} />}{saving ? "Saving..." : editing ? "Save Changes" : "Submit Event"}</button></div>
    </form>
  </main>;
}

function EditorSection({ number, title, text, children, single }) { return <section className="editor-section"><div className="editor-section-title"><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div><div className={single ? "editor-grid single" : "editor-grid"}>{children}</div></section>; }
function EditorField({ label, textarea, ...props }) { return <label className={textarea ? "editor-field full" : "editor-field"}><span>{label}{props.required ? " *" : ""}</span>{textarea ? <textarea rows="8" {...props} /> : <input {...props} />}</label>; }
function EventImageUpload({ value, imageUrl, onChange }) {
  const [error, setError] = React.useState("");
  const preview = value?.dataUrl || (/^https?:\/\//i.test(imageUrl || "") ? imageUrl : "");

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
    if (file.size > 4 * 1024 * 1024) {
      setError("Please choose an image under 4MB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    onChange({ name: file.name, type: file.type, size: file.size, dataUrl });
  }

  return (
    <label className="editor-field event-image-field">
      <span>Event image</span>
      {preview ? (
        <div className="image-url-preview"><img src={preview} alt="" /></div>
      ) : (
        <div className="image-url-placeholder"><ImageIcon size={22} /><small>Upload a flyer or event graphic.</small></div>
      )}
      <span className="event-file-control">Choose image<input type="file" accept="image/*" onChange={handleFile} /></span>
      <small>{value?.name ? `Selected: ${value.name}` : "JPG, PNG, WebP, or GIF under 4MB."}</small>
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}
function EditorSelect({ label, options, required = true, placeholder = "Choose one", ...props }) {
  const choices = options?.length ? options : ["Other"];
  return <label className="editor-field"><span>{label}{required ? " *" : ""}</span><select {...props} required={required}><option value="">{placeholder}</option>{choices.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
function WorkspaceState({ label }) { return <div className="state"><RefreshCw className="spin" /><h2>{label}...</h2></div>; }
function go(path) { window.location.assign(path); }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
function lower(value) { return String(value || "").toLowerCase(); }
function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function truncate(value, max) { const text = String(value || "").trim(); return text.length > max ? `${text.slice(0, max - 1)}...` : text; }
function href(value) { return /^(https?:|mailto:|tel:)/i.test(String(value || "")) ? value : `https://${value}`; }
function date(value) { const parsed = new Date(value || 0); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function formatDate(value) { const parsed = date(value); return parsed ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(parsed) : "Date TBA"; }
function formatTime(value) { const parsed = date(value); return parsed ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(parsed) : ""; }
function formatTimeRange(start, end) { return [formatTime(start), formatTime(end)].filter(Boolean).join(" - ") || "Time TBA"; }
function localDate(value) { const parsed = date(value); if (!parsed) return ""; return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function withFallback(options, fallback) { return options?.length ? options : fallback; }
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });
}
async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const request = async (token) => {
    const headers = new Headers({ "Content-Type": "application/json" });
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("X-Supabase-Access-Token", token);
    }
    const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers, body: options.body ? JSON.stringify(options.body) : undefined });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  };
  let token = getAccessToken();
  if (!token) token = (await refreshSession().catch(() => null))?.access_token || getAccessToken();
  let { response, payload } = await request(token);
  if (response.status === 401) {
    token = (await refreshSession().catch(() => null))?.access_token || getAccessToken();
    ({ response, payload } = await request(token));
  }
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}
