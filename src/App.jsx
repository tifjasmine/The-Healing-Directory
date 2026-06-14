import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Star,
  X
} from "lucide-react";

const PROVIDER_DATA_URL = "/.netlify/functions/healing-directory-providers";
const ITEMS_PER_PAGE = 8;
const STORAGE_KEY = "healing_directory_saved_providers";

export default function App() {
  const [providers, setProviders] = React.useState([]);
  const [dataStatus, setDataStatus] = React.useState("loading");
  const [statusMessage, setStatusMessage] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [openFilter, setOpenFilter] = React.useState(null);
  const [verifiedOnly, setVerifiedOnly] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(ITEMS_PER_PAGE);
  const [savedIds, setSavedIds] = React.useState(() => readSavedIds());
  const [filters, setFilters] = React.useState({
    providerType: [],
    servicesOffered: [],
    areasOfSupport: [],
    populationsServed: [],
    state: [],
    payment: []
  });

  React.useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const response = await fetch(PROVIDER_DATA_URL, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.details || payload.error || "Provider data could not be loaded.");
        }

        const nextProviders = Array.isArray(payload.providers) ? payload.providers : [];

        if (cancelled) return;

        if (payload.configured === false) {
          setProviders([]);
          setDataStatus("not-configured");
          setStatusMessage("Airtable is not connected to this Netlify site yet. Add AIRTABLE_TOKEN or AIRTABLE_API_KEY in Netlify environment variables, then redeploy.");
          return;
        }

        setProviders(nextProviders.map(normalizeProvider));
        setDataStatus(nextProviders.length > 0 ? "ready" : "empty");
        setStatusMessage(nextProviders.length > 0 ? "" : "Airtable connected, but no records were returned from the selected Directory view.");
      } catch (error) {
        if (!cancelled) {
          setProviders([]);
          setDataStatus("error");
          setStatusMessage(error.message || "Unable to load Airtable records.");
        }
      }
    }

    loadProviders();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, filters, verifiedOnly]);

  React.useEffect(() => {
    if (!openFilter) return undefined;
    const close = (event) => {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      if (!path.some((node) => node?.dataset?.filterKey === openFilter)) setOpenFilter(null);
    };
    const escape = (event) => {
      if (event.key === "Escape") setOpenFilter(null);
    };
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", escape);
    };
  }, [openFilter]);

  const options = React.useMemo(
    () => ({
      providerType: uniqueOptions(providers, "providerType"),
      servicesOffered: uniqueOptions(providers, "servicesOffered"),
      areasOfSupport: uniqueOptions(providers, "areasOfSupport"),
      populationsServed: uniqueOptions(providers, "populationsServed"),
      state: uniqueOptions(providers, "state"),
      payment: uniqueOptions(providers, "payment")
    }),
    [providers]
  );

  const activeFilterCount =
    Object.values(filters).reduce((sum, values) => sum + values.length, 0) + (verifiedOnly ? 1 : 0);

  const filteredProviders = React.useMemo(() => {
    const search = clean(searchTerm).toLowerCase();
    return providers.filter((provider) => {
      const searchableText = [
        provider.name,
        provider.pronouns,
        provider.profession,
        provider.bio,
        ...provider.providerType,
        ...provider.servicesOffered,
        ...provider.areasOfSupport,
        ...provider.populationsServed,
        ...provider.state,
        ...provider.payment
      ].join(" ").toLowerCase();

      return (
        (!search || searchableText.includes(search)) &&
        (!verifiedOnly || provider.verified) &&
        matches(provider.providerType, filters.providerType) &&
        matches(provider.servicesOffered, filters.servicesOffered) &&
        matches(provider.areasOfSupport, filters.areasOfSupport) &&
        matches(provider.populationsServed, filters.populationsServed) &&
        matches(provider.state, filters.state) &&
        matches(provider.payment, filters.payment)
      );
    });
  }, [providers, filters, searchTerm, verifiedOnly]);

  const visibleProviders = filteredProviders.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProviders.length;
  const hasActiveFilters = Boolean(searchTerm || activeFilterCount);

  const setFilterValues = (key, values) => setFilters((current) => ({ ...current, [key]: values }));

  const clearFilters = () => {
    setSearchTerm("");
    setVerifiedOnly(false);
    setOpenFilter(null);
    setFilters({ providerType: [], servicesOffered: [], areasOfSupport: [], populationsServed: [], state: [], payment: [] });
  };

  const toggleSaved = (providerId) => {
    setSavedIds((current) => {
      const next = current.includes(providerId) ? current.filter((id) => id !== providerId) : [providerId, ...current];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <main className="page">
      <section className="hero">
        <div className="heroLogo">
          <img src="/healing-directory-logo.svg" alt="The Healing Directory" />
        </div>
        <div className="heroInner">
          <p className="kicker">The Healing Directory</p>
          <h1>Find the right support.</h1>
          <p className="lede">Browse therapists, wellness professionals, and healing providers by specialty, service, location, and concern.</p>

          <div className="verifiedNote">
            <CheckCircle2 size={18} />
            <p><strong>Verified Member</strong> means this provider has been personally introduced within the referral community. It is not a guarantee of fit, availability, or outcomes.</p>
          </div>

          <div className="searchRow">
            <label className="searchField">
              <span>Search</span>
              <Search size={17} />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by name, specialty, concern..." />
            </label>
            <button className={mobileFiltersOpen ? "mobileFilter active" : "mobileFilter"} type="button" onClick={() => setMobileFiltersOpen((current) => !current)}>
              <SlidersHorizontal size={16} />
              {mobileFiltersOpen ? "Hide filters" : "Show filters"}
              {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
            </button>
          </div>

          <div className={mobileFiltersOpen ? "filters open" : "filters"}>
            <FilterMenu filterKey="providerType" label="Provider Type" placeholder="All provider types" options={options.providerType} values={filters.providerType} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={(values) => setFilterValues("providerType", values)} />
            <FilterMenu filterKey="servicesOffered" label="Service" placeholder="All services" options={options.servicesOffered} values={filters.servicesOffered} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={(values) => setFilterValues("servicesOffered", values)} />
            <FilterMenu filterKey="areasOfSupport" label="Concern" placeholder="All concerns" options={options.areasOfSupport} values={filters.areasOfSupport} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={(values) => setFilterValues("areasOfSupport", values)} />
            <FilterMenu filterKey="populationsServed" label="Population" placeholder="All people" options={options.populationsServed} values={filters.populationsServed} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={(values) => setFilterValues("populationsServed", values)} />
            <FilterMenu filterKey="state" label="Location" placeholder="All locations" options={options.state} values={filters.state} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={(values) => setFilterValues("state", values)} />
            <FilterMenu filterKey="payment" label="Payment" placeholder="All payment" options={options.payment} values={filters.payment} openFilter={openFilter} setOpenFilter={setOpenFilter} onChange={(values) => setFilterValues("payment", values)} />
          </div>

          <div className="filterActions">
            <button className={verifiedOnly ? "pillButton active" : "pillButton"} type="button" onClick={() => setVerifiedOnly((current) => !current)}><CheckCircle2 size={15} />Verified only</button>
            {hasActiveFilters && <button className="pillButton" type="button" onClick={clearFilters}><X size={15} />Clear filters</button>}
          </div>
        </div>
      </section>

      <section className="shell">
        <div className="joinBand">
          <div>
            <p className="kicker dark">Are you a provider?</p>
            <h2>Join a trusted, relationship-based healing network.</h2>
          </div>
          <a className="button" href="mailto:hello@thehealingdirectory.com">Become a Provider <ArrowRight size={16} /></a>
        </div>

        <div className="resultsTop">
          <p>{filteredProviders.length} providers found</p>
          <span>{dataStatus === "ready" ? "Curated support for therapy, wellness, and nervous system care" : statusMessage}</span>
        </div>

        {dataStatus === "loading" ? <StateBox text="Loading providers..." /> : null}
        {dataStatus !== "loading" && visibleProviders.length === 0 ? <EmptyState dataStatus={dataStatus} statusMessage={statusMessage} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters} /> : null}
        {visibleProviders.length > 0 ? <div className="list">{visibleProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} isSaved={savedIds.includes(provider.id)} onSave={() => toggleSaved(provider.id)} />)}</div> : null}
        {hasMore && <div className="loadMore"><button className="button" type="button" onClick={() => setVisibleCount((current) => current + ITEMS_PER_PAGE)}>View more providers</button></div>}
      </section>
    </main>
  );
}

function ProviderCard({ provider, isSaved, onSave }) {
  const initials = getInitials(provider.name);
  const shownTags = [...provider.providerType.slice(0, 2), ...provider.servicesOffered.slice(0, 3), ...provider.areasOfSupport.slice(0, 2)].slice(0, 5);
  const hiddenTagCount = provider.providerType.length + provider.servicesOffered.length + provider.areasOfSupport.length - shownTags.length;

  return (
    <article className="card">
      <button className={isSaved ? "save saved" : "save"} type="button" onClick={onSave} aria-label={isSaved ? "Remove saved provider" : "Save provider"}><Star size={17} fill={isSaved ? "currentColor" : "none"} /></button>
      <div className="avatar">{provider.photo ? <img src={provider.photo} alt={provider.name} /> : <span>{initials}</span>}</div>
      <div className="cardBody">
        <div className="nameRow"><h2>{provider.name}</h2>{provider.pronouns && <span>{provider.pronouns}</span>}{provider.verified && <b><CheckCircle2 size={13} />Verified</b>}</div>
        {provider.profession && <p className="profession">{provider.profession}</p>}
        {provider.state.length > 0 && <p className="location"><MapPin size={14} />{provider.state.join(", ")}</p>}
        {provider.bio && <p className="bio">{provider.bio}</p>}
        <div className="tags">{shownTags.map((tag) => <span key={tag}>{tag}</span>)}{hiddenTagCount > 0 && <span>+{hiddenTagCount} more</span>}</div>
      </div>
      <aside className="contact">
        {provider.email && <a href={`mailto:${provider.email}`}><Mail size={15} /><span>{provider.email}</span></a>}
        {provider.phone && <a href={`tel:${provider.phone.replace(/[^\d+]/g, "")}`}><Phone size={15} /><span>{provider.phone}</span></a>}
        {provider.website && <a href={toHref(provider.website)} target="_blank" rel="noreferrer"><Globe size={15} /><span>Website</span></a>}
        {provider.consultationLink && <a href={toHref(provider.consultationLink)} target="_blank" rel="noreferrer"><ExternalLink size={15} /><span>Consult</span></a>}
      </aside>
    </article>
  );
}

function FilterMenu({ filterKey, label, placeholder, options, values, openFilter, setOpenFilter, onChange }) {
  const isOpen = openFilter === filterKey;
  const labelText = values.length === 0 ? placeholder : values.length === 1 ? values[0] : `${values.length} selected`;
  const toggleValue = (value) => onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return (
    <div className="filter" data-filter-key={filterKey}>
      <span>{label}</span>
      <button className={values.length > 0 ? "hasValue" : ""} type="button" onClick={() => setOpenFilter(isOpen ? null : filterKey)} aria-expanded={isOpen}><em>{labelText}</em><ChevronDown size={15} /></button>
      {isOpen && <div className="filterMenu" data-filter-key={filterKey}>
        <div className="filterMenuTop"><strong>{label}</strong><button type="button" onClick={() => setOpenFilter(null)} aria-label={`Close ${label}`}><X size={15} /></button></div>
        {values.length > 0 && <button className="clearFilter" type="button" onClick={() => onChange([])}>Clear {label.toLowerCase()}</button>}
        {options.length === 0 ? <p className="filterEmpty">No options yet</p> : options.map((option) => <label className="filterOption" key={option}><input type="checkbox" checked={values.includes(option)} onChange={() => toggleValue(option)} /><span>{option}</span></label>)}
      </div>}
    </div>
  );
}

function StateBox({ text }) {
  return <div className="stateBox"><div className="spinner" /><p>{text}</p></div>;
}

function EmptyState({ dataStatus, statusMessage, hasActiveFilters, clearFilters }) {
  const title = dataStatus === "not-configured" ? "Airtable is not connected yet." : dataStatus === "error" ? "Airtable could not be loaded." : "No providers found.";
  const message = statusMessage || (hasActiveFilters ? "Try clearing a filter or searching for a broader concern." : "No records were returned from Airtable.");
  return <div className="stateBox"><h2>{title}</h2><p>{message}</p>{hasActiveFilters && <button className="button" type="button" onClick={clearFilters}>Clear filters</button>}</div>;
}

function uniqueOptions(items, key) {
  return Array.from(new Set(items.flatMap((provider) => provider[key] || []))).sort((a, b) => a.localeCompare(b));
}

function matches(labels, selected) {
  return selected.length === 0 || selected.some((value) => labels.includes(value));
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value).split(",").map(clean).filter(Boolean);
}

function normalizeProvider(provider) {
  return {
    id: clean(provider.id || provider.recordId || provider.name).toLowerCase().replace(/[^a-z0-9]+/g, "-") || crypto.randomUUID(),
    name: clean(provider.name) || "Provider",
    pronouns: clean(provider.pronouns),
    profession: clean(provider.profession),
    bio: clean(provider.bio),
    providerType: toArray(provider.providerType),
    servicesOffered: toArray(provider.servicesOffered),
    areasOfSupport: toArray(provider.areasOfSupport),
    populationsServed: toArray(provider.populationsServed),
    state: toArray(provider.state),
    payment: toArray(provider.payment || provider.payType),
    verified: Boolean(provider.verified),
    email: clean(provider.email),
    phone: clean(provider.phone),
    website: clean(provider.website),
    consultationLink: clean(provider.consultationLink),
    photo: clean(provider.photo || provider.profilePhotoUrl)
  };
}

function getInitials(name) {
  const initials = clean(name).split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
  return initials || "?";
}

function toHref(value) {
  const url = clean(value);
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function readSavedIds() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}
