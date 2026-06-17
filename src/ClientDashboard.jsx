import React from "react";
import { getUser, logout } from "@netlify/identity";
import { ArrowRight, CalendarDays, CircleUserRound, HeartHandshake, LogOut, RefreshCw } from "lucide-react";

const API = "/.netlify/functions/app-api";

export default function ClientDashboard() {
  const [user, setUser] = React.useState(null);
  const [payload, setPayload] = React.useState(null);
  const [tab, setTab] = React.useState("events");

  React.useEffect(() => {
    getUser().then((current) => {
      if (!current) {
        window.location.replace("/login?next=/client-dashboard");
        return;
      }
      setUser({
        email: current.email || "",
        name: current.userMetadata?.full_name || current.name || "",
      });
      api("dashboard")
        .then((nextPayload) => {
          setPayload(nextPayload);
          if (nextPayload.account) {
            setUser((existing) => ({
              ...(existing || {}),
              email: nextPayload.account.email || existing?.email || current.email || "",
              name: cleanName(nextPayload.account.name) || cleanName(current.userMetadata?.full_name) || cleanName(current.name) || "",
            }));
          }
        })
        .catch(() => setPayload({ counts: {}, savedProviders: [], savedEvents: [] }));
    });
  }, []);

  if (!user || !payload) return <div className="state"><RefreshCw className="spin" /><h2>Loading dashboard...</h2></div>;

  const savedEvents = payload.savedEvents || [];
  const savedProviders = payload.savedProviders || [];

  return <div className="app-shell">
    <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <nav className="site-nav"><button onClick={() => go("/")}>Providers</button><button onClick={() => go("/events")}>Events</button><button onClick={() => go("/client-dashboard")}>Dashboard</button></nav>
      <div className="account-actions"><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(cleanName(user.name) || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></div>
    </header>
    <main className="client-dashboard-page">
      <section className="client-dashboard-hero">
        <p className="client-dashboard-kicker">Client Dashboard</p>
        <h1>Welcome back, {firstName(cleanName(user.name) || user.email)}.</h1>
        <p>Your saved healing support lives here - workshops you want to return to and providers who feel aligned for your next step.</p>
        <div className="client-dashboard-actions"><button className="button client-primary" onClick={() => go("/events")}>Browse Workshops</button><button className="button client-secondary" onClick={() => go("/")}>Find Providers</button></div>
      </section>
      <section className="client-dashboard-stats">
        <ClientStat label="Saved Workshops" value={payload.counts?.savedEvents || 0} />
        <ClientStat label="Upcoming Workshops" value={payload.counts?.upcomingEvents || 0} />
        <ClientStat label="Saved Providers" value={payload.counts?.savedProviders || 0} />
      </section>
      <section className="client-dashboard-content">
        <div className="client-saved-panel">
          <div className="client-tabs"><button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Saved Workshops</button><button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")}>Saved Providers</button></div>
          {tab === "events" ? <SavedList items={savedEvents} kind="event" /> : <SavedList items={savedProviders} kind="provider" />}
        </div>
        <aside className="client-dashboard-aside">
          <section><h2>Not sure where to begin?</h2><p>Start with what your system needs most right now: grounding, therapy, body-based healing, community, motherhood support, or care.</p><button className="button client-side-button" onClick={() => go("/")}>Explore Providers</button></section>
          <section><h2>Your private shortlist</h2><p>Save anything that feels aligned now, then return when you have more space to take the next step.</p></section>
        </aside>
      </section>
    </main>
  </div>;
}

function ClientStat({ label, value }) { return <div className="client-stat"><span>{label}</span><strong>{Number(value || 0)}</strong></div>; }

function SavedList({ items, kind }) {
  if (!items.length) return <div className="client-empty"><h2>No saved {kind === "event" ? "workshops" : "providers"} yet</h2><p>{kind === "event" ? "When you save a workshop, circle, or healing experience, it will show up here." : "Providers you save will become your private healing shortlist."}</p><button className="button client-side-button" onClick={() => go(kind === "event" ? "/events" : "/")}>{kind === "event" ? "Browse Workshops" : "Find Providers"}</button></div>;
  return <div className="client-saved-list">{items.slice(0, 5).map((item, index) => {
    const record = item.event || item.provider || item;
    const title = record.name || record.title || (kind === "event" ? "Saved Workshop" : "Saved Provider");
    const path = kind === "event" ? `/event-details?id=${record.id}` : `/provider-details?id=${record.id}`;
    return <button key={record.id || item.id || index} className="client-saved-row" onClick={() => go(path)}><span className="client-saved-mark">{kind === "event" ? <CalendarDays size={19} /> : <HeartHandshake size={19} />}</span><span><strong>{title}</strong><small>{kind === "event" ? formatDate(record.start || record.date) : record.title || record.category || "Provider"}</small></span><ArrowRight size={18} /></button>;
  })}</div>;
}

function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function cleanName(value) { const name = String(value || "").trim(); return ["name", "full name", "your name"].includes(name.toLowerCase()) ? "" : name; }
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date coming soon" : new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(time); }
function go(path) { window.location.assign(path); }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
async function api(action) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); const response = await fetch(url, { credentials: "include" }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Request failed."); return payload; }
