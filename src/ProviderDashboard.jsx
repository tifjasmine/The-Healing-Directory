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

export default function ProviderDashboard() {
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
    { key: "mine", label: "My Events", count: payload.myEvents.length, icon: <CalendarDays size={16} /> },
    { key: "referral", label: "Referral Room", count: null, icon: <HeartHandshake size={16} /> },
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
    <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <nav className="site-nav"><button onClick={() => go("/")}>Providers</button><button onClick={() => go("/events")}>Events</button><button onClick={() => go("/dashboard")}>Dashboard</button></nav>
      <div className="account-actions"><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></div>
    </header>

    <main className="provider-dashboard-page simple-dashboard-page">
      <section className="simple-dashboard-hero">
        <div>
          <p className="dashboard-kicker"><span /> Provider Dashboard</p>
          <h1>Welcome back, {firstName(user.name || user.email)}.</h1>
          <p>Saved providers, workshops, your events, and Referral Room requests live here.</p>
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
        {tab === "mine" ? <MyEventsPanel items={payload.myEvents} /> : null}
        {tab === "referral" ? <ReferralPanel /> : null}
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

function MyEventsPanel({ items }) {
  return <div>
    <div className="simple-dashboard-actions"><button className="button provider-dashboard-primary" type="button" onClick={() => go("/add-event")}>Add event</button><button className="button provider-dashboard-secondary" type="button" onClick={() => go("/my-events")}>Manage all events <ArrowRight size={16} /></button></div>
    {!items.length ? <EmptyPanel title="No hosted events yet" text="Create your first event listing when you are ready." action="Add event" path="/add-event" inline /> : <div className="simple-dashboard-list">{items.slice(0, 6).map((event) => <button key={event.id} className="client-saved-row" type="button" onClick={() => go(`/edit-event?id=${event.id}`)}><span className="client-saved-mark"><CalendarDays size={19} /></span><span><strong>{event.name || "Hosted event"}</strong><small>{formatDate(event.start || event.date)}</small></span><ArrowRight size={18} /></button>)}</div>}
  </div>;
}

function ReferralPanel() {
  return <div className="referral-dashboard-card">
    <HeartHandshake size={26} />
    <h2>Referral Room</h2>
    <p>Request a seat, review your RSVPs, and return to referral room details from one place.</p>
    <button className="button provider-dashboard-primary" type="button" onClick={() => go("/referral-room")}>Request a seat <ArrowRight size={16} /></button>
  </div>;
}

function EmptyPanel({ title, text, action, path, inline }) {
  return <div className={inline ? "client-empty inline-empty" : "client-empty"}><h2>{title}</h2><p>{text}</p><button className="button client-side-button" type="button" onClick={() => go(path)}>{action}</button></div>;
}

function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function initials(value) { return String(value || "Provider").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"; }
function providerTypeLabel(provider) { return Array.isArray(provider.providerType) ? provider.providerType.join(", ") : String(provider.providerType || ""); }
function go(path) { window.location.assign(path); }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date coming soon" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(time); }
function emptyPayload() { return { counts: {}, savedProviders: [], savedProviderItems: [], savedEvents: [], myEvents: [] }; }
async function loadDashboard() {
  const [dashboard, savedProviders, myEvents] = await Promise.all([
    api("dashboard").catch(() => ({})),
    api("saved-providers").catch(() => ({ items: [] })),
    api("my-events").catch(() => ({ hosted: [] })),
  ]);
  return {
    ...emptyPayload(),
    ...dashboard,
    savedProviderItems: (savedProviders.items || []).filter((item) => item.active !== false),
    myEvents: myEvents.hosted || [],
  };
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
