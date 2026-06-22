import React from "react";
import { getAccessToken, getUser, logout, refreshSession } from "./authClient.js";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CircleUserRound,
  ChevronDown,
  HeartHandshake,
  LogOut,
  RefreshCw,
  Save,
  Star,
} from "lucide-react";

const API = "/.netlify/functions/app-api";

export default function ProviderDashboard({ hideHeader = false }) {
  const [user, setUser] = React.useState(null);
  const [payload, setPayload] = React.useState(null);
  const [tab, setTab] = React.useState("providers");
  const [savingNote, setSavingNote] = React.useState("");
  const [noteDrafts, setNoteDrafts] = React.useState({});
  const [openNotes, setOpenNotes] = React.useState({});
  const [savedNotes, setSavedNotes] = React.useState({});

  React.useEffect(() => {
    getUser().then((current) => {
      if (!current) {
        window.location.replace("/login?next=/dashboard");
        return;
      }
      const normalized = {
        email: current.email || "",
        name: current.name || current.userMetadata?.full_name || "",
        roles: current.roles || [],
        accountType: current.userMetadata?.account_type || "",
      };
      if (!normalized.roles.includes("provider") && normalized.accountType !== "provider" && !normalized.roles.includes("admin")) {
        window.location.replace("/client-dashboard");
        return;
      }
      setUser(normalized);
      loadDashboard().then(setPayload).catch(() => setPayload(emptyPayload()));
    });
  }, []);

  React.useEffect(() => {
    const next = {};
    (payload?.savedProviderItems || []).forEach((item) => {
      next[item.provider?.id || item.id] = item.notes || "";
    });
    setNoteDrafts(next);
  }, [payload?.savedProviderItems]);

  if (!user || !payload) return <div className="state"><RefreshCw className="spin" /><h2>Loading dashboard...</h2></div>;

  const tabs = [
    { key: "providers", label: "Saved Providers", count: payload.savedProviderItems.length, icon: <Star size={16} /> },
    { key: "events", label: "Saved Events", count: payload.savedEvents.length, icon: <Bookmark size={16} /> },
    { key: "mine", label: "My Events", count: payload.myEvents.length + payload.referralRequests.length, icon: <CalendarDays size={16} /> },
    { key: "referral", label: "The Referral Room", count: payload.referralSessions.length, icon: <HeartHandshake size={16} /> },
  ];

  async function saveProviderNote(item) {
    const providerId = item.provider?.id;
    if (!providerId) return;
    setSavingNote(providerId);
    try {
      await api("toggle-provider", {
        method: "POST",
        body: { providerId, active: true, notes: noteDrafts[providerId] || "" },
      });
      setPayload((current) => ({
        ...current,
        savedProviderItems: current.savedProviderItems.map((entry) => (
          entry.provider?.id === providerId ? { ...entry, notes: noteDrafts[providerId] || "" } : entry
        )),
      }));
      setSavedNotes((current) => ({ ...current, [providerId]: true }));
      setOpenNotes((current) => ({ ...current, [providerId]: false }));
    } finally {
      setSavingNote("");
    }
  }

  return <div className="app-shell">
    {!hideHeader ? <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <nav className="site-nav"><button onClick={() => go("/")}>Providers</button><button onClick={() => go("/events")}>Events</button><button onClick={() => go("/dashboard")}>Dashboard</button></nav>
      <div className="account-actions"><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></div>
    </header> : null}

    <main className="provider-dashboard-page simple-dashboard-page">
      <section className="simple-dashboard-hero">
        <div>
          <p className="dashboard-kicker"><span /> Provider Dashboard</p>
          <h1>Welcome back, {firstName(user.name || user.email)}.</h1>
          <p>Saved providers, workshops, your events, and The Referral Room requests live here.</p>
        </div>
        <button className="button provider-dashboard-primary" type="button" onClick={() => go("/edit-profile")}>Edit profile <ArrowRight size={16} /></button>
      </section>

      <section className="simple-dashboard-shell">
        <div className="simple-dashboard-tabs" role="tablist" aria-label="Provider dashboard sections">
          {tabs.map((item) => (
            <button key={item.key} type="button" className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>
              {item.icon}
              <span>{item.label}</span>
              {item.count !== null ? <strong>{item.count}</strong> : null}
            </button>
          ))}
        </div>

        {tab === "providers" ? <SavedProviderPanel items={payload.savedProviderItems} noteDrafts={noteDrafts} setNoteDrafts={setNoteDrafts} savingNote={savingNote} savedNotes={savedNotes} openNotes={openNotes} setOpenNotes={setOpenNotes} onSaveNote={saveProviderNote} /> : null}
        {tab === "events" ? <SavedEventPanel items={payload.savedEvents} /> : null}
        {tab === "mine" ? <MyEventsPanel items={payload.myEvents} referralRequests={payload.referralRequests} /> : null}
        {tab === "referral" ? <ReferralPanel items={payload.referralRequests} sessions={payload.referralSessions} /> : null}
      </section>
    </main>
  </div>;
}

function SavedProviderPanel({ items, noteDrafts, setNoteDrafts, savingNote, savedNotes, openNotes, setOpenNotes, onSaveNote }) {
  if (!items.length) return <EmptyPanel title="No saved providers yet" text="Save providers from the directory and they will show up here for referrals or follow-up." action="Browse providers" path="/" />;
  return <div className="simple-dashboard-list">
    {items.map((item) => {
      const provider = item.provider || {};
      const providerId = provider.id || item.id;
      const open = Boolean(openNotes[providerId]);
      return <article className="saved-provider-note-card" key={item.id || providerId}>
        <div className="saved-provider-main">
          <button className="saved-provider-photo-button" type="button" onClick={() => go(`/provider-details?id=${providerId}`)}>{provider.photo ? <img src={provider.photo} alt="" /> : <span>{initials(provider.name)}</span>}</button>
          <button className="saved-provider-title-button" type="button" onClick={() => go(`/provider-details?id=${providerId}`)}>
            <strong>{provider.name || "Saved provider"}</strong>
            <small>{providerTypeLabel(provider) || provider.profession || provider.email || "Provider"}</small>
          </button>
          <button className="saved-note-toggle" type="button" aria-expanded={open} onClick={() => setOpenNotes((current) => ({ ...current, [providerId]: !open }))}>
            <span>{noteDrafts[providerId] ? "Edit note" : "Add note"}</span>
            <ChevronDown size={17} />
          </button>
          <ArrowRight size={18} />
        </div>
        {open ? <div className="saved-note-editor">
          <label className="private-note-field">
            <span>Private note</span>
            <small>Only you can see this. Providers cannot see your notes.</small>
            <textarea value={noteDrafts[providerId] || ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [providerId]: event.target.value }))} placeholder="Add a reminder, referral context, or why this provider felt aligned..." rows={3} />
          </label>
          <button className="button tertiary note-save-button" type="button" disabled={savingNote === providerId} onClick={() => onSaveNote(item)}>
            {savingNote === providerId ? <RefreshCw className="spin" size={15} /> : <Save size={15} />}
            {savedNotes[providerId] ? "Saved" : "Save note"}
          </button>
        </div> : noteDrafts[providerId] ? <p className="saved-note-preview">{savedNotes[providerId] ? "Note saved." : "Private note saved."}</p> : null}
      </article>;
    })}
  </div>;
}

function SavedEventPanel({ items }) {
  if (!items.length) return <EmptyPanel title="No saved events yet" text="Save workshops or circles from the events page and they will appear here." action="Browse events" path="/events" />;
  return <div className="simple-dashboard-list">{items.map((event) => <button key={event.id} className="client-saved-row saved-event-row" type="button" onClick={() => go(`/event-details?id=${event.id}`)}>{event.image ? <img src={event.image} alt="" /> : <span className="client-saved-mark"><CalendarDays size={19} /></span>}<span><strong>{event.name || "Saved event"}</strong><small>{formatDate(event.start || event.date)}</small></span><ArrowRight size={18} /></button>)}</div>;
}

function MyEventsPanel({ items, referralRequests }) {
  return <div>
    <div className="simple-dashboard-actions"><button className="button provider-dashboard-primary" type="button" onClick={() => go("/add-event")}>Add event</button><button className="button provider-dashboard-secondary" type="button" onClick={() => go("/my-events")}>Manage all events <ArrowRight size={16} /></button></div>
    {!items.length ? <EmptyPanel title="No hosted events yet" text="Create your first event listing when you are ready." action="Add event" path="/add-event" inline /> : <div className="simple-dashboard-list">{items.slice(0, 6).map((event) => <button key={event.id} className="client-saved-row" type="button" onClick={() => go(`/edit-event?id=${event.id}`)}><span className="client-saved-mark"><CalendarDays size={19} /></span><span><strong>{event.name || "Hosted event"}</strong><small>{formatDate(event.start || event.date)}</small></span><ArrowRight size={18} /></button>)}</div>}
    {referralRequests.length ? <section className="dashboard-referral-events">
      <h2>The Referral Room requests</h2>
      <div className="simple-dashboard-list">{referralRequests.map((item) => <button key={item.id} className="client-saved-row referral-event-row" type="button" onClick={() => go(`/referral-room?room=${encodeURIComponent(item.sessionId || "")}`)}><span className="client-saved-mark"><HeartHandshake size={19} /></span><span><strong>{item.sessionName || "The Referral Room"}</strong><small>{formatDate(item.sessionDate)} · {item.status || "Pending"}</small></span><ArrowRight size={18} /></button>)}</div>
    </section> : null}
  </div>;
}

function ReferralPanel({ items, sessions }) {
  const activeRequests = items.filter((item) => !isCancelled(item.status));
  const [openSessionId, setOpenSessionId] = React.useState("");
  React.useEffect(() => {
    if (!openSessionId && sessions[0]?.id) setOpenSessionId(sessions[0].id);
  }, [openSessionId, sessions]);
  return <div className="referral-dashboard-card">
    <HeartHandshake size={26} />
    <h2>The Referral Room</h2>
    <div className="referral-dashboard-sessions">
      {sessions.length ? sessions.map((session) => <ReferralSessionSummary key={session.id} session={session} requests={activeRequests} open={openSessionId === session.id} onToggle={() => setOpenSessionId((current) => current === session.id ? "" : session.id)} />) : <div className="client-empty inline-empty"><h2>No upcoming rooms yet</h2><p>New dates for The Referral Room will appear here when seats open.</p></div>}
    </div>
  </div>;
}

function ReferralSessionSummary({ session, requests = [], open, onToggle }) {
  const rules = (session.rules || []).map((rule) => {
    const providers = providersForRule(rule, session.approvedProviders || []);
    const taken = Math.max(Number(rule.taken || 0), providers.length);
    const seatLimit = Number(rule.seatLimit || 0);
    return {
      ...rule,
      displayProviders: providers,
      displayTaken: taken,
      displayRemaining: Math.max(seatLimit - taken, 0),
    };
  });
  const myRequest = requests.find((item) => item.sessionId === session.id);
  return <article className={open ? "referral-session-summary" : "referral-session-summary collapsed"}>
    <button className="referral-session-heading" type="button" aria-expanded={open} onClick={onToggle}>
      <div>
        <strong>{session.name || "The Referral Room"}</strong>
        <small>{formatDateTime(session.date)}{session.focus ? ` · ${session.focus}` : ""}</small>
      </div>
      <span>{myRequest?.status || `${session.remaining || 0} open`} <ChevronDown size={16} /></span>
    </button>
    {open ? <>
      {session.description ? <p>{session.description}</p> : null}
      <div className="referral-seat-summary-grid">
        {rules.length ? rules.map((rule) => (
          <div className={rule.displayRemaining > 0 && rule.accepting !== false ? "referral-seat-summary" : "referral-seat-summary full"} key={rule.id || rule.serviceType}>
            <div>
              <strong>{rule.serviceType || "Provider type"}</strong>
              <small>{rule.displayRemaining || 0}/{rule.seatLimit || 0} seats open</small>
            </div>
            <ApprovedProviderPreview providers={rule.displayProviders} fallbackType={rule.serviceType} />
          </div>
        )) : <div className="referral-seat-summary"><strong>Open provider mix</strong><small>{session.remaining || 0} open seats</small><p>This room is not limited to specific provider types yet.</p></div>}
      </div>
      <div className="referral-session-action">
        <button className={myRequest ? "button provider-dashboard-secondary" : "button provider-dashboard-primary"} type="button" onClick={() => go(`/referral-room?room=${encodeURIComponent(session.id || "")}`)}>
          {myRequest ? "Manage this RSVP" : "Request a seat"} <ArrowRight size={16} />
        </button>
      </div>
    </> : null}
  </article>;
}

function providersForRule(rule, approvedProviders = []) {
  const existing = Array.isArray(rule.approvedProviders) ? rule.approvedProviders : [];
  const seen = new Set(existing.map(providerKey));
  const inferred = approvedProviders.filter((provider) => providerTypeMatches(displayText(provider?.serviceType), displayText(rule?.serviceType)) && !seen.has(providerKey(provider)));
  return [...existing, ...inferred];
}

function ApprovedProviderPreview({ providers = [], fallbackType }) {
  if (!providers.length) return <p>No approved providers in this seat yet.</p>;
  return <div className="dashboard-approved-providers">
    {providers.map((provider, index) => {
      const item = typeof provider === "string" ? { name: provider, serviceType: fallbackType } : provider;
      const name = displayText(item.name) || displayText(item.fullName) || displayText(item.providerName) || displayText(item.email) || displayText(item) || "Approved provider";
      const serviceType = displayText(item.serviceType) || displayText(item.providerType) || fallbackType || "Provider";
      const photo = displayText(item.photo) || displayText(item.photoUrl) || displayText(item.profilePhoto);
      const content = <>
        {photo ? <img src={photo} alt="" /> : <span>{initials(name)}</span>}
        <span className="dashboard-approved-text"><b>{name}</b><small>{serviceType}</small></span>
      </>;
      return item.profileUrl
        ? <a href={item.profileUrl} key={`${item.profileUrl}-${index}`}>{content}</a>
        : <span key={`${name}-${index}`}>{content}</span>;
    })}
  </div>;
}

function EmptyPanel({ title, text, action, path, inline }) {
  return <div className={inline ? "client-empty inline-empty" : "client-empty"}><h2>{title}</h2><p>{text}</p><button className="button client-side-button" type="button" onClick={() => go(path)}>{action}</button></div>;
}

function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function initials(value) { return String(value || "Provider").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"; }
function providerTypeLabel(provider) { return Array.isArray(provider.providerType) ? provider.providerType.join(", ") : String(provider.providerType || ""); }
function displayText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const direct = value.name ?? value.fullName ?? value.providerName ?? value.title ?? value.label ?? value.value ?? value.text ?? value.email;
    if (direct != null) return displayText(direct);
    if (value.fields) return displayText(value.fields.Name ?? value.fields.name ?? value.fields.Email ?? value.fields.email);
    return "";
  }
  return String(value);
}
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function compact(value) { return normalize(value).replace(/&/g, "and").replace(/[^a-z0-9]/g, ""); }
function isCancelled(value) { const clean = normalize(value); return clean.includes("cancel") || clean.includes("declin") || clean.includes("remove"); }
function providerKey(provider) { if (typeof provider === "string") return normalize(provider); return `${normalize(provider?.profileId || "")}|${normalize(provider?.email || "")}|${normalize(displayText(provider?.name))}`; }
function providerTypeMatches(left, right) { const a = compact(left); const b = compact(right); return Boolean(a && b && (a === b || a.includes(b) || b.includes(a))); }
function go(path) { window.location.assign(path); }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date coming soon" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(time); }
function formatDateTime(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date coming soon" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(time); }
function emptyPayload() { return { counts: {}, savedProviders: [], savedProviderItems: [], savedEvents: [], myEvents: [], referralRequests: [], referralSessions: [] }; }
async function loadDashboard() {
  const [dashboard, savedProviders, myEvents, referralRoom] = await Promise.all([
    api("dashboard").catch(() => ({})),
    api("saved-providers").catch(() => ({ items: [] })),
    api("my-events").catch(() => ({ hosted: [] })),
    referralApi("provider-data").catch(() => ({ attendance: [] })),
  ]);
  return {
    ...emptyPayload(),
    ...dashboard,
    savedProviderItems: (savedProviders.items || []).filter((item) => item.active !== false),
    myEvents: myEvents.hosted || [],
    referralRequests: (referralRoom.attendance || []).filter((item) => !item.attended),
    referralSessions: referralRoom.sessions || [],
  };
}
async function referralApi(action) {
  const url = new URL("/.netlify/functions/referral-room", window.location.origin);
  url.searchParams.set("action", action);
  let token = getAccessToken();
  if (!token) token = (await refreshSession().catch(() => null))?.access_token || getAccessToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Supabase-Access-Token"] = token;
  }
  const response = await fetch(url, { credentials: "include", headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The Referral Room request failed.");
  return payload;
}
async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  const request = async (token) => {
    const headers = { "Content-Type": "application/json" };
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
