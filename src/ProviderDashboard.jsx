import React from "react";
import { getUser, logout } from "./authClient.js";
import {
  ArrowRight, CalendarDays, CircleUserRound, HeartHandshake, LogOut, Plus, RefreshCw, Search,
  ShieldCheck, Sparkles, Star,
} from "lucide-react";

const API = "/.netlify/functions/app-api";

export default function ProviderDashboard() {
  const [user, setUser] = React.useState(null);
  const [payload, setPayload] = React.useState(null);

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
      api("dashboard").then(setPayload).catch(() => setPayload({ counts: {} }));
    });
  }, []);

  if (!user || !payload) return <div className="state"><RefreshCw className="spin" /><h2>Loading dashboard...</h2></div>;

  const referralTools = [
    { eyebrow: "Profile", title: "Edit Directory Profile", text: "Update your public profile, areas of care, referral details, photo URL, and human-side notes.", icon: <CircleUserRound />, path: "/edit-profile" },
    { eyebrow: "Browse", title: "Provider Directory", text: "Find aligned providers by specialty, support area, location, and availability.", icon: <Search />, path: "/" },
    { eyebrow: "Bookmarked", title: "Saved Providers", text: "Return to the providers you saved for referrals, collaboration, and warm handoffs.", icon: <Star />, path: "/saved-providers" },
    { eyebrow: "Community", title: "Referral Room", text: "Request a seat, review your RSVPs, and reconnect with providers you have met.", icon: <HeartHandshake />, path: "/referral-room" },
  ];
  const eventTools = [
    { eyebrow: "Explore", title: "Upcoming Events", text: "Browse workshops, support groups, circles, trainings, retreats, and community offerings.", icon: <Sparkles />, path: "/events" },
    { eyebrow: "Hosting", title: "My Events", text: "Manage the events and experiences connected to your provider email.", icon: <CalendarDays />, path: "/my-events" },
    { eyebrow: "Submit", title: "Add an Event", text: "Share a new offering with the community and submit it for review.", icon: <Plus />, path: "/add-event" },
  ];
  if (user.roles.includes("admin")) {
    eventTools.push({ eyebrow: "Admin", title: "Event Approvals", text: "Review event submissions and manage publication status.", icon: <ShieldCheck />, path: "/admin/events" });
  }

  return <div className="app-shell">
    <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <nav className="site-nav"><button onClick={() => go("/")}>Providers</button><button onClick={() => go("/events")}>Events</button><button onClick={() => go("/dashboard")}>Dashboard</button></nav>
      <div className="account-actions"><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></div>
    </header>
    <main className="provider-dashboard-page">
      <section className="provider-dashboard-hero">
        <div>
          <p className="dashboard-kicker"><span /> Provider Dashboard</p>
          <h1>Your home base for referrals, connection, and community care.</h1>
          <p>Build your trusted circle, return to aligned providers, and share the events you are hosting through The Healing Directory.</p>
          <div className="dashboard-hero-actions"><button className="button event-primary" onClick={() => go("/edit-profile")}>Edit Profile</button><button className="button event-secondary" onClick={() => go("/")}>Browse Providers</button><button className="button event-secondary" onClick={() => go("/my-events")}>My Events</button><button className="button event-secondary" onClick={() => go("/add-event")}>Add Event</button></div>
        </div>
        <aside className="dashboard-summary">
          <p>Welcome back</p><h2>{firstName(user.name || user.email)}.</h2>
          <div><span><strong>{payload.counts?.savedProviders || 0}</strong> saved providers</span><span><strong>{payload.counts?.upcomingEvents || 0}</strong> upcoming events</span></div>
        </aside>
      </section>
      <ToolSection eyebrow="Referral Circle" title="Provider tools" text="Find aligned providers, save trusted referral partners, and stay connected to the professional community." items={referralTools} />
      <ToolSection eyebrow="Events + Offerings" title="Workshops, circles, trainings, and community events." text="Browse what is coming up or manage the experiences you are hosting." items={eventTools} />
    </main>
  </div>;
}

function ToolSection({ eyebrow, title, text, items }) {
  return <section className="dashboard-tool-section">
    <p className="eyebrow ink">{eyebrow}</p><h2>{title}</h2><p className="dashboard-tool-intro">{text}</p>
    <div className="dashboard-tool-grid">{items.map((item) => <button key={item.title} className="dashboard-tool-card" onClick={() => go(item.path)}><span className="dashboard-tool-icon">{React.cloneElement(item.icon, { size: 24 })}</span><ArrowRight className="dashboard-tool-arrow" size={24} /><small>{item.eyebrow}</small><strong>{item.title}</strong><p>{item.text}</p></button>)}</div>
  </section>;
}

function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function go(path) { window.location.assign(path); }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
async function api(action) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); const response = await fetch(url, { credentials: "include" }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Request failed."); return payload; }
