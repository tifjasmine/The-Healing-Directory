import React from "react";
import {
  getUser,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  signup,
  updateUser,
} from "@netlify/identity";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleUserRound, Clock, ExternalLink, Eye, Filter, HeartHandshake,
  LayoutDashboard, LockKeyhole, LogIn, LogOut, Mail, MapPin, Menu, Pencil, Phone,
  Plus, RefreshCw, Save, Search, Settings, ShieldCheck, Sparkles, Star, Tag, Users, X
} from "lucide-react";

const API = "/.netlify/functions/app-api";
const EVENT_STATUSES = ["Pending Review", "Approved", "Declined", "Draft", "Cancelled"];

export default function App() {
  const [route, setRoute] = React.useState(readRoute());
  const [user, setUser] = React.useState(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [data, setData] = React.useState({ providers: [], events: [], savedProviderIds: [], savedEventIds: [] });
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);

  const navigate = React.useCallback((path) => {
    window.history.pushState({}, "", path);
    setRoute(readRoute());
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("bootstrap");
      setData({
        providers: payload.providers || [], events: payload.events || [],
        savedProviderIds: payload.savedProviderIds || [], savedEventIds: payload.savedEventIds || []
      });
      if (payload.user) setUser(payload.user);
      setNotice("");
    } catch (error) {
      setNotice(error.message || "The directory could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const pop = () => setRoute(readRoute());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  React.useEffect(() => {
    let live = true;
    async function start() {
      try {
        const callback = await handleAuthCallback();
        if (callback?.type === "recovery") {
          window.history.replaceState({}, "", "/reset-password");
          setRoute(readRoute());
        } else if (callback) {
          window.history.replaceState({}, "", "/dashboard");
          setRoute(readRoute());
        }
      } catch (error) {
        setNotice(error.message || "That account link could not be completed.");
      }
      const current = await getUser();
      if (live) {
        setUser(current ? normalizeUser(current) : null);
        setAuthReady(true);
      }
    }
    start();
    return () => { live = false; };
  }, []);

  React.useEffect(() => { if (authReady) refresh(); }, [authReady, refresh]);

  async function toggleSave(kind, id, nextActive = true) {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const action = kind === "provider" ? "toggle-provider" : "toggle-event";
    const key = kind === "provider" ? "savedProviderIds" : "savedEventIds";
    const idKey = kind === "provider" ? "providerId" : "eventId";
    try {
      await api(action, { method: "POST", body: { [idKey]: id, active: nextActive } });
      setData((current) => ({
        ...current,
        [key]: nextActive ? unique([id, ...current[key]]) : current[key].filter((item) => item !== id)
      }));
    } catch (error) { setNotice(error.message); }
  }

  async function signOut() {
    await logout();
    setUser(null);
    setData((current) => ({ ...current, savedProviderIds: [], savedEventIds: [] }));
    navigate("/");
  }

  const pageProps = { route, navigate, user, data, loading, notice, setNotice, refresh, toggleSave, setUser };

  return (
    <div className="app-shell">
      <SiteHeader user={user} navigate={navigate} onLogout={signOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {notice ? <div className="global-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div> : null}
      <Page {...pageProps} />
      <SiteFooter navigate={navigate} />
    </div>
  );
}

function Page(props) {
  const path = props.route.path;
  if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return <AuthPage {...props} mode={path.slice(1)} />;
  if (path === "/provider-details") return <ProviderDetails {...props} />;
  if (path === "/events") return <EventsPage {...props} />;
  if (path === "/event-details") return <EventDetails {...props} />;
  if (path === "/my-events") return <RequireAuth {...props}><MyEvents {...props} /></RequireAuth>;
  if (path === "/saved-providers") return <RequireAuth {...props}><SavedProviders {...props} /></RequireAuth>;
  if (path === "/dashboard" || path === "/client-dashboard" || path === "/provider-dashboard") return <RequireAuth {...props}><Dashboard {...props} /></RequireAuth>;
  if (path === "/add-event") return <RequireAuth {...props}><EventForm {...props} /></RequireAuth>;
  if (path === "/edit-event") return <RequireAuth {...props}><EventForm {...props} editing /></RequireAuth>;
  if (path === "/admin/events") return <RequireAdmin {...props}><AdminEvents {...props} /></RequireAdmin>;
  if (path === "/referral-room" || path === "/referral-room-admin" || path === "/referral-room-manager" || path === "/provider-connections") return <RequireAuth {...props}><ComingNext {...props} /></RequireAuth>;
  if (path === "/terms" || path === "/privacy") return <LegalPage {...props} />;
  return <DirectoryPage {...props} />;
}

function SiteHeader({ user, navigate, onLogout, menuOpen, setMenuOpen }) {
  const admin = user?.roles?.includes("admin");
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("/")}>
        <img src="/healing-directory-logo.svg" alt="" />
        <span><strong>The Healing Directory</strong><small>Relationship-based care</small></span>
      </button>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "site-nav open" : "site-nav"}>
        <button onClick={() => navigate("/")}>Providers</button>
        <button onClick={() => navigate("/events")}>Events</button>
        {user ? <button onClick={() => navigate("/dashboard")}>Dashboard</button> : null}
        {user ? <button onClick={() => navigate("/my-events")}>My Events</button> : null}
        {admin ? <button onClick={() => navigate("/admin/events")}><ShieldCheck size={15} /> Admin</button> : null}
      </nav>
      <div className="account-actions">
        {user ? (
          <><button className="account-chip" onClick={() => navigate("/dashboard")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button" onClick={onLogout} title="Log out"><LogOut size={18} /></button></>
        ) : <button className="button compact" onClick={() => navigate("/login")}><LogIn size={16} /> Log in</button>}
      </div>
    </header>
  );
}

function SiteFooter({ navigate }) {
  return <footer className="site-footer"><div><strong>The Healing Directory</strong><p>Thoughtful connections for healing, wellness, and trusted referrals.</p></div><nav><button onClick={() => navigate("/")}>Directory</button><button onClick={() => navigate("/events")}>Events</button><button onClick={() => navigate("/terms")}>Terms</button><button onClick={() => navigate("/privacy")}>Privacy</button></nav></footer>;
}

function DirectoryPage({ data, loading, navigate, toggleSave }) {
  const [query, setQuery] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [type, setType] = React.useState("");
  const types = unique(data.providers.flatMap((item) => item.providerType || [])).sort();
  const providers = data.providers.filter((item) => {
    const haystack = [item.name, item.profession, item.bio, ...(item.providerType || []), ...(item.services || []), ...(item.support || []), ...(item.location || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (!verified || item.verified) && (!type || item.providerType?.includes(type));
  });

  return <main>
    <section className="directory-intro page-band dark-band">
      <div className="band-inner intro-grid">
        <div><p className="eyebrow">The Healing Directory</p><h1>Find support that feels human.</h1><p className="lede">Explore a curated network of therapists, body-based practitioners, educators, and wellness professionals.</p></div>
        <div className="trust-panel"><CheckCircle2 size={24} /><strong>Verified Member</strong><p>A relationship signal from participation in our referral community, not a guarantee of fit or outcomes.</p></div>
      </div>
      <div className="band-inner search-panel">
        <label className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, specialty, concern, or location" /></label>
        <label className="select-control"><Filter size={17} /><select value={type} onChange={(e) => setType(e.target.value)}><option value="">All provider types</option>{types.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={16} /></label>
        <label className="check-control"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /><CheckCircle2 size={16} /> Verified only</label>
      </div>
    </section>
    <section className="content-shell">
      <div className="section-heading"><div><p className="eyebrow ink">Provider directory</p><h2>{providers.length} thoughtful connection{providers.length === 1 ? "" : "s"}</h2></div><button className="button secondary" onClick={() => navigate("/signup")}><Plus size={16} /> Join as a provider</button></div>
      {loading ? <LoadingState label="Loading providers" /> : providers.length ? <div className="provider-list">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} saved={data.savedProviderIds.includes(provider.id)} onSave={() => toggleSave("provider", provider.id, !data.savedProviderIds.includes(provider.id))} onOpen={() => navigate(`/provider-details?id=${provider.id}`)} />)}</div> : <EmptyState title="No providers match that search" text="Try a broader phrase or clear one of the filters." />}
    </section>
  </main>;
}

function ProviderCard({ provider, saved, onSave, onOpen }) {
  return <article className="provider-row">
    <Avatar item={provider} />
    <div className="provider-copy"><div className="title-line"><button className="text-link title-link" onClick={onOpen}>{provider.name}</button>{provider.verified ? <span className="status good"><Check size={12} /> Verified</span> : null}</div><p className="profession">{provider.profession || provider.providerType?.join(", ")}</p>{provider.location?.length ? <p className="meta"><MapPin size={14} /> {provider.location.join(", ")}</p> : null}<p className="summary">{truncate(provider.bio, 210) || "View this provider's profile, approach, services, and contact options."}</p><div className="tag-row">{[...(provider.providerType || []), ...(provider.support || [])].slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
    <div className="row-actions"><button className={saved ? "icon-button saved" : "icon-button"} onClick={onSave} title={saved ? "Remove saved provider" : "Save provider"}>{saved ? <BookmarkCheck /> : <Bookmark />}</button><button className="button" onClick={onOpen}>View profile <ArrowRight size={15} /></button>{provider.email ? <a className="button tertiary" href={`mailto:${provider.email}`}><Mail size={15} /> Email</a> : null}</div>
  </article>;
}

function ProviderDetails({ route, data, loading, navigate, toggleSave }) {
  const id = route.query.get("id") || route.query.get("recordId");
  const [remote, setRemote] = React.useState(null);
  const provider = data.providers.find((item) => item.id === id) || remote;
  React.useEffect(() => { if (id && !provider) api("provider", { query: { id } }).then((p) => setRemote(p.provider)).catch(() => {}); }, [id]);
  if (loading && !provider) return <LoadingState label="Loading provider profile" />;
  if (!provider) return <EmptyState title="Provider not found" text="This profile may be unavailable or awaiting approval." action="Back to directory" onAction={() => navigate("/")} />;
  const saved = data.savedProviderIds.includes(provider.id);
  return <main className="detail-page"><section className="profile-band page-band"><div className="band-inner"><button className="back-link" onClick={() => navigate("/")}><ArrowLeft size={16} /> Directory</button><div className="profile-hero"><Avatar item={provider} large /><div><div className="title-line"><h1>{provider.name}</h1>{provider.verified ? <span className="status good"><Check size={12} /> Verified</span> : null}</div><p className="profile-title">{provider.profession || provider.providerType?.join(", ")}</p><div className="meta-row">{provider.location?.length ? <span><MapPin size={15} />{provider.location.join(", ")}</span> : null}{provider.pronouns ? <span><CircleUserRound size={15} />{provider.pronouns}</span> : null}</div><div className="action-row"><button className="button" onClick={() => toggleSave("provider", provider.id, !saved)}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{saved ? "Saved" : "Save provider"}</button>{provider.consultationLink ? <a className="button secondary" href={toHref(provider.consultationLink)} target="_blank" rel="noreferrer">Book a consultation <ExternalLink size={15} /></a> : null}</div></div></div></div></section>
    <section className="content-shell detail-grid"><div className="detail-main"><ContentSection kicker="About" title="Meet the provider"><p>{provider.bio || "Profile details are being completed."}</p></ContentSection>{provider.humanSide ? <ContentSection kicker="The human side" title="Beyond the credentials"><p>{provider.humanSide}</p></ContentSection> : null}<ContentSection kicker="Care focus" title="Services and specialties"><TagGroup values={[...(provider.providerType || []), ...(provider.services || []), ...(provider.support || []), ...(provider.populations || [])]} /></ContentSection>{provider.collaboration ? <ContentSection kicker="Provider connections" title="Collaboration and referrals"><p>{provider.collaboration}</p></ContentSection> : null}</div><aside className="contact-panel"><p className="eyebrow ink">Connect</p><h2>Contact details</h2>{provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span><small>Email</small>{provider.email}</span></a> : null}{provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span><small>Phone</small>{provider.phone}</span></a> : null}{provider.website ? <a href={toHref(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span><small>Website</small>{provider.website}</span></a> : null}</aside></section>
  </main>;
}

function EventsPage({ data, loading, navigate, toggleSave }) {
  const [tab, setTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const categories = unique(data.events.map((e) => e.category)).filter(Boolean).sort();
  const events = data.events.filter((event) => {
    const saved = data.savedEventIds.includes(event.id);
    const audience = lower(event.audience);
    const tabMatch = tab === "all" || (tab === "saved" && saved) || (tab === "community" && !audience.includes("provider")) || (tab === "provider" && audience.includes("provider"));
    const text = [event.name, event.description, event.category, event.eventType, event.hostName].join(" ").toLowerCase();
    return tabMatch && (!query || text.includes(query.toLowerCase())) && (!category || event.category === category);
  }).sort((a, b) => dateValue(a.start) - dateValue(b.start));
  return <main><section className="page-band events-band"><div className="band-inner"><p className="eyebrow">Events and gatherings</p><h1>Come learn, connect, and heal.</h1><p className="lede">Community workshops and provider gatherings from The Healing Directory network.</p><div className="action-row"><button className="button light" onClick={() => navigate("/add-event")}><Plus size={16} /> Add an event</button><button className="button outline-light" onClick={() => navigate("/my-events")}>My events</button></div></div></section><section className="content-shell"><div className="toolbar"><div className="segmented">{["all", "community", "provider", "saved"].map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{key === "provider" ? <LockKeyhole size={14} /> : key === "saved" ? <Bookmark size={14} /> : <Users size={14} />}{capitalize(key)}</button>)}</div><label className="search-control pale"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" /></label><select className="plain-select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></div>{loading ? <LoadingState label="Loading events" /> : events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} saved={data.savedEventIds.includes(event.id)} onSave={() => toggleSave("event", event.id, !data.savedEventIds.includes(event.id))} onOpen={() => navigate(`/event-details?id=${event.id}`)} />)}</div> : <EmptyState title="No events in this view" text="Try another audience tab or clear your search." />}</section></main>;
}

function EventCard({ event, saved, onSave, onOpen, editable }) {
  return <article className="event-card"><div className="event-image">{event.image ? <img src={event.image} alt="" /> : <CalendarDays size={36} />}{event.audience ? <span className="image-label">{event.audience}</span> : null}</div><div className="event-body"><div className="title-line"><p className="eyebrow ink">{event.category || event.eventType || "Event"}</p><span className={`status ${statusTone(event.status)}`}>{event.status}</span></div><h3>{event.name}</h3><p className="meta"><CalendarDays size={14} />{formatDate(event.start)}</p><p className="meta"><Clock size={14} />{formatTimeRange(event.start, event.end)}</p><p>{truncate(event.description, 150)}</p><div className="card-footer"><button className="button" onClick={onOpen}>View details</button>{editable ? <button className="button tertiary" onClick={editable}><Pencil size={15} /> Edit</button> : <button className={saved ? "icon-button saved" : "icon-button"} onClick={onSave}>{saved ? <BookmarkCheck /> : <Bookmark />}</button>}</div></div></article>;
}

function EventDetails({ route, data, loading, navigate, toggleSave }) {
  const id = route.query.get("id") || route.query.get("recordId");
  const [remote, setRemote] = React.useState(null);
  const event = data.events.find((item) => item.id === id) || remote;
  React.useEffect(() => { if (id && !event) api("event", { query: { id } }).then((p) => setRemote(p.event)).catch(() => {}); }, [id]);
  if (loading && !event) return <LoadingState label="Loading event" />;
  if (!event) return <EmptyState title="Event not found" text="This event may be awaiting approval or no longer available." action="Browse events" onAction={() => navigate("/events")} />;
  const saved = data.savedEventIds.includes(event.id);
  return <main className="detail-page"><section className="event-detail-hero"><div className="event-detail-image">{event.image ? <img src={event.image} alt="" /> : <CalendarDays size={64} />}</div><div className="event-detail-copy"><button className="back-link" onClick={() => navigate("/events")}><ArrowLeft size={16} /> Events</button><div className="tag-row"><span>{event.audience || "Community"}</span><span>{event.category || event.eventType}</span></div><h1>{event.name}</h1><div className="detail-facts"><span><CalendarDays />{formatDate(event.start)}</span><span><Clock />{formatTimeRange(event.start, event.end)}</span>{event.hostName ? <span><CircleUserRound />{event.hostName}</span> : null}</div><div className="action-row">{event.registration ? <a className="button" href={toHref(event.registration)} target="_blank" rel="noreferrer">Register <ExternalLink size={15} /></a> : null}<button className="button secondary" onClick={() => toggleSave("event", event.id, !saved)}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{saved ? "Saved" : "Save event"}</button></div></div></section><section className="content-shell detail-grid"><ContentSection kicker="About this event" title="What to expect"><p>{event.description || "More details are coming soon."}</p></ContentSection><aside className="contact-panel"><p className="eyebrow ink">Quick info</p><h2>Event details</h2><InfoLine icon={<CalendarDays />} label="Date" value={formatDate(event.start)} /><InfoLine icon={<Clock />} label="Time" value={formatTimeRange(event.start, event.end)} /><InfoLine icon={<MapPin />} label="Location" value={event.locationType || event.address} />{event.address ? <a href={toHref(event.address)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span><small>Open link</small>{event.address}</span></a> : null}</aside></section></main>;
}

function MyEvents({ navigate }) {
  const [tab, setTab] = React.useState("hosted");
  const [payload, setPayload] = React.useState({ hosted: [], saved: [] });
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(() => { setLoading(true); api("my-events").then(setPayload).finally(() => setLoading(false)); }, []);
  React.useEffect(load, [load]);
  const events = payload[tab] || [];
  return <main><PageTitle eyebrow="My Events" title="Your events, one calm workspace." text="Manage events you host and return to the events you saved." actions={<button className="button" onClick={() => navigate("/add-event")}><Plus size={16} /> Add event</button>} /><section className="content-shell"><div className="segmented wide"><button className={tab === "hosted" ? "active" : ""} onClick={() => setTab("hosted")}><Sparkles size={15} />Hosted <span>{payload.hosted.length}</span></button><button className={tab === "saved" ? "active" : ""} onClick={() => setTab("saved")}><Bookmark size={15} />Saved <span>{payload.saved.length}</span></button></div>{loading ? <LoadingState label="Loading your events" /> : events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} onOpen={() => navigate(`/event-details?id=${event.id}`)} editable={tab === "hosted" ? () => navigate(`/edit-event?id=${event.id}`) : null} />)}</div> : <EmptyState title={tab === "hosted" ? "No hosted events yet" : "No saved events yet"} text={tab === "hosted" ? "Create your first listing when you are ready." : "Save events from the Events page and they will appear here."} action={tab === "hosted" ? "Add an event" : "Browse events"} onAction={() => navigate(tab === "hosted" ? "/add-event" : "/events")} />}</section></main>;
}

function SavedProviders({ navigate, toggleSave }) {
  const [items, setItems] = React.useState([]);
  const [tab, setTab] = React.useState("active");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => { api("saved-providers").then((p) => setItems(p.items || [])).finally(() => setLoading(false)); }, []);
  const shown = items.filter((item) => (tab === "all" || (tab === "active" ? item.active : !item.active)) && (!query || [item.provider.name, item.provider.email, item.notes].join(" ").toLowerCase().includes(query.toLowerCase())));
  return <main><PageTitle eyebrow="Saved Providers" title="Your trusted circle." text="A private working list for referrals, collaboration, and thoughtful follow-up." /><section className="content-shell"><div className="toolbar"><div className="segmented"><button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active</button><button className={tab === "inactive" ? "active" : ""} onClick={() => setTab("inactive")}>Inactive</button><button className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All</button></div><label className="search-control pale"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, email, or notes" /></label></div>{loading ? <LoadingState label="Loading saved providers" /> : shown.length ? <div className="provider-list">{shown.map((item) => <ProviderCard key={item.id} provider={item.provider} saved={item.active} onSave={async () => { await toggleSave("provider", item.provider.id, !item.active); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry)); }} onOpen={() => navigate(`/provider-details?id=${item.provider.id}`)} />)}</div> : <EmptyState title="No saved providers in this view" text="Browse the directory and bookmark people you want to revisit." action="Browse providers" onAction={() => navigate("/")} />}</section></main>;
}

function Dashboard({ user, navigate }) {
  const [payload, setPayload] = React.useState(null);
  React.useEffect(() => { api("dashboard").then(setPayload).catch(() => setPayload({ counts: {}, savedProviders: [], savedEvents: [] })); }, []);
  const provider = user?.roles?.includes("provider") || user?.userMetadata?.account_type === "provider";
  return <main><PageTitle eyebrow={provider ? "Provider Dashboard" : "Client Dashboard"} title={`Welcome back, ${firstName(user?.name || user?.email)}.`} text={provider ? "Manage your profile, hosted events, referral relationships, and professional community." : "Your saved support, upcoming events, and provider shortlist live here."} /><section className="content-shell">{!payload ? <LoadingState label="Loading dashboard" /> : <><div className="stats-grid"><Stat label="Saved providers" value={payload.counts?.savedProviders || 0} icon={<HeartHandshake />} /><Stat label="Saved events" value={payload.counts?.savedEvents || 0} icon={<Bookmark />} /><Stat label="Upcoming events" value={payload.counts?.upcomingEvents || 0} icon={<CalendarDays />} /></div><div className="dashboard-grid"><DashboardAction icon={<Users />} title="Saved Providers" text="Return to your private referral and care shortlist." onClick={() => navigate("/saved-providers")} /><DashboardAction icon={<CalendarDays />} title="My Events" text="Hosted and saved events in one place." onClick={() => navigate("/my-events")} />{provider ? <><DashboardAction icon={<Plus />} title="Add an Event" text="Submit a new event for review." onClick={() => navigate("/add-event")} /><DashboardAction icon={<HeartHandshake />} title="Referral Room" text="Request a seat and view your RSVPs." onClick={() => navigate("/referral-room")} /></> : <DashboardAction icon={<Search />} title="Browse Directory" text="Find support by specialty, concern, and location." onClick={() => navigate("/")} />}{user?.roles?.includes("admin") ? <DashboardAction icon={<ShieldCheck />} title="Event Approvals" text="Review and publish event submissions." onClick={() => navigate("/admin/events")} /> : null}</div></>}</section></main>;
}

function EventForm({ route, editing, navigate, setNotice, refresh }) {
  const recordId = route.query.get("id") || route.query.get("recordId");
  const [form, setForm] = React.useState({ eventName: "", category: "", eventAudience: "Community", eventType: "Workshop", date: "", endTime: "", locationType: "Virtual", addressLink: "", registrationLink: "", description: "" });
  const [loading, setLoading] = React.useState(Boolean(editing));
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (editing && recordId) api("event", { query: { id: recordId } }).then(({ event }) => setForm({ eventName: event.name, category: event.category, eventAudience: event.audience, eventType: event.eventType, date: localDate(event.start), endTime: localDate(event.end), locationType: event.locationType, addressLink: event.address, registrationLink: event.registration, description: event.description })).finally(() => setLoading(false)); }, [editing, recordId]);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event) { event.preventDefault(); setSaving(true); try { const result = await api("save-event", { method: "POST", body: { ...form, recordId: editing ? recordId : "" } }); setNotice("Your event was saved and moved to Pending Review."); await refresh(); navigate(`/event-details?id=${result.event.id}`); } catch (error) { setNotice(error.message); } finally { setSaving(false); } }
  if (loading) return <LoadingState label="Loading event editor" />;
  return <main><PageTitle eyebrow={editing ? "Edit Event" : "Add Event"} title={editing ? "Update your event listing." : "Create an event listing."} text="Submitted changes return to Pending Review before they appear publicly." /><section className="content-shell narrow"><form className="editor-form" onSubmit={submit}><FormSection number="01" title="Basic information"><Field label="Event name" value={form.eventName} onChange={change("eventName")} required /><Field label="Category" value={form.category} onChange={change("category")} placeholder="Wellness, therapy, community..." required /><SelectField label="Audience" value={form.eventAudience} onChange={change("eventAudience")} options={["Community", "For Providers"]} /><SelectField label="Event type" value={form.eventType} onChange={change("eventType")} options={["Workshop", "Circle", "Training", "Referral Room", "Retreat", "Other"]} /></FormSection><FormSection number="02" title="Time and place"><Field label="Start date and time" type="datetime-local" value={form.date} onChange={change("date")} required /><Field label="End date and time" type="datetime-local" value={form.endTime} onChange={change("endTime")} required /><SelectField label="Location type" value={form.locationType} onChange={change("locationType")} options={["Virtual", "In Person", "Hybrid"]} /><Field label="Address or meeting link" value={form.addressLink} onChange={change("addressLink")} /><Field label="Registration link" value={form.registrationLink} onChange={change("registrationLink")} /></FormSection><FormSection number="03" title="Description" single><Field label="What should attendees know?" value={form.description} onChange={change("description")} textarea required /></FormSection><div className="form-actions"><button type="button" className="button tertiary" onClick={() => navigate("/my-events")}>Cancel</button><button className="button" disabled={saving}>{saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}{saving ? "Saving" : "Save event"}</button></div></form></section></main>;
}

function AdminEvents({ navigate, setNotice }) {
  const [payload, setPayload] = React.useState({ events: [], counts: {} });
  const [filter, setFilter] = React.useState("pending");
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const load = React.useCallback(() => { setLoading(true); api("admin-events").then(setPayload).catch((e) => setNotice(e.message)).finally(() => setLoading(false)); }, []);
  React.useEffect(load, [load]);
  async function setStatus(event, status) { try { await api("admin-event", { method: "POST", body: { recordId: event.id, status } }); setNotice(`${event.name} is now ${status}.`); load(); } catch (error) { setNotice(error.message); } }
  const shown = payload.events.filter((event) => (filter === "all" || statusGroup(event.status) === filter) && (!query || [event.name, event.hostEmail, event.category].join(" ").toLowerCase().includes(query.toLowerCase())));
  return <main><PageTitle eyebrow="Administration" title="Event review queue." text="Review submissions, publish approved listings, or return an event to its host for changes." /><section className="content-shell"><div className="stats-grid compact-stats"><Stat label="Total" value={payload.counts.total || 0} icon={<CalendarDays />} /><Stat label="Pending" value={payload.counts.pending || 0} icon={<Clock />} /><Stat label="Approved" value={payload.counts.approved || 0} icon={<CheckCircle2 />} /><Stat label="Declined" value={payload.counts.declined || 0} icon={<X />} /></div><div className="toolbar"><div className="segmented">{["pending", "approved", "declined", "all"].map((key) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{capitalize(key)}</button>)}</div><label className="search-control pale"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, host, category" /></label></div>{loading ? <LoadingState label="Loading event queue" /> : shown.length ? <div className="admin-list">{shown.map((event) => <article className="admin-row" key={event.id}><div><div className="title-line"><h3>{event.name}</h3><span className={`status ${statusTone(event.status)}`}>{event.status}</span></div><p className="meta"><Mail size={14} />{event.hostEmail || "No host email"}</p><p className="meta"><CalendarDays size={14} />{formatDate(event.start)} · {event.category || event.eventType}</p><p>{truncate(event.description, 180)}</p></div><div className="admin-actions"><button className="icon-button" onClick={() => navigate(`/event-details?id=${event.id}`)} title="Preview"><Eye /></button><button className="button success" onClick={() => setStatus(event, "Approved")}><Check size={15} /> Approve</button><button className="button tertiary" onClick={() => setStatus(event, "Pending Review")}><Clock size={15} /> Pending</button><button className="button danger" onClick={() => setStatus(event, "Declined")}><X size={15} /> Decline</button></div></article>)}</div> : <EmptyState title="The queue is clear" text="No events match this status and search." />}</section></main>;
}

function AuthPage({ mode, navigate, setUser, setNotice }) {
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "", accountType: "client" });
  const [busy, setBusy] = React.useState(false);
  const title = mode === "signup" ? "Create your account" : mode === "forgot-password" ? "Reset your password" : mode === "reset-password" ? "Choose a new password" : "Welcome back";
  async function submit(event) { event.preventDefault(); setBusy(true); try {
    if (mode === "signup") { if (form.password !== form.confirm) throw new Error("Passwords do not match."); const result = await signup(form.email, form.password, { full_name: form.name, account_type: form.accountType }); setNotice(result.confirmedAt ? "Your account is ready." : "Check your email to confirm your account."); const current = await getUser(); if (current) { setUser(normalizeUser(current)); navigate("/dashboard"); } else navigate("/login"); }
    else if (mode === "forgot-password") { await requestPasswordRecovery(form.email); setNotice("Check your email for a secure password reset link."); navigate("/login"); }
    else if (mode === "reset-password") { if (form.password !== form.confirm) throw new Error("Passwords do not match."); const current = await updateUser({ password: form.password }); setUser(normalizeUser(current)); setNotice("Your password has been updated."); navigate("/dashboard"); }
    else { const current = await login(form.email, form.password); setUser(normalizeUser(current)); const next = new URLSearchParams(window.location.search).get("next") || "/dashboard"; navigate(next); }
  } catch (error) { setNotice(error.message || "Authentication could not be completed."); } finally { setBusy(false); } }
  return <main className="auth-page"><section className="auth-scene"><div className="auth-copy"><img src="/healing-directory-logo.svg" alt="The Healing Directory" /><p className="eyebrow">A place to return to</p><h1>Care, connection, and community.</h1><p>Save trusted providers, manage events, and participate in the relationship-based referral network.</p></div><form className="auth-form" onSubmit={submit}><p className="eyebrow ink">Account access</p><h2>{title}</h2>{mode === "signup" ? <><Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><SelectField label="I am joining as" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} options={[{ value: "client", label: "Community member / client" }, { value: "provider", label: "Provider" }]} /></> : null}{mode !== "reset-password" ? <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /> : null}{!mode.includes("forgot") ? <Field label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /> : null}{mode === "signup" || mode === "reset-password" ? <Field label="Confirm password" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required /> : null}<button className="button full" disabled={busy}>{busy ? "Working..." : mode === "signup" ? "Create account" : mode.includes("password") ? "Continue" : "Log in"}</button><div className="auth-links">{mode === "login" ? <><button type="button" onClick={() => navigate("/forgot-password")}>Forgot password?</button><button type="button" onClick={() => navigate("/signup")}>Create an account</button></> : <button type="button" onClick={() => navigate("/login")}>Back to login</button>}</div></form></section></main>;
}

function LegalPage({ route }) { const privacy = route.path === "/privacy"; return <main><PageTitle eyebrow="The Healing Directory" title={privacy ? "Privacy Policy" : "Terms and Conditions"} text={privacy ? "How account, directory, event, and communication data is handled." : "The expectations that keep this directory useful, respectful, and transparent."} /><section className="content-shell narrow legal-copy"><h2>{privacy ? "Your privacy" : "Using this directory"}</h2><p>{privacy ? "We collect the information needed to operate accounts, saved lists, provider profiles, event listings, and Referral Room participation. Private account information is not displayed publicly unless you intentionally publish it in a provider or event listing." : "The Healing Directory is a connection and discovery platform. Listings, verification markers, and Referral Room participation do not guarantee availability, suitability, credentials, outcomes, or a therapeutic relationship."}</p><h3>Account responsibility</h3><p>Keep your login secure and provide accurate information. Providers are responsible for maintaining their own professional licenses, insurance, scope of practice, and listing details.</p><h3>Respectful use</h3><p>Do not scrape, resell, harass, impersonate, or misuse provider and member information. Administrative access may be suspended when use threatens the safety or integrity of the community.</p><h3>Questions</h3><p>Contact jointhehealingdirectory@gmail.com with privacy, account, or policy questions.</p></section></main>; }

function ComingNext({ route }) { const names = { "/referral-room": "Referral Room Dates", "/referral-room-admin": "Referral Room Admin", "/referral-room-manager": "Referral Room Manager", "/provider-connections": "Provider Connections" }; return <main><PageTitle eyebrow="Authenticated workspace" title={names[route.path] || "Coming next"} text="This workflow is being connected to the new shared Airtable and authentication foundation." /><section className="content-shell"><div className="progress-panel"><Sparkles size={28} /><h2>The foundation is ready.</h2><p>This area is the next build slice: live sessions, seat rules, RSVPs, manager decisions, attendance, verification, and provider connections.</p></div></section></main>; }

function RequireAuth({ user, navigate, children }) { React.useEffect(() => { if (!user) navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); }, [user]); return user ? children : <LoadingState label="Checking account" />; }
function RequireAdmin({ user, navigate, children }) { React.useEffect(() => { if (!user) navigate("/login?next=/admin/events"); else if (!user.roles?.includes("admin")) navigate("/dashboard"); }, [user]); return user?.roles?.includes("admin") ? children : <LoadingState label="Checking administrator access" />; }

function PageTitle({ eyebrow, title, text, actions }) { return <section className="page-title"><div className="content-shell title-inner"><div><p className="eyebrow ink">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{actions ? <div>{actions}</div> : null}</div></section>; }
function ContentSection({ kicker, title, children }) { return <section className="content-section"><p className="eyebrow ink">{kicker}</p><h2>{title}</h2>{children}</section>; }
function InfoLine({ icon, label, value }) { if (!value) return null; return <div className="info-line">{React.cloneElement(icon, { size: 17 })}<span><small>{label}</small>{value}</span></div>; }
function Avatar({ item, large }) { return <div className={large ? "avatar large" : "avatar"}>{item.photo ? <img src={item.photo} alt="" /> : <span>{initials(item.name)}</span>}</div>; }
function TagGroup({ values }) { return <div className="tag-row large-tags">{unique(values.filter(Boolean)).map((value) => <span key={value}>{value}</span>)}</div>; }
function Stat({ label, value, icon }) { return <div className="stat"><span className="stat-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function DashboardAction({ icon, title, text, onClick }) { return <button className="dashboard-action" onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><p>{text}</p></div><ArrowRight size={18} /></button>; }
function LoadingState({ label }) { return <div className="state"><RefreshCw className="spin" /><h2>{label}...</h2></div>; }
function EmptyState({ title, text, action, onAction }) { return <div className="state"><Sparkles /><h2>{title}</h2><p>{text}</p>{action ? <button className="button" onClick={onAction}>{action}</button> : null}</div>; }
function FormSection({ number, title, children, single }) { return <fieldset className={single ? "form-section single" : "form-section"}><legend><span>{number}</span><strong>{title}</strong></legend><div className="form-grid">{children}</div></fieldset>; }
function Field({ label, textarea, ...props }) { return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="7" {...props} /> : <input {...props} />}</label>; }
function SelectField({ label, options, ...props }) { return <label className="field"><span>{label}</span><select {...props}>{options.map((option) => typeof option === "string" ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
function readRoute() { return { path: window.location.pathname.replace(/\/$/, "") || "/", query: new URLSearchParams(window.location.search) }; }
function normalizeUser(user) { return { id: user.id, email: user.email || "", name: user.name || user.userMetadata?.full_name || "", roles: user.roles || [], userMetadata: user.userMetadata || {} }; }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function lower(value) { return String(value || "").trim().toLowerCase(); }
function capitalize(value) { return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function firstName(value) { return String(value || "there").split(/[ @._-]/).filter(Boolean)[0] || "there"; }
function initials(value) { const parts = String(value || "TH").split(/\s+/).filter(Boolean); return (parts[0]?.[0] + (parts.length > 1 ? parts.at(-1)?.[0] : parts[0]?.[1] || "")).toUpperCase(); }
function truncate(value, max = 160) { const text = String(value || "").replace(/\s+/g, " ").trim(); return text.length > max ? `${text.slice(0, max - 1)}...` : text; }
function toHref(value) { const text = String(value || "").trim(); if (!text) return "#"; if (/^(https?:|mailto:|tel:)/i.test(text)) return text; return `https://${text}`; }
function dateValue(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) ? 0 : time; }
function formatDate(value) { const time = dateValue(value); return time ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }).format(time) : "Date TBA"; }
function formatTime(value) { const time = dateValue(value); return time ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(time) : ""; }
function formatTimeRange(start, end) { return [formatTime(start), formatTime(end)].filter(Boolean).join(" - ") || "Time TBA"; }
function localDate(value) { const time = dateValue(value); if (!time) return ""; const date = new Date(time); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function statusGroup(value) { const status = lower(value); if (status.includes("approved") || status.includes("published")) return "approved"; if (status.includes("declined") || status.includes("rejected")) return "declined"; return "pending"; }
function statusTone(value) { const status = statusGroup(value); return status === "approved" ? "good" : status === "declined" ? "bad" : "warm"; }
