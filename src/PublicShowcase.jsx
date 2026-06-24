import React from "react";
import { getAccessToken, getUser, logout, refreshSession } from "./authClient.js";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2,
  ChevronDown, CircleUserRound, Clock, ExternalLink, HeartHandshake, LockKeyhole,
  LogIn, LogOut, Mail, MapPin, Menu, Phone, Plus, RefreshCw, Search, Star, Tag, Users, X,
} from "lucide-react";

const API = "/.netlify/functions/app-api";
const LIST_PAGE_SIZE = 10;

export default function PublicShowcase({ path }) {
  const [data, setData] = React.useState({ providers: [], events: [], savedProviderIds: [], savedEventIds: [], directoryOptions: {} });
  const [loading, setLoading] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [user, setUser] = React.useState(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const headerRef = React.useRef(null);

  const hydrateUser = React.useCallback(async () => {
    const currentUser = normalizeUser(await getUser().catch(() => null));
    setUser(currentUser);
    return currentUser;
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.allSettled([
      api("bootstrap"),
      getUser().catch(() => null),
    ]).then(([bootstrapResult, userResult]) => {
      if (!active) return;
      const payload = bootstrapResult.status === "fulfilled" ? bootstrapResult.value : {};
      const currentUser = userResult.status === "fulfilled" ? userResult.value : null;
      setData({
        providers: payload.providers || [],
        events: payload.events || [],
        savedProviderIds: payload.savedProviderIds || [],
        savedEventIds: payload.savedEventIds || [],
        directoryOptions: payload.directoryOptions || {},
      });
      setUser(normalizeUser(payload.user) || normalizeUser(currentUser));
    }).finally(() => {
      if (!active) return;
      setLoading(false);
      setAuthReady(true);
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!menuOpen && !signupOpen) return undefined;
    function closeHeaderMenus(event) {
      if (headerRef.current?.contains(event.target)) return;
      setMenuOpen(false);
      setSignupOpen(false);
    }
    document.addEventListener("pointerdown", closeHeaderMenus);
    return () => document.removeEventListener("pointerdown", closeHeaderMenus);
  }, [menuOpen, signupOpen]);

  React.useEffect(() => {
    const recheck = () => void hydrateUser();
    window.addEventListener("focus", recheck);
    window.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      window.removeEventListener("visibilitychange", recheck);
    };
  }, [hydrateUser]);

  async function toggleSave(kind, id, active) {
    const currentUser = user || (await hydrateUser());
    if (!currentUser) {
      go(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    try {
      await refreshSession().catch(() => null);
      await api(kind === "provider" ? "toggle-provider" : "toggle-event", {
        method: "POST",
        body: { [kind === "provider" ? "providerId" : "eventId"]: id, active },
      });
      const key = kind === "provider" ? "savedProviderIds" : "savedEventIds";
      setData((current) => ({
        ...current,
        [key]: active ? unique([id, ...current[key]]) : current[key].filter((value) => value !== id),
      }));
      setNotice(active ? `Saved ${kind === "provider" ? "provider" : "workshop"}.` : `Removed saved ${kind === "provider" ? "provider" : "workshop"}.`);
    } catch (error) {
      setNotice(error.message || "That save did not go through. Please try again.");
    }
  }

  async function signOut() {
    await logout().catch(() => null);
    setUser(null);
    go("/");
  }

  const warm = path === "/events" || path === "/event-details" || path === "/provider-details";
  const dashboardPath = user ? defaultDashboardPath(user) : "";
  const openSignup = (type) => {
    setSignupOpen(false);
    go(type === "provider" ? "/provider-signup" : "/signup");
  };
  return <div className="app-shell">
    <header ref={headerRef} className={warm ? "site-header warm-header" : "site-header"}>
      <button className="brand" onClick={() => go("/")}>
        <span><strong>The Healing Directory</strong><small>Relationship-based care</small></span>
      </button>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "site-nav open" : "site-nav"}>
        <button onPointerDown={(event) => { event.preventDefault(); go("/"); }} onClick={() => go("/")}>Providers</button>
        <button onPointerDown={(event) => { event.preventDefault(); go("/events"); }} onClick={() => go("/events")}>Events</button>
        {user ? <button onPointerDown={(event) => { event.preventDefault(); go(dashboardPath); }} onClick={() => go(dashboardPath)}>Dashboard</button> : null}
      </nav>
      <div className="account-actions">
        {!authReady ? (
          <button className="button compact" disabled><RefreshCw className="spin" size={16} /> Checking</button>
        ) : user ? (
          <><button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button><button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button></>
        ) : (
          <>
            <button className="button compact login-button" onClick={() => go("/login")}><LogIn size={16} /> Login</button>
            <div className="signup-menu">
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
    {notice ? <div className="global-notice save-notice"><span>{notice}</span><button type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}
  {path === "/provider-details"
      ? <ProviderDetails data={data} loading={loading} toggleSave={toggleSave} />
      : path === "/event-details"
        ? <EventDetails data={data} loading={loading} toggleSave={toggleSave} />
      : path === "/events"
        ? <EventsPage data={data} loading={loading} toggleSave={toggleSave} user={user} />
        : <DirectoryPage data={data} loading={loading} toggleSave={toggleSave} user={user} />}
    <footer className="site-footer"><div><strong>The Healing Directory</strong><p>Thoughtful connections for healing, wellness, and trusted referrals.</p></div><nav><button onClick={() => go("/terms")}>Terms and Conditions</button><button onClick={() => go("/privacy")}>Privacy Policy</button></nav></footer>
  </div>;
}

function DirectoryLogoStrip() {
  return <section className="directory-logo-strip">
    <img
      src="/directory-logo-strip.png"
      alt="The Healing Directory"
      loading="eager"
      onError={(event) => {
        event.currentTarget.src = "/healing-directory-logo.svg";
      }}
    />
  </section>;
}

function DirectoryPage({ data, loading, toggleSave, user }) {
  const [query, setQuery] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [filters, setFilters] = React.useState({
    type: [],
    service: [],
    support: [],
    population: [],
    location: [],
    payment: [],
    vibe: [],
    identity: [],
    genderIdentity: [],
    availability: [],
    collaborationInterests: [],
    currentAvailability: [],
  });
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(LIST_PAGE_SIZE);
  const canUseProviderFilters = hasProviderEventAccess(user);
  const choices = {
    type: optionChoices(data.directoryOptions?.providerType, data.providers.flatMap((item) => item.providerType || [])),
    service: unique(data.providers.flatMap((item) => item.services || [])).sort(),
    support: optionChoices(data.directoryOptions?.support, data.providers.flatMap((item) => item.support || [])),
    population: unique(data.providers.flatMap((item) => item.populations || [])).sort(),
    location: unique(data.providers.flatMap((item) => item.location || [])).sort(),
    payment: optionChoices(data.directoryOptions?.payment, data.providers.flatMap((item) => item.payment || [])),
    vibe: optionChoices(data.directoryOptions?.vibe, data.providers.flatMap((item) => item.vibe || [])),
    identity: optionChoices(data.directoryOptions?.identity, data.providers.flatMap((item) => item.identity || [])),
    genderIdentity: optionChoices(data.directoryOptions?.genderIdentity, data.providers.flatMap((item) => item.genderIdentity || [])),
    availability: optionChoices(data.directoryOptions?.availability, data.providers.flatMap((item) => item.availability || [])),
    collaborationInterests: optionChoices(data.directoryOptions?.collaborationInterests, data.providers.flatMap((item) => item.collaborationInterests || [])),
    currentAvailability: optionChoices(data.directoryOptions?.currentAvailability, data.providers.flatMap((item) => item.currentAvailability || item.availabilitySpecifics || [])),
  };
  const providers = data.providers.filter((item) => {
    const text = [item.name, item.profession, item.bio, ...(item.providerType || []), ...(item.services || []), ...(item.support || []), ...(item.location || []), ...(item.vibe || []), ...(item.identity || []), ...(item.genderIdentity || []), ...(item.availability || []), ...(item.collaborationInterests || []), ...(item.currentAvailability || [])].join(" ").toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!verified || item.verified) &&
      matchesSelected(item.providerType, filters.type) &&
      matchesSelected(item.services, filters.service) &&
      matchesSelected(item.support, filters.support) &&
      matchesSelected(item.populations, filters.population) &&
      matchesSelected(item.location, filters.location) &&
      matchesSelected(item.payment, filters.payment) &&
      matchesSelected(item.vibe, filters.vibe) &&
      matchesSelected(item.identity, filters.identity) &&
      matchesSelected(item.genderIdentity, filters.genderIdentity) &&
      matchesSelected(item.availability, filters.availability) &&
      (!canUseProviderFilters || (
        matchesSelected(item.collaborationInterests, filters.collaborationInterests) &&
        matchesSelected(item.currentAvailability || item.availabilitySpecifics || item.availability, filters.currentAvailability)
      ));
  });
  const toggleFilter = (key, value) => setFilters((current) => {
    const next = current[key].includes(value)
      ? current[key].filter((item) => item !== value)
      : [...current[key], value];
    return { ...current, [key]: next };
  });
  const clearFilters = () => {
    setQuery("");
    setVerified(false);
    setFilters({ type: [], service: [], support: [], population: [], location: [], payment: [], vibe: [], identity: [], genderIdentity: [], availability: [], collaborationInterests: [], currentAvailability: [] });
  };
  const activeFilterCount = Object.values(filters).reduce((total, values) => total + values.length, 0) + (verified ? 1 : 0) + (query.trim() ? 1 : 0);
  React.useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [query, verified, filters, data.providers.length]);
  const visibleProviders = providers.slice(0, visibleCount);
  const recentlyJoinedProviders = React.useMemo(() => [...(data.providers || [])]
    .filter((item) => item?.name)
    .sort((a, b) => dateNumber(b.createdTime) - dateNumber(a.createdTime))
    .slice(0, 5), [data.providers]);
  const [recentProviderIndex, setRecentProviderIndex] = React.useState(0);
  React.useEffect(() => {
    setRecentProviderIndex(0);
  }, [recentlyJoinedProviders.length]);
  React.useEffect(() => {
    if (recentlyJoinedProviders.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setRecentProviderIndex((current) => (current + 1) % recentlyJoinedProviders.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [recentlyJoinedProviders.length]);
  const newestProvider = recentlyJoinedProviders[recentProviderIndex] || recentlyJoinedProviders[0];

  return <main>
    <section className="directory-intro page-band dark-band directory-home-hero">
      <div className="band-inner directory-home-shell">
        <div className="directory-heading">
          <p className="directory-location-pill"><span />Serving New Jersey & Pennsylvania</p>
          <h1>Find <span>trusted</span> support.</h1>
          <p className="lede">A curated directory of therapists, wellness professionals, and holistic providers — matched to you by care need, not just location.</p>
          {!user ? <div className="directory-hero-actions home-join-cards">
            <button className="home-join-card provider-card" type="button" onClick={() => go("/provider-signup")}>
              <strong>Become a Provider</strong>
              <span>Join a trusted, relationship-based healing network.</span>
            </button>
            <button className="home-join-card member-card" type="button" onClick={() => go("/signup")}>
              <strong>Become a Member</strong>
              <span>Save providers and events in one place.</span>
            </button>
          </div> : null}
        </div>
        <div className="directory-hero-art">
          <img src="/homepage-logo-transparent.png" alt="The Healing Directory" />
          <div className="home-verified-card">
            <p>Recently joined</p>
            <div className="home-verified-provider">
              <span>{initials(newestProvider?.name || "Tiffany Wright")}</span>
              <div><strong>{newestProvider?.name || "Tiffany Wright"}</strong><small>{verifiedProviderSubtitle(newestProvider)}</small></div>
            </div>
          </div>
        </div>
      </div>
      <div className="band-inner directory-search-panel">
        <div className="directory-search-heading">
          <h2>Find the right provider</h2>
          <p>Therapists, wellness professionals & holistic providers across NJ & PA</p>
        </div>
        <label className="search-control"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for provider..." /></label>
        <div className="directory-filter-grid primary-filter-grid">
          <DirectoryMultiSelect label="Provider type" values={filters.type} onToggle={(value) => toggleFilter("type", value)} options={choices.type} placeholder="All provider types" />
          <DirectoryMultiSelect label="Area of support" values={filters.support} onToggle={(value) => toggleFilter("support", value)} options={choices.support} placeholder="All areas of support" />
          <DirectoryMultiSelect label="Population" values={filters.population} onToggle={(value) => toggleFilter("population", value)} options={choices.population} placeholder="All people" />
        </div>
        <div className="directory-filter-actions">
          <button type="button" className={filtersOpen ? "filter-toggle-button active" : "filter-toggle-button"} onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Fewer filters" : "+ More filters"}{activeFilterCount ? ` (${activeFilterCount})` : ""}<ChevronDown size={16} /></button>
          {activeFilterCount ? <button type="button" className="clear-filter-button" onClick={clearFilters}>Clear all</button> : null}
        </div>
        <div className={filtersOpen ? "directory-filter-grid more-filter-grid open" : "directory-filter-grid more-filter-grid"}>
          <DirectoryMultiSelect label="Payment" values={filters.payment} onToggle={(value) => toggleFilter("payment", value)} options={choices.payment} placeholder="All payment" />
          <DirectoryMultiSelect label="Provider vibe" values={filters.vibe} onToggle={(value) => toggleFilter("vibe", value)} options={choices.vibe} placeholder="All vibes" />
          <DirectoryMultiSelect label="Location" values={filters.location} onToggle={(value) => toggleFilter("location", value)} options={choices.location} placeholder="All locations" />
          {!canUseProviderFilters ? <DirectoryMultiSelect label="Availability" values={filters.availability} onToggle={(value) => toggleFilter("availability", value)} options={choices.availability} placeholder="All availability" /> : null}
          <DirectoryMultiSelect label="Service" values={filters.service} onToggle={(value) => toggleFilter("service", value)} options={choices.service} placeholder="All services" />
          <DirectoryMultiSelect label="Racial / Ethnic Identity" values={filters.identity} onToggle={(value) => toggleFilter("identity", value)} options={choices.identity} placeholder="All identities" />
          <DirectoryMultiSelect label="Gender Identity" values={filters.genderIdentity} onToggle={(value) => toggleFilter("genderIdentity", value)} options={choices.genderIdentity} placeholder="All gender identities" />
        </div>
        {canUseProviderFilters ? <div className={filtersOpen ? "provider-only-filter-block open" : "provider-only-filter-block"}>
          <div className="provider-only-filter-copy"><LockKeyhole size={15} /><span>Provider connection filters</span></div>
          <DirectoryMultiSelect label="Collaboration Interests" values={filters.collaborationInterests} onToggle={(value) => toggleFilter("collaborationInterests", value)} options={choices.collaborationInterests} placeholder="All collaboration interests" />
          <DirectoryMultiSelect label="Current Availability" values={filters.currentAvailability} onToggle={(value) => toggleFilter("currentAvailability", value)} options={choices.currentAvailability} placeholder="All current availability" />
        </div> : null}
        <button type="button" className={verified ? "verified-circle-filter active" : "verified-circle-filter"} onClick={() => setVerified((current) => !current)} aria-pressed={verified} aria-label="Show verified providers only"><span><CheckCircle2 size={17} /></span>Verified only</button>
        <button type="button" className="directory-submit-button" onClick={() => document.querySelector(".provider-list, .state")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Search providers</button>
        <div className="verified-note"><CheckCircle2 size={17} /><p><strong>Verified</strong> means the provider has been personally introduced within The Healing Directory referral community. It is not a guarantee of fit, availability, or outcomes.</p></div>
      </div>
    </section>
    <section className="content-shell">
      {loading ? <State label="Loading providers" /> : providers.length ? <><div className="provider-list">{visibleProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} saved={data.savedProviderIds.includes(provider.id)} onSave={() => toggleSave("provider", provider.id, !data.savedProviderIds.includes(provider.id))} />)}</div><ViewMoreList shown={visibleProviders.length} total={providers.length} label="providers" onMore={() => setVisibleCount((value) => value + LIST_PAGE_SIZE)} /></> : <State label="No providers match that search" />}
    </section>
  </main>;
}

function ProviderCard({ provider, saved, onSave }) {
  const [contactOpen, setContactOpen] = React.useState(false);
  const providerTypeText = provider.providerType?.join(", ") || provider.profession || "Provider";
  const supportTags = (provider.support || []).slice(0, 5);
  return <article className="provider-row">
    <Avatar item={provider} />
    <div className="provider-copy">
      <div className="title-line"><button className="text-link title-link" onClick={() => go(`/provider-details?id=${provider.id}`)}>{provider.name}</button>{provider.verified ? <span className="status good"><CheckCircle2 size={12} /> Verified</span> : null}</div>
      <p className="profession">{providerTypeText}</p>
      {provider.location?.length ? <p className="meta"><MapPin size={14} /> {provider.location.join(", ")}</p> : null}
      <p className="summary">{truncate(provider.bio, 210) || "View this provider's profile, approach, services, and contact options."}</p>
      {supportTags.length ? <div className="tag-row">{supportTags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
    </div>
    <div className={contactOpen ? "provider-contact open" : "provider-contact"}>
      <div className="provider-contact-title">
        <button type="button" className="provider-contact-toggle" onClick={() => setContactOpen((open) => !open)} aria-expanded={contactOpen}>Contact <ChevronDown size={15} /></button>
        <button className={saved ? "icon-button saved" : "icon-button"} onClick={onSave} title="Save provider">{saved ? <Star fill="currentColor" /> : <Star />}</button>
      </div>
      <div className="provider-contact-body">
        {provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span>{provider.email}</span></a> : null}
        {provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span>{provider.phone}</span></a> : null}
        {provider.website ? <a href={href(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>Website</span></a> : null}
        <button className="button full" onClick={() => go(`/provider-details?id=${provider.id}`)}>View profile <ArrowRight size={15} /></button>
      </div>
    </div>
  </article>;
}

function ProviderDetails({ data, loading, toggleSave }) {
  const id = new URLSearchParams(window.location.search).get("id") || new URLSearchParams(window.location.search).get("recordId");
  const listedProvider = data.providers.find((item) => item.id === id);
  const [profile, setProfile] = React.useState(null);
  const [checkingProfile, setCheckingProfile] = React.useState(Boolean(id));
  React.useEffect(() => {
    let active = true;
    if (!id) {
      setCheckingProfile(false);
      return () => { active = false; };
    }
    setCheckingProfile(true);
    setProfile(null);
    api("provider", { query: { id } })
      .then((payload) => { if (active) setProfile(payload.provider || null); })
      .catch(() => { if (active) setProfile(null); })
      .finally(() => { if (active) setCheckingProfile(false); });
    return () => { active = false; };
  }, [id]);
  const provider = profile || listedProvider;
  if (loading || (checkingProfile && !listedProvider)) return <State label="Loading provider profile" />;
  if (!provider) return <State label="Provider not found" />;
  const saved = data.savedProviderIds.includes(provider.id);
  return <main className="provider-detail-page">
    <section className="profile-band"><div className="band-inner">
      <div className="profile-actions"><button className="back-link" onClick={() => go("/")}><ArrowLeft size={16} /> Back to directory</button><button className={saved ? "button saved-profile" : "button outline-light"} onClick={() => toggleSave("provider", provider.id, !saved)}>{saved ? <CheckCircle2 size={16} /> : <Bookmark size={16} />}{saved ? "Saved provider" : "Save provider"}</button></div>
      <div className="profile-hero"><Avatar item={provider} large /><div><p className="eyebrow">The Healing Directory</p><div className="title-line"><h1>{provider.name}</h1>{provider.pronouns ? <span className="pronouns">({provider.pronouns})</span> : null}{provider.verified ? <span className="status verified-dark"><CheckCircle2 size={13} /> Verified</span> : null}</div><p className="profile-title">{provider.profession || provider.providerType?.join(", ")}</p><div className="meta-row">{provider.location?.length ? <span><MapPin size={17} />{provider.location.join(", ")}</span> : null}{provider.providerType?.length ? <span><HeartHandshake size={17} />{provider.providerType.join(", ")}</span> : null}</div><ProfileTags label="Provider type" values={provider.providerType} /><ProfileTags label="Areas of support" values={provider.support} warm /></div></div>
    </div></section>
    <section className="content-shell detail-grid profile-content-grid">
      <div className="detail-main">
        <ContentSection kicker="About" title={`A little about ${firstName(provider.name)}`} defaultOpen><FormattedText value={provider.bio || "Profile details are being completed."} /></ContentSection>
        <ContentSection kicker="Specialties & support" title="Areas of care" defaultOpen={false}><p>These selections highlight the provider's main areas of focus. They are not necessarily an exhaustive list of everyone this provider supports.</p><div className="care-grid"><CareGroup label="Provider type" values={provider.providerType} /><CareGroup label="Services" values={provider.services} /><CareGroup label="Areas of support" values={provider.support} warm /><CareGroup label="Population focus" values={provider.populations} neutral /></div></ContentSection>
        <HumanSideSection provider={provider} defaultOpen={false} />
        <ProviderConnectionSection provider={provider} defaultOpen={false} />
      </div>
      <aside className="profile-sidebar">
        <DetailPanel className="contact-panel" title="Connect" defaultOpen={false}>
          <p>Reach out directly to learn more about availability, fit, and next steps.</p>
          {provider.consultationLink ? <a className="button full" href={href(provider.consultationLink)} target="_blank" rel="noreferrer">Book consultation <ArrowRight size={16} /></a> : provider.website ? <a className="button full" href={href(provider.website)} target="_blank" rel="noreferrer">Visit website <ArrowRight size={16} /></a> : null}
          {provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span>{provider.email}</span></a> : null}
          {provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span>{provider.phone}</span></a> : null}
          {provider.website ? <a href={href(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>{provider.website}</span></a> : null}
        </DetailPanel>
        <DetailPanel className="contact-panel access-panel" title="Access & Availability" defaultOpen={false}>
          <Info icon={<Star />} label="Pay type / insurance" value={provider.payment?.join(", ")} />
          <Info icon={<Clock />} label="Availability" value={provider.availability?.join(", ")} />
          <Info icon={<Clock />} label="Current availability" value={provider.availabilitySpecifics} />
          <Info icon={<CheckCircle2 />} label="Response time" value={provider.responseTime} />
          <Info icon={<Tag />} label="Pricing" value={provider.price} />
          <Info icon={<MapPin />} label="Location" value={provider.location?.join(", ")} />
          <Info icon={<MapPin />} label="Physical locations" value={provider.physicalLocations} />
        </DetailPanel>
      </aside>
    </section>
  </main>;
}

function EventsPage({ data, loading, toggleSave, user }) {
  const [tab, setTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [eventType, setEventType] = React.useState("");
  const [locationType, setLocationType] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(LIST_PAGE_SIZE);
  const canSeeProviderEvents = hasProviderEventAccess(user);
  const canUseSavedEvents = Boolean(user);
  const visibleSourceEvents = canSeeProviderEvents ? data.events : data.events.filter((event) => !isProviderOnlyEvent(event));
  const categories = unique(visibleSourceEvents.map((event) => event.category)).sort();
  const eventTypes = unique(visibleSourceEvents.map((event) => event.eventType)).sort();
  const locations = unique(visibleSourceEvents.map((event) => event.locationType)).sort();
  const availableTabs = canSeeProviderEvents ? ["all", "community", "provider", "saved"] : canUseSavedEvents ? ["community", "saved"] : [];
  React.useEffect(() => {
    if (!availableTabs.length) {
      if (tab !== "all") setTab("all");
      return;
    }
    if (!availableTabs.includes(tab)) setTab(canSeeProviderEvents ? "all" : "community");
  }, [availableTabs, canSeeProviderEvents, tab]);
  const events = visibleSourceEvents.filter((event) => {
    const providerOnly = isProviderOnlyEvent(event);
    const saved = data.savedEventIds.includes(event.id);
    const matchesTab = !availableTabs.length || tab === "all" || (tab === "community" && !providerOnly) || (tab === "provider" && providerOnly) || (tab === "saved" && saved);
    const text = [event.name, event.hostName, event.category, event.eventType, event.description].join(" ").toLowerCase();
    return matchesTab && (!query || text.includes(query.toLowerCase())) && (!category || event.category === category) && (!eventType || event.eventType === eventType) && (!locationType || event.locationType === locationType);
  });
  const community = visibleSourceEvents.filter((event) => !isProviderOnlyEvent(event)).length;
  React.useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [tab, query, category, eventType, locationType, data.events.length]);
  const visibleEvents = events.slice(0, visibleCount);
  return <main className="events-page">
    <section className="events-hero"><div className="band-inner events-hero-grid">
      <div><p className="event-kicker"><span /> Events</p><h1>Workshops, circles, trainings, and healing community events.</h1>{canSeeProviderEvents ? <div className="action-row"><button className="button event-primary" onClick={() => go("/add-event")}><Plus size={16} /> Add an Event</button><button className="button event-secondary" onClick={() => setTab("community")}><HeartHandshake size={16} /> Community Events</button><button className="button event-secondary" onClick={() => setTab("provider")}><LockKeyhole size={16} /> Provider Events</button></div> : null}</div>
      <aside className="event-summary-panel"><CalendarDays size={30} /><h2>Explore what's coming up.</h2><p>Find healing-centered spaces, local gatherings, professional trainings, and community events all in one place.</p>{canSeeProviderEvents ? <div><EventCount value={visibleSourceEvents.length} label="Events" /><EventCount value={community} label="Community" /><EventCount value={visibleSourceEvents.length - community} label="Providers" /></div> : null}</aside>
    </div></section>
    <section className="content-shell">
      <div className="event-filter-panel">{availableTabs.length ? <div className="segmented">{availableTabs.map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{key === "provider" ? <LockKeyhole size={14} /> : key === "saved" ? <Bookmark size={14} /> : <Users size={14} />}{capitalize(key)}</button>)}</div> : null}<div className="event-filter-grid"><label className="search-control pale"><span className="filter-label">Search</span><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, host, topic, description..." /></label><label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Event Type</span><select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="">All event types</option>{eventTypes.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Location</span><select value={locationType} onChange={(event) => setLocationType(event.target.value)}><option value="">All locations</option>{locations.map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
      {loading ? <State label="Loading events" /> : events.length ? <><div className="event-grid">{visibleEvents.map((event) => <EventCard key={event.id} event={event} saved={data.savedEventIds.includes(event.id)} onSave={() => toggleSave("event", event.id, !data.savedEventIds.includes(event.id))} />)}</div><ViewMoreList shown={visibleEvents.length} total={events.length} label="events" onMore={() => setVisibleCount((value) => value + LIST_PAGE_SIZE)} /></> : <State label="No events in this view" />}
    </section>
  </main>;
}

function EventCard({ event, saved, onSave }) {
  return <article className="event-card"><div className="event-image">{event.image ? <img src={event.image} alt="" /> : <CalendarDays size={36} />}</div><div className="event-body"><div className="title-line"><p className="eyebrow ink">{event.category || event.eventType || "Event"}</p></div><h3>{event.name}</h3><p className="meta"><CalendarDays size={14} />{formatDate(event.start)}</p><p className="meta"><Clock size={14} />{formatTime(event.start)}{event.end ? ` - ${formatTime(event.end)}` : ""}</p><p>{truncate(event.description, 150)}</p><div className="card-footer"><button className="button" onClick={() => go(`/event-details?id=${event.id}`)}>View details <ArrowRight size={15} /></button>{event.registration ? <a className="button tertiary" href={href(event.registration)} target="_blank" rel="noreferrer">Register <ExternalLink size={15} /></a> : null}<button className={saved ? "icon-button saved" : "icon-button"} onClick={onSave}>{saved ? <BookmarkCheck /> : <Bookmark />}</button></div></div></article>;
}

function EventDetails({ data, loading, toggleSave }) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("recordId");
  const listedEvent = data.events.find((item) => item.id === id);
  const [privateEvent, setPrivateEvent] = React.useState(null);
  const [checking, setChecking] = React.useState(Boolean(id));
  React.useEffect(() => {
    if (!id || listedEvent) {
      setChecking(false);
      return;
    }
    api("event", { query: { id } })
      .then((payload) => setPrivateEvent(payload.event || null))
      .catch(() => setPrivateEvent(null))
      .finally(() => setChecking(false));
  }, [id, listedEvent]);
  const event = listedEvent || privateEvent;
  if (loading || checking) return <State label="Loading event" />;
  if (!event) return <State label="Event not found" />;
  const saved = data.savedEventIds.includes(event.id);
  return <main className="event-detail-showcase">
    <div className="event-detail-actions">
      <button className="button event-back" onClick={() => go("/events")}><ArrowLeft size={17} /> Back to Events</button>
      <button className="button event-primary" onClick={() => go("/add-event")}><Plus size={17} /> Add an Event</button>
    </div>
    <section className="event-showcase-hero">
      <div className="event-showcase-image">{event.image ? <img src={event.image} alt="" /> : <img src="/healing-directory-logo.svg" alt="The Healing Directory" />}</div>
      <div className="event-showcase-copy">
        <div className="event-badges"><span><Users size={15} />{event.audience || "Community"}</span><span><Tag size={15} />{event.category || event.eventType}</span></div>
        <h1>{event.name}</h1>
        <div className="event-facts"><span><CalendarDays />{formatDate(event.start)}</span><span><Clock />{formatTime(event.start)}{event.end ? ` - ${formatTime(event.end)}` : ""}</span>{event.hostName ? <span><CircleUserRound />{event.hostName}</span> : null}</div>
        <div className="action-row">
          {event.registration ? <a className="button event-primary" href={href(event.registration)} target="_blank" rel="noreferrer">Register <ExternalLink size={16} /></a> : null}
          <button className="button event-outline" onClick={() => toggleSave("event", event.id, !saved)}>{saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{saved ? "Saved Event" : "Save Event"}</button>
          {event.hostEmail ? <a className="button event-outline" href={`mailto:${event.hostEmail}`}><Mail size={16} /> Email Host</a> : null}
        </div>
      </div>
    </section>
    <section className="event-detail-content">
      <article className="event-description-card"><p className="eyebrow ink">About this event</p><h2>Details</h2><p>{event.description || "More details are coming soon."}</p></article>
      <aside className="event-quick-card"><p className="eyebrow ink">Event snapshot</p><h2>Quick Info</h2><EventInfo icon={<CalendarDays />} label="Date" value={formatDate(event.start)} /><EventInfo icon={<Clock />} label="Time" value={`${formatTime(event.start)}${event.end ? ` - ${formatTime(event.end)}` : ""}`} /><EventInfo icon={<CircleUserRound />} label="Host" value={event.hostName} /><EventInfo icon={<Mail />} label="Host email" value={event.hostEmail} /><EventInfo icon={<Tag />} label="Category" value={event.category || event.eventType} /><EventInfo icon={<MapPin />} label="Location type" value={event.locationType} /><EventInfo icon={<MapPin />} label="Address / link" value={event.address} />{event.registration ? <a className="button event-primary full" href={href(event.registration)} target="_blank" rel="noreferrer">Register <ExternalLink size={16} /></a> : null}</aside>
    </section>
  </main>;
}

function DirectoryMultiSelect({ label, values = [], options = [], placeholder, onToggle }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const selectedLabel = values.length
    ? values.length === 1
      ? values[0]
      : `${values.slice(0, 2).join(", ")}${values.length > 2 ? ` +${values.length - 2}` : ""}`
    : placeholder;
  React.useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  return <div className={open ? "directory-multi-select open" : "directory-multi-select"} ref={ref}>
    <span>{label}</span>
    <button type="button" className={open ? "multi-select-trigger open" : "multi-select-trigger"} onClick={() => setOpen((current) => !current)}>
      <strong>{selectedLabel}</strong>
      <ChevronDown size={16} />
    </button>
    {values.length ? <div className="selected-filter-chips">{values.map((value) => <button type="button" key={value} onClick={() => onToggle(value)}>{value}<X size={13} /></button>)}</div> : null}
    {open ? <div className="multi-select-menu" onPointerDown={(event) => event.stopPropagation()}>
      <p className="multi-select-hint">Select all that apply</p>
      {options.length ? options.map((option) => {
        const selected = values.includes(option);
        return <button type="button" key={option} className={selected ? "selected" : ""} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggle(option);
        }}>
          <span>{selected ? <CheckCircle2 size={14} /> : null}</span>
          {option}
        </button>;
      }) : <p>No choices found</p>}
    </div> : null}
  </div>;
}
function Avatar({ item, large }) { return <div className={large ? "avatar large" : "avatar"}>{item.photo ? <img src={item.photo} alt="" /> : <span>{initials(item.name)}</span>}</div>; }
function ProfileTags({ label, values = [], warm }) { if (!values.length) return null; return <div className={warm ? "profile-tag-group warm" : "profile-tag-group"}><strong>{label}</strong><div>{values.map((value) => <span key={value}>{value}</span>)}</div></div>; }
function CareGroup({ label, values = [], warm, neutral }) { return <div className={`care-group${warm ? " warm" : ""}${neutral ? " neutral" : ""}`}><strong>{label}</strong><div className="tag-row large-tags">{values.length ? values.map((value) => <span key={value}>{value}</span>) : <span>Not listed</span>}</div></div>; }
function ContentSection({ kicker, title, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return <section className={open ? "content-section open" : "content-section collapsed"}>
    <button type="button" className="content-section-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span><span className="eyebrow ink">{kicker}</span><h2>{title}</h2></span>
      <ChevronDown size={19} />
    </button>
    {open ? <div className="content-section-body">{children}</div> : null}
  </section>;
}
function DetailPanel({ title, children, className = "", defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return <section className={`${className} detail-panel ${open ? "open" : "collapsed"}`.trim()}>
    <button type="button" className="detail-panel-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <h2>{title}</h2>
      <ChevronDown size={19} />
    </button>
    {open ? <div className="detail-panel-body">{children}</div> : null}
  </section>;
}
function FormattedText({ value }) {
  const blocks = String(value || "").split(/\r?\n+/).map((item) => item.trim()).filter(Boolean);
  return <div className="formatted-copy">{(blocks.length ? blocks : [String(value || "").trim()]).map((block, index) => <p key={`${index}-${block.slice(0, 12)}`}>{block}</p>)}</div>;
}
function Info({ icon, label, value }) { if (!value) return null; return <div className="info-line">{React.cloneElement(icon, { size: 17 })}<span><small>{label}</small>{value}</span></div>; }
function HumanSideSection({ provider, defaultOpen = true }) {
  const prompts = [
    { label: "My style in three words", value: provider.styleWords, icon: <SparkIcon /> },
    { label: "Clients describe me as", value: provider.clientDescriptors, icon: <SmileIcon /> },
    { label: "My grounding ritual", value: provider.groundingRitual, icon: <LeafIcon /> },
    { label: "Outside sessions", value: provider.outsideSessions, icon: <MugIcon /> },
    { label: "Guiding belief", value: provider.guidingBelief, icon: <SparkIcon /> },
    { label: "What I wish people knew about healing", value: provider.healingWish, icon: <HeartHandshake size={20} /> },
    { label: "Favorite comfort practice", value: provider.comfortPractice, icon: <LeafIcon /> },
  ].filter((item) => item.value);
  if (!provider.humanSide && !provider.funFact && !provider.vibe?.length && !prompts.length) return null;
  return <ContentSection kicker="Get to know your provider" title="The human side" defaultOpen={defaultOpen}>
    {provider.humanSide ? <p>{provider.humanSide}</p> : null}
    {prompts.length ? <div className="human-grid">{prompts.map((item) => <DetailPrompt key={item.label} {...item} />)}</div> : null}
    {provider.vibe?.length ? <div className="detail-chip-block"><strong>Vibe</strong><div className="tag-row large-tags">{provider.vibe.map((value) => <span key={value}>{value}</span>)}</div></div> : null}
    {provider.funFact ? <div className="long-note"><strong>Fun facts</strong><p>{provider.funFact}</p></div> : null}
  </ContentSection>;
}
function ProviderConnectionSection({ provider, defaultOpen = true }) {
  const hasConnection = provider.referralMethod || provider.referralInstructions || provider.providerNotes || provider.collaborationDetails || provider.collaborationInterests?.length;
  if (!hasConnection) return null;
  return <ContentSection kicker="Provider-only" title="Provider connection details" defaultOpen={defaultOpen}>
    <p>A quick look at how this provider likes to connect, collaborate, consult, and receive aligned referrals from other providers.</p>
    <div className="connection-grid">
      <DetailPrompt label="Best way to connect" value={provider.referralMethod} icon={<Phone size={20} />} />
      <DetailPrompt label="Connection / referral notes" value={provider.referralInstructions} icon={<Mail size={20} />} />
      <DetailPrompt label="Provider-to-provider notes" value={provider.providerNotes} icon={<HeartHandshake size={20} />} wide />
      <DetailPrompt label="Collaboration details" value={provider.collaborationDetails || provider.collaboration} icon={<CheckCircle2 size={20} />} wide />
      {provider.collaborationInterests?.length ? <div className="detail-prompt wide"><HeartHandshake size={20} /><div><strong>Collaboration interests</strong><div className="tag-row large-tags neutral-tags">{provider.collaborationInterests.map((value) => <span key={value}>{value}</span>)}</div></div></div> : null}
    </div>
  </ContentSection>;
}
function DetailPrompt({ label, value, icon, wide }) { if (!value) return null; return <div className={wide ? "detail-prompt wide" : "detail-prompt"}>{icon}<div><strong>{label}</strong><p>{value}</p></div></div>; }
function SparkIcon() { return <Star size={20} />; }
function SmileIcon() { return <CircleUserRound size={20} />; }
function LeafIcon() { return <HeartHandshake size={20} />; }
function MugIcon() { return <Clock size={20} />; }
function EventCount({ value, label }) { return <div className="event-count"><strong>{value}</strong><span>{label}</span></div>; }
function EventInfo({ icon, label, value }) { if (!value) return null; return <div className="event-info">{React.cloneElement(icon, { size: 19 })}<span><small>{label}</small><strong>{value}</strong></span></div>; }
function ViewMoreList({ shown, total, label = "items", onMore }) { if (!total || shown >= total) return null; return <div className="view-more-row"><button type="button" className="button tertiary" onClick={onMore}>Show more {label}</button></div>; }
function State({ label }) { return <div className="state"><HeartHandshake /><h2>{label}</h2></div>; }
function go(path) { window.location.assign(path); }
function normalizeUser(current) {
  if (!current) return null;
  const metadata = current.user_metadata || current.userMetadata || {};
  const appMetadata = current.app_metadata || current.appMetadata || {};
  return {
    id: current.id || "",
    email: current.email || metadata.email || "",
    name: current.name || metadata.full_name || metadata.name || "",
    roles: current.roles || appMetadata.roles || [],
    userMetadata: metadata,
  };
}
function defaultDashboardPath(current) {
  const accountType = String(current?.userMetadata?.account_type || current?.userMetadata?.accountType || "").toLowerCase();
  return current?.roles?.includes("provider") || current?.roles?.includes("admin") || accountType === "provider" ? "/dashboard" : "/client-dashboard";
}
function hasProviderEventAccess(current) {
  const accountType = String(current?.userMetadata?.account_type || current?.userMetadata?.accountType || "").toLowerCase();
  return current?.roles?.includes("provider") || current?.roles?.includes("admin") || accountType === "provider";
}
function isProviderOnlyEvent(event) { return String(event?.audience || "").toLowerCase().includes("provider"); }
function optionChoices(options = [], fallback = []) { return (options?.length ? unique(options) : unique(fallback || [])).filter((value) => String(value).trim().toLowerCase() !== "all").sort(); }
function matchesSelected(values = [], selected = []) { return !selected.length || selected.some((value) => values?.includes(value)); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function dateNumber(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}
function truncate(value, max) { const text = String(value || "").replace(/\s+/g, " ").trim(); return text.length > max ? `${text.slice(0, max - 1)}...` : text; }
function href(value) { return /^(https?:|mailto:|tel:)/i.test(String(value || "")) ? value : `https://${value}`; }
function initials(value) { const parts = String(value || "TH").split(/\s+/).filter(Boolean); return `${parts[0]?.[0] || "T"}${parts.at(-1)?.[0] || "H"}`.toUpperCase(); }
function firstName(value) { return String(value || "there").split(/\s+/)[0]; }
function verifiedProviderSubtitle(provider) {
  if (!provider) return "Somatic Therapist";
  return provider.providerType?.[0] || provider.profession || "Provider";
}
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function time(value) { const date = new Date(value || 0); return Number.isNaN(date.getTime()) ? null : date; }
function formatDate(value) { const date = time(value); return date ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }).format(date) : "Date TBA"; }
function formatTime(value) { const date = time(value); return date ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : "Time TBA"; }
async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
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
