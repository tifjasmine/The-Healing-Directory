import React from "react";
import { getAccessToken, getUser, logout, refreshSession } from "./authClient.js";
import { ArrowRight, CalendarDays, ChevronDown, CircleUserRound, HeartHandshake, LogOut, Menu, RefreshCw, Save, X } from "lucide-react";

const API = "/.netlify/functions/app-api";

export default function ClientDashboard({ hideHeader = false, previewUser = null, previewPayload = null, readOnly = false }) {
  const [user, setUser] = React.useState(null);
  const [payload, setPayload] = React.useState(null);
  const [tab, setTab] = React.useState("events");
  const [noteDrafts, setNoteDrafts] = React.useState({});
  const [savingNote, setSavingNote] = React.useState("");
  const [openNotes, setOpenNotes] = React.useState({});
  const [savedNotes, setSavedNotes] = React.useState({});
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef(null);

  React.useEffect(() => {
    if (previewUser && previewPayload) {
      setUser(previewUser);
      setPayload({ counts: {}, savedProviders: [], savedProviderItems: [], savedEvents: [], ...previewPayload });
      return;
    }
    getUser().then((current) => {
      if (!current) {
        window.location.replace("/login?next=/client-dashboard");
        return;
      }
      setUser({
        email: current.email || "",
        name: current.userMetadata?.full_name || current.name || "",
      });
      Promise.all([api("dashboard"), api("saved-providers").catch(() => ({ items: [] }))])
        .then(([nextPayload, savedProviderPayload]) => {
          const mergedPayload = { ...nextPayload, savedProviderItems: (savedProviderPayload.items || []).filter((item) => item.active !== false) };
          setPayload(mergedPayload);
          if (mergedPayload.account) {
            setUser((existing) => ({
              ...(existing || {}),
              email: mergedPayload.account.email || existing?.email || current.email || "",
              name: cleanName(mergedPayload.account.name) || cleanName(current.userMetadata?.full_name) || cleanName(current.name) || "",
            }));
          }
        })
        .catch(() => setPayload({ counts: {}, savedProviders: [], savedProviderItems: [], savedEvents: [] }));
    });
  }, [previewUser, previewPayload]);

  React.useEffect(() => {
    const next = {};
    (payload?.savedProviderItems || []).forEach((item) => {
      next[item.provider?.id || item.id] = item.notes || "";
    });
    setNoteDrafts(next);
  }, [payload?.savedProviderItems]);

  React.useEffect(() => {
    if (!menuOpen) return undefined;
    function closeHeaderMenu(event) {
      if (headerRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeHeaderMenu);
    return () => document.removeEventListener("pointerdown", closeHeaderMenu);
  }, [menuOpen]);

  if (!user || !payload) return <div className="state"><RefreshCw className="spin" /><h2>Loading dashboard...</h2></div>;

  const savedEvents = payload.savedEvents || [];
  const savedProviders = payload.savedProviderItems || [];

  async function saveProviderNote(item) {
    if (readOnly) return;
    const providerId = item.provider?.id;
    if (!providerId) return;
    setSavingNote(providerId);
    try {
      await api("toggle-provider", {
        method: "POST",
        body: { providerId, saveId: item.id, active: true, notes: noteDrafts[providerId] || "" },
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
    {!hideHeader ? <header ref={headerRef} className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "site-nav open" : "site-nav"}><button onPointerDown={(event) => { event.preventDefault(); go("/"); }} onClick={() => go("/")}>Providers</button><button onPointerDown={(event) => { event.preventDefault(); go("/events"); }} onClick={() => go("/events")}>Events</button><button onPointerDown={(event) => { event.preventDefault(); go("/client-dashboard"); }} onClick={() => go("/client-dashboard")}>Dashboard</button></nav>
      <div className="account-actions"><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(cleanName(user.name) || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></div>
    </header> : null}
    <main className="client-dashboard-page">
      <section className="client-dashboard-hero">
        <p className="client-dashboard-kicker">Client Dashboard</p>
        <h1>Welcome back, {firstName(cleanName(user.name) || user.email)}.</h1>
        <p>A quiet place to keep the people and gatherings you want to remember.</p>
      </section>
      <section className="client-dashboard-stats">
        <ClientStat label="Saved Workshops" value={payload.counts?.savedEvents || 0} />
        <ClientStat label="Saved Providers" value={payload.counts?.savedProviders || 0} />
      </section>
      <section className="client-dashboard-content">
        <div className="client-saved-panel">
          <div className="client-tabs"><button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Saved Workshops</button><button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")}>Saved Providers</button></div>
          {tab === "events" ? <SavedList items={savedEvents} kind="event" /> : <SavedList items={savedProviders} kind="provider" noteDrafts={noteDrafts} setNoteDrafts={setNoteDrafts} savingNote={savingNote} savedNotes={savedNotes} openNotes={openNotes} setOpenNotes={setOpenNotes} onSaveNote={saveProviderNote} readOnly={readOnly} />}
        </div>
      </section>
    </main>
  </div>;
}

function ClientStat({ label, value }) { return <div className="client-stat"><span>{label}</span><strong>{Number(value || 0)}</strong></div>; }

function SavedList({ items, kind, noteDrafts = {}, setNoteDrafts, savingNote, savedNotes = {}, openNotes = {}, setOpenNotes, onSaveNote, readOnly = false }) {
  if (!items.length) return <div className="client-empty"><h2>No saved {kind === "event" ? "workshops" : "providers"} yet</h2><p>{kind === "event" ? "When you save a workshop, circle, or healing experience, it will show up here." : "Providers you save will become your private healing shortlist."}</p><button className="button client-side-button" onClick={() => go(kind === "event" ? "/events" : "/")}>{kind === "event" ? "Browse Workshops" : "Find Providers"}</button></div>;
  return <div className={`client-saved-list ${kind === "event" ? "event-list" : "provider-list"}`}>{items.map((item, index) => {
    const record = item.event || item.provider || item;
    const title = record.name || record.title || (kind === "event" ? "Saved Workshop" : "Saved Provider");
    const path = kind === "event" ? `/event-details?id=${record.id}` : `/provider-details?id=${record.id}`;
    if (kind === "provider") {
      const open = Boolean(openNotes[record.id]);
      return <article className="saved-provider-note-card compact" key={record.id || item.id || index}>
        <div className="saved-provider-main"><button className="saved-provider-photo-button" type="button" onClick={() => go(path)}>{record.photo ? <img src={record.photo} alt="" /> : <span>{initials(title)}</span>}</button><button className="saved-provider-title-button" type="button" onClick={() => go(path)}><strong>{title}</strong><small>{providerTypeLabel(record) || record.profession || record.email || "Provider"}</small></button><button className="saved-note-toggle" type="button" aria-expanded={open} onClick={() => setOpenNotes?.((current) => ({ ...current, [record.id]: !open }))}><span>{readOnly ? "View note" : noteDrafts[record.id] ? "Edit note" : "Add note"}</span><ChevronDown size={17} /></button><ArrowRight size={18} /></div>
        {open ? <div className="saved-note-editor"><label className="private-note-field">
            <span>Private note</span>
            <small>Only you can see this. Providers cannot see your notes.</small>
            <textarea value={noteDrafts[record.id] || ""} disabled={readOnly} onChange={(event) => setNoteDrafts?.((current) => ({ ...current, [record.id]: event.target.value }))} placeholder="Add a reminder for yourself..." rows={3} />
          </label>
          {!readOnly ? <button className="button tertiary note-save-button" type="button" disabled={savingNote === record.id} onClick={() => onSaveNote?.(item)}>{savingNote === record.id ? <RefreshCw className="spin" size={15} /> : <Save size={15} />}{savedNotes[record.id] ? "Saved" : "Save note"}</button> : null}</div> : noteDrafts[record.id] ? <p className="saved-note-preview">{notePreview(noteDrafts[record.id])}</p> : null}
      </article>;
    }
    return <button key={record.id || item.id || index} className="client-saved-row saved-event-row" onClick={() => go(path)}>{record.image ? <img src={record.image} alt="" /> : <span className="client-saved-mark"><CalendarDays size={19} /></span>}<span><strong>{title}</strong><small>{formatDate(record.start || record.date)}</small></span><ArrowRight size={18} /></button>;
  })}</div>;
}

function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function cleanName(value) { const name = String(value || "").trim(); return ["name", "full name", "your name"].includes(name.toLowerCase()) ? "" : name; }
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date coming soon" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(time); }
function initials(value) { return String(value || "Provider").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P"; }
function providerTypeLabel(provider) { return Array.isArray(provider.providerType) ? provider.providerType.join(", ") : String(provider.providerType || ""); }
function notePreview(value) { const text = String(value || "").replace(/\s+/g, " ").trim(); return text.length > 95 ? `${text.slice(0, 95).trim()}...` : text; }
function go(path) { window.location.assign(path); }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
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
