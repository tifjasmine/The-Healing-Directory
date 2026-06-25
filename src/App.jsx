import React from "react";
import {
  getAccessToken,
  getUser,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  signup,
  updateUser,
} from "./authClient.js";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CalendarDays, Check, CheckCircle2,
  ChevronDown, CircleUserRound, Clock, ExternalLink, Eye, Filter, HeartHandshake,
  LayoutDashboard, LockKeyhole, LogIn, LogOut, Mail, MapPin, Menu, Pencil, Phone,
  Plus, RefreshCw, Save, Search, Settings, ShieldCheck, Sparkles, Star, Tag, Users, X
} from "lucide-react";
import AccountSettings from "./AccountSettings.jsx";
import MembershipPage from "./MembershipPage.jsx";
import EditProfilePage from "./EditProfilePage.jsx";
import PwaInstallButton from "./PwaInstallButton.jsx";
import ProviderDashboard from "./ProviderDashboard.jsx";
import ClientDashboard from "./ClientDashboard.jsx";
import ReferralRoomProviderPage from "./ReferralRoomProviderPage.jsx";
import PublicShowcase from "./PublicShowcase.jsx";

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

  const hydrateAuth = React.useCallback(async () => {
    try {
      const current = await getUser();
      const nextUser = current ? normalizeUser(current) : null;
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      setUser(null);
      return null;
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
      await hydrateAuth();
      if (live) {
        setAuthReady(true);
      }
    }
    start();
    return () => { live = false; };
  }, [hydrateAuth]);

  React.useEffect(() => { if (authReady) refresh(); }, [authReady, refresh]);

  React.useEffect(() => {
    const refreshSession = () => void hydrateAuth();
    window.addEventListener("focus", refreshSession);
    window.addEventListener("visibilitychange", refreshSession);
    return () => {
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("visibilitychange", refreshSession);
    };
  }, [hydrateAuth]);

  async function toggleSave(kind, id, nextActive = true) {
    const userIsReady = user || (await hydrateAuth());
    if (!userIsReady) {
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

  if (["/", "/index.html", "/providers", "/provider-details", "/events", "/event-details"].includes(route.path)) {
    return <PublicShowcase path={route.path === "/index.html" ? "/" : route.path} />;
  }

  const pageProps = { route, navigate, user, authReady, data, loading, notice, setNotice, refresh, toggleSave, setUser };

  return (
    <div className="app-shell">
      <SiteHeader route={route} user={user} authReady={authReady} navigate={navigate} onLogout={signOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      {notice ? <div className={notice.startsWith("Request received") || notice.includes("was received") ? "global-notice success" : "global-notice"}><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div> : null}
      <Page {...pageProps} />
      <SiteFooter navigate={navigate} />
    </div>
  );
}

function Page(props) {
  const path = props.route.path;
  if (path === "/providers") return <DirectoryPage {...props} />;
  if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return <AuthPage {...props} mode={path.slice(1)} />;
  if (path === "/provider-details") return <ProviderDetails {...props} />;
  if (path === "/events") return <EventsPage {...props} />;
  if (path === "/event-details") return <EventDetails {...props} />;
  if (path === "/my-events") return <RequireAuth {...props}><MyEvents {...props} /></RequireAuth>;
  if (path === "/saved-providers") return <RequireAuth {...props}><SavedProviders {...props} /></RequireAuth>;
  if (path === "/account-settings") return <RequireAuth {...props}><AccountSettings {...props} /></RequireAuth>;
  if (path === "/membership" || path === "/edit-membership") return <RequireAuth {...props}><MembershipPage {...props} /></RequireAuth>;
  if (path === "/edit-profile") return <RequireAuth {...props}><EditProfilePage {...props} /></RequireAuth>;
  if (path === "/client-dashboard") return <RequireAuth {...props}><ClientDashboard {...props} hideHeader /></RequireAuth>;
  if (path === "/dashboard" || path === "/provider-dashboard") return <RequireAuth {...props}><ProviderDashboard {...props} hideHeader /></RequireAuth>;
  if (path === "/add-event") return <RequireAuth {...props}><EventForm {...props} /></RequireAuth>;
  if (path === "/edit-event") return <RequireAuth {...props}><EventForm {...props} editing /></RequireAuth>;
  if (path === "/admin/events") return <RequireAdmin {...props}><AdminEvents {...props} /></RequireAdmin>;
  if (path === "/referral-room") return <RequireAuth {...props}><ReferralRoomProviderPage {...props} /></RequireAuth>;
  if (path === "/referral-room-admin" || path === "/referral-room-manager" || path === "/provider-connections") return <RequireAuth {...props}><ComingNext {...props} /></RequireAuth>;
  if (path === "/terms" || path === "/privacy") return <LegalPage {...props} />;
  return <DirectoryPage {...props} />;
}

function SiteHeader({ route, user, authReady, navigate, onLogout, menuOpen, setMenuOpen }) {
  const [signupOpen, setSignupOpen] = React.useState(false);
  const headerRef = React.useRef(null);
  const signupMenuRef = React.useRef(null);
  const admin = user?.roles?.includes("admin");
  const dashboardPath = user ? defaultDashboardPath(user) : "";
  const warm = ["/events", "/event-details", "/provider-details", "/add-event", "/edit-event"].includes(route.path);
  React.useEffect(() => {
    if (!menuOpen && !signupOpen) return undefined;

    function closeHeaderMenus(event) {
      const target = event.target;
      if (signupOpen && signupMenuRef.current && !signupMenuRef.current.contains(target)) {
        setSignupOpen(false);
      }
      if (menuOpen && headerRef.current && !headerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSignupOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeHeaderMenus, true);
    document.addEventListener("click", closeHeaderMenus, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeHeaderMenus, true);
      document.removeEventListener("click", closeHeaderMenus, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, setMenuOpen, signupOpen]);
  const openSignup = (type) => {
    setSignupOpen(false);
    navigate(type === "provider" ? "/provider-signup" : "/signup");
  };
  return (
    <header ref={headerRef} className={warm ? "site-header warm-header" : "site-header"}>
      <button className="brand" onClick={() => navigate("/")}>
        <span><strong>The Healing Directory</strong><small>Relationship-based care</small></span>
      </button>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "site-nav open" : "site-nav"}>
        <button onPointerDown={(event) => { event.preventDefault(); navigate("/"); }} onClick={() => navigate("/")}>Providers</button>
        <button onPointerDown={(event) => { event.preventDefault(); navigate("/events"); }} onClick={() => navigate("/events")}>Events</button>
        {user ? <button onPointerDown={(event) => { event.preventDefault(); navigate(dashboardPath); }} onClick={() => navigate(dashboardPath)}>Dashboard</button> : null}
        {admin ? <button onPointerDown={(event) => { event.preventDefault(); navigate("/admin/events"); }} onClick={() => navigate("/admin/events")}><ShieldCheck size={15} /> Admin</button> : null}
      </nav>
      <div className="account-actions">
        {!authReady ? (
          <button className="button compact" disabled><RefreshCw size={16} className="spin" /> Checking</button>
        ) : user ? (
          <><button className="account-chip" onClick={() => navigate("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button logout-arrow" onClick={onLogout} title="Log out"><LogOut size={18} /></button></>
        ) : (
          <>
            <button className="button compact login-button" onClick={() => navigate("/login")}><LogIn size={16} /> Login</button>
            <div ref={signupMenuRef} className="signup-menu">
              <button className="button compact signup-trigger" onClick={() => setSignupOpen((open) => !open)}>Signup <ChevronDown size={16} /></button>
              {signupOpen ? <div className="signup-dropdown">
                <button onClick={() => openSignup("provider")}>Become a Provider</button>
                <button onClick={() => openSignup("client")}>Become a Member</button>
              </div> : null}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function SiteFooter({ navigate }) {
  return <footer className="site-footer"><div><strong>The Healing Directory</strong><p>Thoughtful connections for healing, wellness, and trusted referrals.</p></div><nav><button onClick={() => navigate("/terms")}>Terms & Conditions</button><button onClick={() => navigate("/privacy")}>Privacy Policy</button><PwaInstallButton /></nav></footer>;
}

function DirectoryPage({ data, loading, navigate, toggleSave }) {
  const [query, setQuery] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [filters, setFilters] = React.useState({ type: "", service: "", support: "", population: "", location: "", payment: "" });
  const types = unique(data.providers.flatMap((item) => item.providerType || [])).sort();
  const services = unique(data.providers.flatMap((item) => item.services || [])).sort();
  const supportAreas = unique(data.providers.flatMap((item) => item.support || [])).sort();
  const populations = unique(data.providers.flatMap((item) => item.populations || [])).sort();
  const locations = unique(data.providers.flatMap((item) => item.location || [])).sort();
  const payments = unique(data.providers.flatMap((item) => item.payment || [])).sort();
  const providers = data.providers.filter((item) => {
    const haystack = [item.name, item.profession, item.bio, ...(item.providerType || []), ...(item.services || []), ...(item.support || []), ...(item.location || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) &&
      (!verified || item.verified) &&
      (!filters.type || item.providerType?.includes(filters.type)) &&
      (!filters.service || item.services?.includes(filters.service)) &&
      (!filters.support || item.support?.includes(filters.support)) &&
      (!filters.population || item.populations?.includes(filters.population)) &&
      (!filters.location || item.location?.includes(filters.location)) &&
      (!filters.payment || item.payment?.includes(filters.payment));
  });
  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));

  return <main>
    <section className="directory-intro page-band dark-band">
      <div className="band-inner directory-heading">
        <p className="eyebrow">The Healing Directory</p><h1>Find the right support.</h1><p className="lede">Browse trusted therapists, wellness professionals, and healing providers by specialty, services, and areas of support.</p>
        <div className="trust-panel"><CheckCircle2 size={24} /><p><strong>Verified Member</strong> means this provider has been personally introduced within our trusted referral community. It is not a guarantee of fit, availability, or outcomes, but it does mean they are part of a relationship-based network built around connection, collaboration, and thoughtful referrals.</p></div>
      </div>
      <div className="band-inner directory-search-panel">
        <span className="filter-label">Search</span>
        <label className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, specialty, area of support, or location" /></label>
        <div className="directory-filter-grid">
          <DirectorySelect label="Provider type" value={filters.type} onChange={setFilter("type")} options={types} placeholder="All provider types" />
          <DirectorySelect label="Service" value={filters.service} onChange={setFilter("service")} options={services} placeholder="All services" />
          <DirectorySelect label="Areas of Support" value={filters.support} onChange={setFilter("support")} options={supportAreas} placeholder="All areas of support" />
          <DirectorySelect label="Population" value={filters.population} onChange={setFilter("population")} options={populations} placeholder="All people" />
          <DirectorySelect label="Location" value={filters.location} onChange={setFilter("location")} options={locations} placeholder="All locations" />
          <DirectorySelect label="Payment" value={filters.payment} onChange={setFilter("payment")} options={payments} placeholder="All payment" />
        </div>
        <label className="check-control"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} /><CheckCircle2 size={16} /> Verified only</label>
      </div>
    </section>
    <section className="content-shell">
      <div className="provider-invite directory-join-invite"><div><p className="eyebrow ink">Are you a provider?</p><h2>Join a trusted, relationship-based healing network.</h2></div><div className="directory-join-actions"><button className="button warm" onClick={() => navigate("/provider-signup")}>Become a Provider <ArrowRight size={17} /></button><button className="button member-save-cta" onClick={() => navigate("/signup")}>Become a Member <span>Save providers and events in one place.</span></button></div></div>
      <div className="results-count"><strong>{providers.length}</strong> providers shown</div>
      {loading ? <LoadingState label="Loading providers" /> : providers.length ? <div className="provider-list">{providers.map((provider) => <ProviderCard key={provider.id} provider={provider} saved={data.savedProviderIds.includes(provider.id)} onSave={() => toggleSave("provider", provider.id, !data.savedProviderIds.includes(provider.id))} onOpen={() => navigate(`/provider-details?id=${provider.id}`)} />)}</div> : <EmptyState title="No providers match that search" text="Try a broader phrase or clear one of the filters." />}
    </section>
  </main>;
}

function ProviderCard({ provider, saved, onSave, onOpen }) {
  return <article className="provider-row">
    <Avatar item={provider} />
    <div className="provider-copy"><div className="title-line"><button className="text-link title-link" onClick={onOpen}>{provider.name}</button>{provider.verified ? <span className="status good"><Check size={12} /> Verified</span> : null}</div><p className="profession">{provider.profession || provider.providerType?.join(", ")}</p>{provider.location?.length ? <p className="meta"><MapPin size={14} /> {provider.location.join(", ")}</p> : null}<p className="summary">{truncate(provider.bio, 210) || "View this provider's profile, approach, services, and contact options."}</p><div className="tag-row">{[...(provider.providerType || []), ...(provider.support || [])].slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
    <div className="provider-contact"><div className="provider-contact-title">Contact<button className={saved ? "icon-button saved" : "icon-button"} onClick={onSave} title={saved ? "Remove saved provider" : "Save provider"}>{saved ? <Star fill="currentColor" /> : <Star />}</button></div>{provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span>{provider.email}</span></a> : null}{provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span>{provider.phone}</span></a> : null}{provider.website ? <a href={toHref(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>Website</span></a> : null}<button className="button full" onClick={onOpen}>View profile <ArrowRight size={15} /></button></div>
  </article>;
}

function ProviderDetails({ route, data, loading, navigate, toggleSave, user }) {
  const id = route.query.get("id") || route.query.get("recordId");
  const [remote, setRemote] = React.useState(null);
  const provider = data.providers.find((item) => item.id === id) || remote;
  const showProviderOnlySection = shouldShowProviderOnlySection(user, provider);
  React.useEffect(() => { if (id && !provider) api("provider", { query: { id } }).then((p) => setRemote(p.provider)).catch(() => {}); }, [id]);
  if (loading && !provider) return <LoadingState label="Loading provider profile" />;
  if (!provider) return <EmptyState title="Provider not found" text="This profile may be unavailable or awaiting approval." action="Back to directory" onAction={() => navigate("/")} />;
  const saved = data.savedProviderIds.includes(provider.id);
  return <main className="provider-detail-page"><section className="profile-band"><div className="band-inner"><div className="profile-actions"><button className="back-link" onClick={() => navigate("/")}><ArrowLeft size={16} /> Back to directory</button><button className={saved ? "button saved-profile" : "button outline-light"} onClick={() => toggleSave("provider", provider.id, !saved)}>{saved ? <CheckCircle2 size={16} /> : <Bookmark size={16} />}{saved ? "Saved provider" : "Save provider"}</button></div><div className="profile-hero"><Avatar item={provider} large /><div><p className="eyebrow">The Healing Directory</p><div className="title-line"><h1>{provider.name}</h1>{provider.pronouns ? <span className="pronouns">({provider.pronouns})</span> : null}{provider.verified ? <span className="status verified-dark"><CheckCircle2 size={13} /> Verified</span> : null}</div><p className="profile-title">{provider.profession || provider.providerType?.join(", ")}</p><div className="meta-row">{provider.location?.length ? <span><MapPin size={17} />{provider.location.join(", ")}</span> : null}{provider.providerType?.length ? <span><HeartHandshake size={17} />{provider.providerType.join(", ")}</span> : null}</div><ProfileTags label="Provider type" values={provider.providerType} /><ProfileTags label="Areas of support" values={provider.support} warm /></div></div></div></section>
    <section className="content-shell detail-grid profile-content-grid"><div className="detail-main"><ContentSection kicker="About" title={`A little about ${firstName(provider.name)}`}><p>{provider.bio || "Profile details are being completed."}</p></ContentSection><ContentSection kicker="Specialties & support" title="Areas of care"><p>These selections highlight the provider's main areas of focus. They are not necessarily an exhaustive list of everyone this provider supports.</p><div className="care-grid"><CareGroup label="Provider type" values={provider.providerType} /><CareGroup label="Services" values={provider.services} /><CareGroup label="Areas of support" values={provider.support} warm /><CareGroup label="Population focus" values={provider.populations} neutral /></div></ContentSection>{provider.humanSide ? <ContentSection kicker="Get to know your provider" title="The human side"><p>{provider.humanSide}</p></ContentSection> : null}{showProviderOnlySection ? <ProviderOnlySection provider={provider} /> : null}</div><aside className="profile-sidebar"><div className="contact-panel"><h2>Connect</h2><p>Reach out directly to learn more about availability, fit, and next steps.</p>{provider.consultationLink ? <a className="button full" href={toHref(provider.consultationLink)} target="_blank" rel="noreferrer">Book consultation <ArrowRight size={16} /></a> : provider.website ? <a className="button full" href={toHref(provider.website)} target="_blank" rel="noreferrer">Visit website <ArrowRight size={16} /></a> : null}{provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span>{provider.email}</span></a> : null}{provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span>{provider.phone}</span></a> : null}{provider.website ? <a href={toHref(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>{provider.website}</span></a> : null}</div><div className="contact-panel access-panel"><h2>Access &amp;<br />Availability</h2><InfoLine icon={<Tag />} label="Pay type / insurance" value={provider.payment?.join(", ")} /><InfoLine icon={<MapPin />} label="Location" value={provider.location?.join(", ")} /></div></aside></section>
  </main>;
}

function ProviderOnlySection({ provider }) {
  const rows = [
    { label: "Referral method", value: provider.referralMethod },
    { label: "Referral notes", value: provider.referralInstructions },
    { label: "Collaboration notes", value: provider.collaborationDetails || provider.providerNotes || provider.collaboration },
  ].filter((row) => row.value);
  const interests = provider.collaborationInterests || provider.collaborationInterestsList || [];
  return (
    <ContentSection kicker="For providers only" title="Provider connection details">
      {rows.length ? (
        <div className="provider-connection-detail-list">
          {rows.map((row) => <p key={row.label}><strong>{row.label}:</strong> {String(row.value)}</p>)}
        </div>
      ) : (
        <p>This provider has not added provider-only details.</p>
      )}
      {interests.length ? (
        <div className="provider-connection-tags">
          <strong>Collaboration interests</strong>
          <div className="tag-row large-tags">{interests.map((value) => <span key={value}>{value}</span>)}</div>
        </div>
      ) : null}
    </ContentSection>
  );
}

function EventsPage({ data, loading, navigate, toggleSave, user }) {
  const [tab, setTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [eventType, setEventType] = React.useState("");
  const [locationType, setLocationType] = React.useState("");
  const canSeeProviderEvents = hasProviderEventAccess(user);
  const sourceEvents = canSeeProviderEvents ? data.events : data.events.filter((event) => !isProviderOnlyEvent(event));
  const tabs = canSeeProviderEvents ? ["all", "community", "provider", "saved"] : ["community", "saved"];
  React.useEffect(() => {
    if (!tabs.includes(tab)) setTab("community");
  }, [tab, tabs]);
  const categories = unique(sourceEvents.map((e) => e.category)).filter(Boolean).sort();
  const eventTypes = unique(sourceEvents.map((e) => e.eventType)).filter(Boolean).sort();
  const locationTypes = unique(sourceEvents.map((e) => e.locationType)).filter(Boolean).sort();
  const events = sourceEvents.filter((event) => {
    const saved = data.savedEventIds.includes(event.id);
    const audience = lower(event.audience);
    const tabMatch = tab === "all" || (tab === "saved" && saved) || (tab === "community" && !audience.includes("provider")) || (tab === "provider" && audience.includes("provider"));
    const text = [event.name, event.description, event.category, event.eventType, event.hostName].join(" ").toLowerCase();
    return tabMatch && (!query || text.includes(query.toLowerCase())) && (!category || event.category === category) && (!eventType || event.eventType === eventType) && (!locationType || event.locationType === locationType);
  }).sort((a, b) => dateValue(a.start) - dateValue(b.start));
  const communityCount = sourceEvents.filter((event) => !lower(event.audience).includes("provider")).length;
  const providerCount = sourceEvents.filter((event) => lower(event.audience).includes("provider")).length;
  return <main className="events-page"><section className="events-hero"><div className="band-inner events-hero-grid"><div><p className="event-kicker"><span /> Events</p><h1>Workshops, circles, trainings, and healing community events.</h1><p className="lede">Browse upcoming events from The Healing Directory community.</p>{canSeeProviderEvents ? <div className="action-row"><button className="button event-primary" onClick={() => navigate("/add-event")}><Plus size={16} /> Add an Event</button><button className="button event-secondary" onClick={() => setTab("community")}><HeartHandshake size={16} /> Community Events</button><button className="button event-secondary" onClick={() => setTab("provider")}><LockKeyhole size={16} /> Provider Events</button></div> : null}</div><aside className="event-summary-panel"><CalendarDays size={30} /><h2>Explore what's coming up.</h2><p>Find healing-centered spaces, local gatherings, professional trainings, and community events all in one place.</p>{canSeeProviderEvents ? <div><EventCount value={sourceEvents.length} label="Events" /><EventCount value={communityCount} label="Community" /><EventCount value={providerCount} label="Providers" /></div> : null}</aside></div></section><section className="content-shell"><div className="event-filter-panel"><div className="segmented">{tabs.map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{key === "provider" ? <LockKeyhole size={14} /> : key === "saved" ? <Bookmark size={14} /> : <Users size={14} />}{capitalize(key)}</button>)}</div><div className="event-filter-grid"><label className="search-control pale"><span className="filter-label">Search</span><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search event, host, topic, description..." /></label><label className="field"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Event Type</span><select value={eventType} onChange={(e) => setEventType(e.target.value)}><option value="">All event types</option>{eventTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Location</span><select value={locationType} onChange={(e) => setLocationType(e.target.value)}><option value="">All locations</option>{locationTypes.map((value) => <option key={value}>{value}</option>)}</select></label></div></div>{loading ? <LoadingState label="Loading events" /> : events.length ? <div className="event-grid">{events.map((event) => <EventCard key={event.id} event={event} saved={data.savedEventIds.includes(event.id)} onSave={() => toggleSave("event", event.id, !data.savedEventIds.includes(event.id))} onOpen={() => navigate(`/event-details?id=${event.id}`)} />)}</div> : <EmptyState title="No events in this view" text="Try another tab or clear your search." />}</section></main>;
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
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [drafts, setDrafts] = React.useState({});
  const [savingNote, setSavingNote] = React.useState("");
  React.useEffect(() => { api("saved-providers").then((p) => setItems(p.items || [])).finally(() => setLoading(false)); }, []);
  React.useEffect(() => {
    const next = {};
    items.forEach((item) => {
      if (item.provider?.id) next[item.provider.id] = item.notes || "";
    });
    setDrafts(next);
  }, [items]);
  const shown = items.filter((item) => item.active !== false && (!query || [item.provider.name, item.provider.email, item.notes].join(" ").toLowerCase().includes(query.toLowerCase())));
  async function saveNote(item) {
    const providerId = item.provider?.id;
    if (!providerId) return;
    setSavingNote(providerId);
    try {
      await api("toggle-provider", { method: "POST", body: { providerId, saveId: item.id, active: true, notes: drafts[providerId] || "" } });
      setItems((current) => current.map((entry) => entry.provider?.id === providerId ? { ...entry, notes: drafts[providerId] || "", active: true } : entry));
    } finally {
      setSavingNote("");
    }
  }
  return <main><PageTitle eyebrow="Saved Providers" title="Your trusted circle." text="A private working list for referrals, collaboration, and thoughtful follow-up." /><section className="content-shell"><div className="toolbar"><label className="search-control pale"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search names, email, or notes" /></label></div>{loading ? <LoadingState label="Loading saved providers" /> : shown.length ? <div className="provider-list saved-provider-note-list">{shown.map((item) => <article className="saved-provider-note-card" key={item.id}><ProviderCard provider={item.provider} saved={item.active} onSave={async () => { await toggleSave("provider", item.provider.id, false); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: false } : entry)); }} onOpen={() => navigate(`/provider-details?id=${item.provider.id}`)} /><label className="private-note-field"><span>Private note</span><small>Only you can see this. Providers cannot see your notes.</small><textarea value={drafts[item.provider.id] || ""} onChange={(event) => setDrafts((current) => ({ ...current, [item.provider.id]: event.target.value }))} rows={3} placeholder="Add a reminder for yourself..." /></label><button className="button tertiary note-save-button" disabled={savingNote === item.provider.id} onClick={() => saveNote(item)}>{savingNote === item.provider.id ? <RefreshCw className="spin" size={15} /> : <Save size={15} />}Save note</button></article>)}</div> : <EmptyState title="No saved providers yet" text="Browse the directory and bookmark people you want to revisit." action="Browse providers" onAction={() => navigate("/")} />}</section></main>;
}

function Dashboard({ user, navigate }) {
  const [payload, setPayload] = React.useState(null);
  const [tab, setTab] = React.useState("events");
  React.useEffect(() => { api("dashboard").then(setPayload).catch(() => setPayload({ counts: {}, savedProviders: [], savedEvents: [] })); }, []);
  const provider = isProviderUser(user);
  if (!provider) {
    const savedEvents = payload?.savedEvents || [];
    const savedProviders = payload?.savedProviders || [];
    return <main className="client-dashboard-page">
      <section className="client-dashboard-hero">
        <p className="client-dashboard-kicker">Client Dashboard</p>
        <h1>Welcome back, {firstName(user?.name || user?.email)}.</h1>
        <p>A quiet place to keep the people and gatherings you want to remember.</p>
        <div className="client-dashboard-actions"><button className="button client-primary" onClick={() => navigate("/events")}>Browse Workshops</button><button className="button client-secondary" onClick={() => navigate("/")}>Find Providers</button></div>
      </section>
      <section className="client-dashboard-stats">
        <ClientStat label="Saved Workshops" value={payload?.counts?.savedEvents || 0} />
        <ClientStat label="Saved Providers" value={payload?.counts?.savedProviders || 0} />
      </section>
      <section className="client-dashboard-content">
        <div className="client-saved-panel">
          <div className="client-tabs"><button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Saved Workshops</button><button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")}>Saved Providers</button></div>
          {!payload ? <LoadingState label="Loading dashboard" /> : tab === "events" ? <ClientSavedList items={savedEvents} kind="event" navigate={navigate} /> : <ClientSavedList items={savedProviders} kind="provider" navigate={navigate} />}
        </div>
      </section>
    </main>;
  }

  const savedEvents = payload?.savedEvents || [];
  const savedProviders = payload?.savedProviders || [];

  return <main className="provider-dashboard-page">
    <section className="provider-dashboard-hero">
      <p className="provider-dashboard-kicker">Provider Dashboard</p>
      <h1>Welcome back, {firstName(user?.name || user?.email)}.</h1>
      <p>Keep your referral list and workshop flow organized from one focused space.</p>
      <div className="provider-dashboard-actions">
        <button className="button provider-dashboard-primary" onClick={() => navigate("/events")}>Browse workshops</button>
        <button className="button provider-dashboard-secondary" onClick={() => navigate("/saved-providers")}>Saved providers</button>
        <button className="button provider-dashboard-secondary" onClick={() => navigate("/my-events")}>My events</button>
      </div>
    </section>
    <section className="provider-dashboard-stats">
      <ProviderStat label="Saved Workshops" value={payload?.counts?.savedEvents || 0} />
      <ProviderStat label="Upcoming Workshops" value={payload?.counts?.upcomingEvents || 0} />
      <ProviderStat label="Saved Providers" value={payload?.counts?.savedProviders || 0} />
    </section>
    <section className="provider-dashboard-content">
      <div className="provider-dashboard-panel">
        <div className="provider-dashboard-tabs"><button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Saved Workshops</button><button className={tab === "providers" ? "active" : ""} onClick={() => setTab("providers")}>Saved Providers</button></div>
        {!payload ? <LoadingState label="Loading dashboard" /> : tab === "events" ? <ProviderSavedList items={savedEvents} kind="event" navigate={navigate} /> : <ProviderSavedList items={savedProviders} kind="provider" navigate={navigate} />}
      </div>
      <aside className="provider-dashboard-aside">
        <section>
          <h2>Professional workflow</h2>
          <p>Your account is designed for quick references, saved providers, and workshop follow-through.</p>
          <button className="button" onClick={() => navigate("/add-event")}>Add an event</button>
        </section>
        <section>
          <h2>Provider connections</h2>
          <p>Connections on provider pages stay private to peers and support aligned collaboration.</p>
          <button className="button" onClick={() => navigate("/referral-room")}>The Referral Room</button>
        </section>
      </aside>
    </section>
  </main>;
}

function ProviderStat({ label, value }) { return <div className="provider-stat"><span>{label}</span><strong>{Number(value || 0)}</strong></div>; }

function ProviderSavedList({ items, kind, navigate }) {
  if (!items.length) return <div className="provider-empty"><h2>No saved {kind === "event" ? "workshops" : "providers"} yet</h2><p>{kind === "event" ? "Save workshops you want to revisit for easier follow-up." : "Add providers you want to keep for future referrals."}</p><button className="button" onClick={() => navigate(kind === "event" ? "/events" : "/")}>{kind === "event" ? "Browse Workshops" : "Find Providers"}</button></div>;
  return <div className="provider-saved-list">{items.slice(0, 5).map((item, index) => {
    const record = item.event || item.provider || item;
    const title = record.name || record.title || (kind === "event" ? "Saved Workshop" : "Saved Provider");
    return <button key={record.id || item.id || index} className="provider-saved-row" onClick={() => navigate(kind === "event" ? `/event-details?id=${record.id}` : `/provider-details?id=${record.id}`)}>
      <span className="provider-saved-mark">{kind === "event" ? <CalendarDays size={19} /> : <HeartHandshake size={19} />}</span>
      <span><strong>{title}</strong><small>{kind === "event" ? formatDate(record.start || record.date) : (record.profession || record.category || "Provider")}</small></span>
      <ArrowRight size={18} />
    </button>;
  })}</div>;
}

function ClientStat({ label, value }) { return <div className="client-stat"><span>{label}</span><strong>{Number(value || 0)}</strong></div>; }
function ClientSavedList({ items, kind, navigate }) {
  if (!items.length) return <div className="client-empty"><h2>No saved {kind === "event" ? "workshops" : "providers"} yet</h2><p>{kind === "event" ? "When you save a workshop, circle, or healing experience, it will show up here." : "Providers you save will become your private healing shortlist."}</p><button className="button client-side-button" onClick={() => navigate(kind === "event" ? "/events" : "/")}>{kind === "event" ? "Browse Workshops" : "Find Providers"}</button></div>;
  return <div className="client-saved-list">{items.slice(0, 5).map((item, index) => {
    const record = item.event || item.provider || item;
    const title = record.name || record.title || (kind === "event" ? "Saved Workshop" : "Saved Provider");
    return <button key={record.id || item.id || index} className="client-saved-row" onClick={() => navigate(kind === "event" ? `/event-details?id=${record.id}` : `/provider-details?id=${record.id}`)}><span className="client-saved-mark">{kind === "event" ? <CalendarDays size={19} /> : <HeartHandshake size={19} />}</span><span><strong>{title}</strong><small>{kind === "event" ? formatDate(record.start || record.date) : record.title || record.category || "Provider"}</small></span><ArrowRight size={18} /></button>;
  })}</div>;
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
  const initialType = readRoute().query.get("type") === "provider" ? "provider" : "client";
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "", accountType: initialType });
  const [busy, setBusy] = React.useState(false);
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot-password";
  const isReset = mode === "reset-password";
  const title = isSignup ? "Create your account" : isForgot ? "Reset your password" : isReset ? "Choose a new password" : "Welcome back";
  const subtitle = isSignup
    ? "Choose the account path that fits you. Providers can continue into membership and profile setup after account creation."
    : isForgot
      ? "Enter your email and we will send a secure password reset link."
      : isReset
        ? "Set a new password for your Healing Directory account."
        : "Log in to save providers and events, manage your listings, or return to your dashboard.";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);

    try {
      if (isSignup) {
        if (!form.name.trim()) throw new Error("Add your name before creating an account.");
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        if (!strongPassword(form.password)) throw new Error("Please choose a stronger password with at least 10 characters, mixed case, a number, and a symbol.");

        await signup(form.email, form.password, {
          full_name: form.name,
          account_type: form.accountType,
        });

        await api("signup-profile", {
          method: "POST",
          body: {
            name: form.name,
            email: form.email,
            accountType: form.accountType,
          },
        });

        const current = await getUser().catch(() => null);
        if (current) {
          const normalized = normalizeUser(current);
          const nextUser = {
            ...normalized,
            name: form.name || normalized.name,
            userMetadata: {
              ...(normalized.userMetadata || {}),
              account_type: form.accountType,
            },
          };
          setUser(nextUser);
          setNotice(form.accountType === "provider" ? "Your account is ready. Choose your provider membership next." : "Your account is ready. Welcome in.");
          navigate(defaultDashboardPath(nextUser));
        } else {
          setNotice("Account created. Check your email to confirm your login, then come back to continue.");
          navigate("/login");
        }
      } else if (isForgot) {
        await requestPasswordRecovery(form.email);
        setNotice("Check your email for a secure password reset link.");
        navigate("/login");
      } else if (isReset) {
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        if (!strongPassword(form.password)) throw new Error("Please choose a stronger password with at least 10 characters, mixed case, a number, and a symbol.");
        const current = await updateUser({ password: form.password });
        const normalized = normalizeUser(current);
        setUser(normalized);
        setNotice("Your password has been updated.");
        navigate(defaultDashboardPath(normalized));
      } else {
        const current = await login(form.email, form.password);
        const normalized = normalizeUser(current);
        setUser(normalized);
        const next = new URLSearchParams(window.location.search).get("next") || defaultDashboardPath(normalized);
        navigate(next);
      }
    } catch (error) {
      setNotice(authMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-redesign">
      <section className="auth-redesign-shell">
        <div className="auth-redesign-panel">
          <h1>Care, connection, and community.</h1>
          <p>Save trusted providers, manage events, and participate in a relationship-based referral network.</p>
        </div>

        <form className="auth-redesign-card" onSubmit={submit}>
          <h2>{title}</h2>
          <p>{subtitle}</p>

          {isSignup ? (
            <>
              <label className="profile-field">
                <span>Full name</span>
                <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
              </label>
              <div className="account-type-grid">
                <button type="button" className={form.accountType === "client" ? "active" : ""} onClick={() => update("accountType", "client")}>
                  <strong>Community member / client</strong>
                  <span>Save providers, workshops, and support you want to return to.</span>
                </button>
                <button type="button" className={form.accountType === "provider" ? "active" : ""} onClick={() => update("accountType", "provider")}>
                  <strong>Provider</strong>
                  <span>Create a professional profile, add events, and join referral tools.</span>
                </button>
              </div>
            </>
          ) : null}

          {!isReset ? (
            <label className="profile-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
            </label>
          ) : null}

          {!isForgot ? (
            <>
              <label className="profile-field">
                <span>Password</span>
                <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} required autoComplete={isSignup || isReset ? "new-password" : "current-password"} />
              </label>
              {(isSignup || isReset) ? <PasswordRequirements password={form.password} /> : null}
            </>
          ) : null}

          {isSignup || isReset ? (
            <label className="profile-field">
              <span>Confirm password</span>
              <input type="password" value={form.confirm} onChange={(event) => update("confirm", event.target.value)} required />
            </label>
          ) : null}

          <button className="button full auth-submit" disabled={busy}>
            {busy ? "Working..." : isSignup ? "Create account" : isForgot || isReset ? "Continue" : "Log in"}
            <ArrowRight size={17} />
          </button>

          <div className="auth-links">
            {mode === "login" ? (
              <>
                <button type="button" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
                <button type="button" onClick={() => navigate("/signup")}>Create an account</button>
              </>
            ) : (
              <button type="button" onClick={() => navigate("/login")}>Back to login</button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

function LegalPage({ route }) {
  const privacy = route.path === "/privacy";
  const termsSections = [
    ["Use of the Directory", "The Healing Directory is a relationship-based directory and community resource. It helps people discover providers, events, workshops, Referral Room opportunities, and related offerings. It is not a medical, mental health, legal, financial, emergency, or crisis service."],
    ["No Guarantee of Fit or Outcomes", "Listings, saved providers, saved events, verification language, or participation in The Referral Room do not guarantee fit, availability, credentials, pricing, outcomes, quality of care, or a therapeutic relationship. Clients and community members are responsible for deciding whether a provider or event is appropriate for them."],
    ["Provider Responsibility", "Providers are responsible for the accuracy of their public profile, professional credentials, license status, insurance, availability, pricing, scope of practice, event details, and all direct communications with clients or colleagues."],
    ["Events and Referral Room", "Events and Referral Room sessions may be reviewed, approved, edited, waitlisted, declined, cancelled, or removed at the discretion of The Healing Directory. Hosts are responsible for their own event delivery, registration links, payment collection, refunds, participant communication, and safety practices."],
    ["Accounts and Access", "You agree to provide accurate account information, keep your login secure, and use the directory respectfully. Access may be limited or removed if an account is used to harass, scrape, impersonate, spam, misrepresent services, or otherwise harm the community."],
    ["Payments and Membership", "Provider membership, subscriptions, and billing are handled through Stripe or another payment processor when enabled. Payment terms, cancellation timing, refunds, and plan changes may depend on the payment provider and the membership plan selected."],
    ["Content and Communications", "By submitting profile, event, or account content, you confirm that you have the right to share it and that it is accurate to the best of your knowledge. You remain responsible for messages you send through the directory or after making a connection through it."],
    ["Changes to the Service", "The Healing Directory may update features, pages, eligibility requirements, event approval processes, Referral Room workflows, pricing, or these terms as the community and platform evolve."],
    ["Contact", "Questions about these terms can be sent to admin@thehealingdirectory.com."],
  ];
  const privacySections = [
    ["Information We Collect", "We collect information needed to operate accounts, saved lists, provider profiles, event listings, Referral Room participation, account settings, membership status, and administrative review workflows. This may include names, email addresses, profile details, provider categories, services, support areas, availability, event details, saved providers, saved events, RSVP status, and related notes."],
    ["How We Use Information", "We use this information to create accounts, display public provider and event listings, connect saved providers and saved events to the correct user, support provider dashboards, manage event approvals, process Referral Room requests, send status updates, improve the directory, and keep the community organized."],
    ["Public Profile and Event Content", "Provider profiles and approved event listings may be visible to other users or the public depending on page settings. Do not include private information in profile or event fields unless you are comfortable with it being shown in the directory experience."],
    ["Private Account Information", "Login credentials, account settings, saved lists, administrative notes, and private Referral Room details are intended for account or administrative use. We aim to show only the information needed for the relevant workflow."],
    ["Third-Party Services", "The directory may use services such as Netlify Identity, Airtable, Stripe, Google Apps Script, Softr, email tools, analytics, or hosting providers. Those services may process information according to their own policies and technical requirements."],
    ["Cookies and Local Storage", "The site may use cookies, local storage, or similar browser technologies to keep you signed in, remember preferences, and support app-like behavior such as PWA installation."],
    ["Data Accuracy and Updates", "You can update account settings, provider profile information, membership details, and event content through the available pages. If something looks incorrect or you need help changing information, contact The Healing Directory."],
    ["Data Retention", "Information may be retained as long as needed to operate the directory, maintain records, resolve disputes, enforce community standards, support billing or administrative needs, and comply with legal obligations."],
    ["Security", "We use reasonable technical and administrative safeguards, but no online service can promise perfect security. Keep your login private and contact us if you believe your account has been accessed without permission."],
    ["Contact", "Privacy questions or requests can be sent to admin@thehealingdirectory.com."],
  ];
  const sections = privacy ? privacySections : termsSections;

  return (
    <main>
      <PageTitle
        eyebrow="The Healing Directory"
        title={privacy ? "Privacy Policy" : "Terms and Conditions"}
        text={privacy ? "How account, directory, event, and communication data is handled." : "The expectations that keep this directory useful, respectful, and transparent."}
      />
      <section className="content-shell narrow legal-copy">
        {sections.map(([title, text]) => (
          <section key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </section>
    </main>
  );
}

function ComingNext({ route }) { const names = { "/referral-room": "The Referral Room", "/referral-room-admin": "The Referral Room Admin", "/referral-room-manager": "The Referral Room Manager", "/provider-connections": "Provider Connections" }; return <main><PageTitle eyebrow="Authenticated workspace" title={names[route.path] || "Coming next"} text="This workflow is being connected to the new shared Airtable and authentication foundation." /><section className="content-shell"><div className="progress-panel"><Sparkles size={28} /><h2>The foundation is ready.</h2><p>This area is the next build slice: live sessions, seat rules, RSVPs, manager decisions, attendance, verification, and provider connections.</p></div></section></main>; }

function RequireAuth({ user, authReady, navigate, children }) {
  React.useEffect(() => {
    if (!authReady) return;
    if (!user) navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }, [authReady, user, navigate]);
  if (!authReady) return <LoadingState label="Checking account" />;
  return user ? children : null;
}
function RequireAdmin({ user, authReady, navigate, children }) {
  React.useEffect(() => {
    if (!authReady) return;
    if (!user) navigate("/login?next=/admin/events");
    else if (!user.roles?.includes("admin")) navigate("/dashboard");
  }, [authReady, user, navigate]);
  if (!authReady) return <LoadingState label="Checking administrator access" />;
  return user?.roles?.includes("admin") ? children : null;
}

function PageTitle({ eyebrow, title, text, actions }) { return <section className="page-title"><div className="content-shell title-inner"><div><p className="eyebrow ink">{eyebrow}</p><h1>{title}</h1><p>{text}</p></div>{actions ? <div>{actions}</div> : null}</div></section>; }
function ContentSection({ kicker, title, children }) { return <section className="content-section"><p className="eyebrow ink">{kicker}</p><h2>{title}</h2>{children}</section>; }
function InfoLine({ icon, label, value }) { if (!value) return null; return <div className="info-line">{React.cloneElement(icon, { size: 17 })}<span><small>{label}</small>{value}</span></div>; }
function Avatar({ item, large }) { return <div className={large ? "avatar large" : "avatar"}>{item.photo ? <img src={item.photo} alt="" /> : <span>{initials(item.name)}</span>}</div>; }
function TagGroup({ values }) { return <div className="tag-row large-tags">{unique(values.filter(Boolean)).map((value) => <span key={value}>{value}</span>)}</div>; }
function DirectorySelect({ label, options, placeholder, ...props }) { return <label className="directory-select"><span>{label}</span><div><select {...props}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={16} /></div></label>; }
function ProfileTags({ label, values = [], warm = false }) { if (!values.length) return null; return <div className={warm ? "profile-tag-group warm" : "profile-tag-group"}><strong>{label}</strong><div>{values.map((value) => <span key={value}>{value}</span>)}</div></div>; }
function CareGroup({ label, values = [], warm = false, neutral = false }) { return <div className={`care-group${warm ? " warm" : ""}${neutral ? " neutral" : ""}`}><strong>{label}</strong><div className="tag-row large-tags">{values.length ? values.map((value) => <span key={value}>{value}</span>) : <span>Not listed</span>}</div></div>; }
function EventCount({ value, label }) { return <div className="event-count"><strong>{value}</strong><span>{label}</span></div>; }
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
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-Supabase-Access-Token"] = token;
  }
  const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
function readRoute() { return { path: window.location.pathname.replace(/\/$/, "") || "/", query: new URLSearchParams(window.location.search) }; }
function normalizeUser(user) {
  const metadata = user?.user_metadata || user?.userMetadata || {};
  const appMetadata = user?.app_metadata || user?.appMetadata || {};
  return {
    id: user?.id || "",
    email: user?.email || metadata.email || "",
    name: user?.name || metadata.full_name || metadata.name || "",
    roles: user?.roles || appMetadata.roles || [],
    userMetadata: metadata,
  };
}
function isProviderUser(user) {
  if (!user) return false;
  const metadataType = lower(user?.userMetadata?.account_type || user?.userMetadata?.accountType);
  const appType = lower(user?.account_type || user?.accountType);
  return Boolean(user?.roles?.includes("admin") || user?.roles?.includes("provider") || metadataType === "provider" || appType === "provider");
}
function isCurrentProviderProfile(user, provider) {
  if (!user?.email || !provider?.email) return false;
  const userIds = [user.id, user.userMetadata?.provider_id, user.userMetadata?.providerId].filter(Boolean).map(lower);
  const providerIds = [provider.id, provider.userId, provider.recordId].filter(Boolean).map(lower);
  return Boolean(userIds.some((value) => providerIds.includes(value)) || lower(user.email) === lower(provider.email));
}
function shouldShowProviderOnlySection(user, provider) {
  return isProviderUser(user) && !isCurrentProviderProfile(user, provider);
}
function defaultDashboardPath(user) {
  if (isProviderUser(user)) return "/dashboard";
  return "/client-dashboard";
}
function hasProviderEventAccess(user) { return isProviderUser(user); }
function isProviderOnlyEvent(event) { return lower(event?.audience).includes("provider"); }
function authMessage(error) {
  const message = String(error?.message || "");
  const normalized = lower(message);
  if (normalized.includes("email not confirmed") || normalized.includes("invalid_grant")) return "Please verify your email before logging in. Check your inbox for the confirmation email, then try again.";
  if (normalized.includes("already")) return "An account already exists for this email. Please log in instead.";
  if (normalized.includes("failed to fetch")) return "The login service could not be reached. Please try again in a moment.";
  return message || "Authentication could not be completed.";
}
function passwordChecks(value) {
  const password = String(value || "");
  return [
    { label: "At least 10 characters", ok: password.length >= 10 },
    { label: "Upper and lowercase letters", ok: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", ok: /\d/.test(password) },
    { label: "At least one symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}
function strongPassword(value) { return passwordChecks(value).every((item) => item.ok); }
function PasswordRequirements({ password }) {
  return <div className="password-checklist compact-password-checklist">
    <strong>Strong password</strong>
    {passwordChecks(password).map((item) => <span key={item.label} className={item.ok ? "met" : ""}>{item.label}</span>)}
  </div>;
}
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
