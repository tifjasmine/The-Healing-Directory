import React from "react";
import { getUser, refreshSession } from "@netlify/identity";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CalendarDays, CheckCircle2,
  ChevronDown, CircleUserRound, Clock, ExternalLink, HeartHandshake, LockKeyhole,
  LogIn, Mail, MapPin, Menu, Phone, Plus, Search, Star, Tag, Users, X,
} from "lucide-react";

const API = "/.netlify/functions/app-api";
const LIST_PAGE_SIZE = 10;

export default function PublicShowcase({ path }) {
  const [data, setData] = React.useState({ providers: [], events: [], savedProviderIds: [], savedEventIds: [], directoryOptions: {} });
  const [loading, setLoading] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    api("bootstrap").then((payload) => setData({
      providers: payload.providers || [],
      events: payload.events || [],
      savedProviderIds: payload.savedProviderIds || [],
      savedEventIds: payload.savedEventIds || [],
      directoryOptions: payload.directoryOptions || {},
    })).finally(() => setLoading(false));
  }, []);

  async function toggleSave(kind, id, active) {
    const currentUser = await getUser();
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

  const warm = path === "/events" || path === "/event-details" || path === "/provider-details";
  return <div className="app-shell">
    <header className={warm ? "site-header warm-header" : "site-header"}>
      <button className="brand" onClick={() => go("/")}>
        <span><strong>The Healing Directory</strong><small>Relationship-based care</small></span>
      </button>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "site-nav open" : "site-nav"}>
        <button onClick={() => go("/")}>Providers</button>
        <button onClick={() => go("/events")}>Events</button>
      </nav>
      <div className="account-actions"><button className="button compact" onClick={() => go("/login")}><LogIn size={16} /> Log in</button></div>
    </header>
    {notice ? <div className="global-notice save-notice"><span>{notice}</span><button type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}
  {path === "/provider-details"
      ? <ProviderDetails data={data} loading={loading} toggleSave={toggleSave} />
      : path === "/event-details"
        ? <EventDetails data={data} loading={loading} toggleSave={toggleSave} />
      : path === "/events"
        ? <EventsPage data={data} loading={loading} toggleSave={toggleSave} />
        : <DirectoryPage data={data} loading={loading} toggleSave={toggleSave} />}
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

function DirectoryPage({ data, loading, toggleSave }) {
  const [query, setQuery] = React.useState("");
  const [verified, setVerified] = React.useState(false);
  const [filters, setFilters] = React.useState({ type: "", service: "", support: "", population: "", location: "", payment: "" });
  const [visibleCount, setVisibleCount] = React.useState(LIST_PAGE_SIZE);
  const choices = {
    type: optionChoices(data.directoryOptions?.providerType, data.providers.flatMap((item) => item.providerType || [])),
    service: unique(data.providers.flatMap((item) => item.services || [])).sort(),
    support: optionChoices(data.directoryOptions?.support, data.providers.flatMap((item) => item.support || [])),
    population: unique(data.providers.flatMap((item) => item.populations || [])).sort(),
    location: unique(data.providers.flatMap((item) => item.location || [])).sort(),
    payment: optionChoices(data.directoryOptions?.payment, data.providers.flatMap((item) => item.payment || [])),
  };
  const providers = data.providers.filter((item) => {
    const text = [item.name, item.profession, item.bio, ...(item.providerType || []), ...(item.services || []), ...(item.support || []), ...(item.location || [])].join(" ").toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!verified || item.verified) &&
      (!filters.type || item.providerType?.includes(filters.type)) &&
      (!filters.service || item.services?.includes(filters.service)) &&
      (!filters.support || item.support?.includes(filters.support)) &&
      (!filters.population || item.populations?.includes(filters.population)) &&
      (!filters.location || item.location?.includes(filters.location)) &&
      (!filters.payment || item.payment?.includes(filters.payment));
  });
  const setFilter = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  React.useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [query, verified, filters.type, filters.service, filters.support, filters.population, filters.location, filters.payment, data.providers.length]);
  const visibleProviders = providers.slice(0, visibleCount);

  return <main>
    <DirectoryLogoStrip />
    <section className="directory-intro page-band dark-band">
      <div className="band-inner directory-heading">
        <p className="eyebrow">The Healing Directory</p>
        <h1>Find the right support.</h1>
        <p className="lede">Browse trusted therapists, wellness professionals, and healing providers by specialty, services, and areas of support.</p>
        <div className="trust-panel"><CheckCircle2 size={24} /><p><strong>Verified Member</strong> means this provider has been personally introduced within our trusted referral community. It is not a guarantee of fit, availability, or outcomes, but it does mean they are part of a relationship-based network built around connection, collaboration, and thoughtful referrals.</p></div>
      </div>
      <div className="band-inner directory-search-panel">
        <span className="filter-label">Search</span>
        <label className="search-control"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, specialty, area of support..." /></label>
        <div className="directory-filter-grid">
          <DirectorySelect label="Provider type" value={filters.type} onChange={setFilter("type")} options={choices.type} placeholder="All provider types" />
          <DirectorySelect label="Service" value={filters.service} onChange={setFilter("service")} options={choices.service} placeholder="All services" />
          <DirectorySelect label="Areas of Support" value={filters.support} onChange={setFilter("support")} options={choices.support} placeholder="All areas of support" />
          <DirectorySelect label="Population" value={filters.population} onChange={setFilter("population")} options={choices.population} placeholder="All people" />
          <DirectorySelect label="Location" value={filters.location} onChange={setFilter("location")} options={choices.location} placeholder="All locations" />
          <DirectorySelect label="Payment" value={filters.payment} onChange={setFilter("payment")} options={choices.payment} placeholder="All payment" />
        </div>
        <label className="check-control circle-check-control"><input aria-label="Show verified providers only" type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /><span className="circle-toggle" aria-hidden="true" /><span>Verified only</span></label>
      </div>
    </section>
    <section className="content-shell">
      <div className="provider-invite"><div><p className="eyebrow ink">Are you a provider?</p><h2>Join a trusted, relationship-based healing network.</h2></div><button className="button warm" onClick={() => go("/provider-signup")}>Become a Provider <ArrowRight size={17} /></button></div>
      <div className="results-count"><strong>{providers.length}</strong> providers shown</div>
      {loading ? <State label="Loading providers" /> : providers.length ? <><div className="provider-list">{visibleProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} saved={data.savedProviderIds.includes(provider.id)} onSave={() => toggleSave("provider", provider.id, !data.savedProviderIds.includes(provider.id))} />)}</div><ViewMoreList shown={visibleProviders.length} total={providers.length} label="providers" onMore={() => setVisibleCount((value) => value + LIST_PAGE_SIZE)} /></> : <State label="No providers match that search" />}
    </section>
  </main>;
}

function ProviderCard({ provider, saved, onSave }) {
  return <article className="provider-row">
    <Avatar item={provider} />
    <div className="provider-copy">
      <div className="title-line"><button className="text-link title-link" onClick={() => go(`/provider-details?id=${provider.id}`)}>{provider.name}</button>{provider.verified ? <span className="status good"><CheckCircle2 size={12} /> Verified</span> : null}</div>
      <p className="profession">{provider.profession || provider.providerType?.join(", ")}</p>
      {provider.location?.length ? <p className="meta"><MapPin size={14} /> {provider.location.join(", ")}</p> : null}
      <p className="summary">{truncate(provider.bio, 210) || "View this provider's profile, approach, services, and contact options."}</p>
      <div className="tag-row">{[...(provider.providerType || []), ...(provider.support || [])].slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
    </div>
    <div className="provider-contact">
      <div className="provider-contact-title">Contact<button className={saved ? "icon-button saved" : "icon-button"} onClick={onSave} title="Save provider">{saved ? <Star fill="currentColor" /> : <Star />}</button></div>
      {provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span>{provider.email}</span></a> : null}
      {provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span>{provider.phone}</span></a> : null}
      {provider.website ? <a href={href(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>Website</span></a> : null}
      <button className="button full" onClick={() => go(`/provider-details?id=${provider.id}`)}>View profile <ArrowRight size={15} /></button>
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
        <ContentSection kicker="About" title={`A little about ${firstName(provider.name)}`}><p>{provider.bio || "Profile details are being completed."}</p></ContentSection>
        <ContentSection kicker="Specialties & support" title="Areas of care"><p>These selections highlight the provider's main areas of focus. They are not necessarily an exhaustive list of everyone this provider supports.</p><div className="care-grid"><CareGroup label="Provider type" values={provider.providerType} /><CareGroup label="Services" values={provider.services} /><CareGroup label="Areas of support" values={provider.support} warm /><CareGroup label="Population focus" values={provider.populations} neutral /></div></ContentSection>
        <HumanSideSection provider={provider} />
        <ProviderConnectionSection provider={provider} />
      </div>
      <aside className="profile-sidebar">
        <div className="contact-panel"><h2>Connect</h2><p>Reach out directly to learn more about availability, fit, and next steps.</p>{provider.consultationLink ? <a className="button full" href={href(provider.consultationLink)} target="_blank" rel="noreferrer">Book consultation <ArrowRight size={16} /></a> : provider.website ? <a className="button full" href={href(provider.website)} target="_blank" rel="noreferrer">Visit website <ArrowRight size={16} /></a> : null}{provider.email ? <a href={`mailto:${provider.email}`}><Mail size={17} /><span>{provider.email}</span></a> : null}{provider.phone ? <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={17} /><span>{provider.phone}</span></a> : null}{provider.website ? <a href={href(provider.website)} target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>{provider.website}</span></a> : null}</div>
        <div className="contact-panel access-panel"><h2>Access &amp; Availability</h2><Info icon={<Star />} label="Pay type / insurance" value={provider.payment?.join(", ")} /><Info icon={<Clock />} label="Availability" value={provider.availability?.join(", ")} /><Info icon={<Clock />} label="Current availability" value={provider.availabilitySpecifics} /><Info icon={<CheckCircle2 />} label="Response time" value={provider.responseTime} /><Info icon={<Tag />} label="Pricing" value={provider.price} /><Info icon={<MapPin />} label="Location" value={provider.location?.join(", ")} /><Info icon={<MapPin />} label="Physical locations" value={provider.physicalLocations} /></div>
      </aside>
    </section>
  </main>;
}

function EventsPage({ data, loading, toggleSave }) {
  const [tab, setTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [locationType, setLocationType] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(LIST_PAGE_SIZE);
  const categories = unique(data.events.map((event) => event.category)).sort();
  const locations = unique(data.events.map((event) => event.locationType)).sort();
  const events = data.events.filter((event) => {
    const providerOnly = String(event.audience || "").toLowerCase().includes("provider");
    const saved = data.savedEventIds.includes(event.id);
    const matchesTab = tab === "all" || (tab === "community" && !providerOnly) || (tab === "provider" && providerOnly) || (tab === "saved" && saved);
    const text = [event.name, event.hostName, event.category, event.description].join(" ").toLowerCase();
    return matchesTab && (!query || text.includes(query.toLowerCase())) && (!category || event.category === category) && (!locationType || event.locationType === locationType);
  });
  const community = data.events.filter((event) => !String(event.audience || "").toLowerCase().includes("provider")).length;
  React.useEffect(() => {
    setVisibleCount(LIST_PAGE_SIZE);
  }, [tab, query, category, locationType, data.events.length]);
  const visibleEvents = events.slice(0, visibleCount);
  return <main className="events-page">
    <section className="events-hero"><div className="band-inner events-hero-grid">
      <div><p className="event-kicker"><span /> Events</p><h1>Workshops, circles, trainings, and healing community events.</h1><p className="lede">Browse upcoming events from The Healing Directory community.</p><div className="action-row"><button className="button event-primary" onClick={() => go("/add-event")}><Plus size={16} /> Add an Event</button><button className="button event-secondary" onClick={() => setTab("community")}><HeartHandshake size={16} /> Community Events</button><button className="button event-secondary" onClick={() => setTab("provider")}><LockKeyhole size={16} /> Provider Events</button></div></div>
      <aside className="event-summary-panel"><CalendarDays size={30} /><h2>Explore what's coming up.</h2><p>Find healing-centered spaces, local gatherings, professional trainings, and community events all in one place.</p><div><EventCount value={data.events.length} label="Events" /><EventCount value={community} label="Community" /><EventCount value={data.events.length - community} label="Providers" /></div></aside>
    </div></section>
    <section className="content-shell">
      <div className="event-filter-panel"><div className="segmented">{["all", "community", "provider", "saved"].map((key) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{key === "provider" ? <LockKeyhole size={14} /> : key === "saved" ? <Bookmark size={14} /> : <Users size={14} />}{capitalize(key)}</button>)}</div><div className="event-filter-grid"><label className="search-control pale"><span className="filter-label">Search</span><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search event, host, topic, description..." /></label><label className="field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="field"><span>Location type</span><select value={locationType} onChange={(event) => setLocationType(event.target.value)}><option value="">All location types</option>{locations.map((value) => <option key={value}>{value}</option>)}</select></label></div></div>
      <div className="results-count"><strong>{events.length}</strong> events shown</div>
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
        <div className="event-badges"><span><Users size={15} />{event.audience || "Community"}</span><span><CheckCircle2 size={15} />{event.status || "Approved"}</span><span><Tag size={15} />{event.category || event.eventType}</span></div>
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

function DirectorySelect({ label, options, placeholder, ...props }) { return <label className="directory-select"><span>{label}</span><div><select {...props}><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={16} /></div></label>; }
function Avatar({ item, large }) { return <div className={large ? "avatar large" : "avatar"}>{item.photo ? <img src={item.photo} alt="" /> : <span>{initials(item.name)}</span>}</div>; }
function ProfileTags({ label, values = [], warm }) { if (!values.length) return null; return <div className={warm ? "profile-tag-group warm" : "profile-tag-group"}><strong>{label}</strong><div>{values.map((value) => <span key={value}>{value}</span>)}</div></div>; }
function CareGroup({ label, values = [], warm, neutral }) { return <div className={`care-group${warm ? " warm" : ""}${neutral ? " neutral" : ""}`}><strong>{label}</strong><div className="tag-row large-tags">{values.length ? values.map((value) => <span key={value}>{value}</span>) : <span>Not listed</span>}</div></div>; }
function ContentSection({ kicker, title, children }) { return <section className="content-section"><p className="eyebrow ink">{kicker}</p><h2>{title}</h2>{children}</section>; }
function Info({ icon, label, value }) { if (!value) return null; return <div className="info-line">{React.cloneElement(icon, { size: 17 })}<span><small>{label}</small>{value}</span></div>; }
function HumanSideSection({ provider }) {
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
  return <ContentSection kicker="Get to know your provider" title="The human side">
    {provider.humanSide ? <p>{provider.humanSide}</p> : null}
    {prompts.length ? <div className="human-grid">{prompts.map((item) => <DetailPrompt key={item.label} {...item} />)}</div> : null}
    {provider.vibe?.length ? <div className="detail-chip-block"><strong>Vibe</strong><div className="tag-row large-tags">{provider.vibe.map((value) => <span key={value}>{value}</span>)}</div></div> : null}
    {provider.funFact ? <div className="long-note"><strong>Fun facts</strong><p>{provider.funFact}</p></div> : null}
  </ContentSection>;
}
function ProviderConnectionSection({ provider }) {
  const hasConnection = provider.referralMethod || provider.referralInstructions || provider.providerNotes || provider.collaborationDetails || provider.collaborationInterests?.length;
  if (!hasConnection) return null;
  return <ContentSection kicker="Provider-only" title="Provider connection details">
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
function ViewMoreList({ shown, total, onMore, label = "items" }) { if (!total || shown >= total) return null; return <div className="view-more-row"><button type="button" className="button tertiary" onClick={onMore}>View more</button><span>Showing {shown} of {total} {label}</span></div>; }
function State({ label }) { return <div className="state"><HeartHandshake /><h2>{label}</h2></div>; }
function go(path) { window.location.assign(path); }
function optionChoices(options = [], fallback = []) { return (options?.length ? unique(options) : unique(fallback || [])).filter((value) => String(value).trim().toLowerCase() !== "all").sort(); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function truncate(value, max) { const text = String(value || "").replace(/\s+/g, " ").trim(); return text.length > max ? `${text.slice(0, max - 1)}...` : text; }
function href(value) { return /^(https?:|mailto:|tel:)/i.test(String(value || "")) ? value : `https://${value}`; }
function initials(value) { const parts = String(value || "TH").split(/\s+/).filter(Boolean); return `${parts[0]?.[0] || "T"}${parts.at(-1)?.[0] || "H"}`.toUpperCase(); }
function firstName(value) { return String(value || "there").split(/\s+/)[0]; }
function capitalize(value) { return value.charAt(0).toUpperCase() + value.slice(1); }
function time(value) { const date = new Date(value || 0); return Number.isNaN(date.getTime()) ? null : date; }
function formatDate(value) { const date = time(value); return date ? new Intl.DateTimeFormat(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" }).format(date) : "Date TBA"; }
function formatTime(value) { const date = time(value); return date ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : "Time TBA"; }
async function api(action, options = {}) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value)); const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Request failed."); return payload; }
