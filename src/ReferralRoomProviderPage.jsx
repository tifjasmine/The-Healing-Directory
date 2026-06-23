import React from "react";
import { ArrowRight, CheckCircle2, RefreshCw, Sparkles, X } from "lucide-react";
import { getAccessToken } from "./authClient.js";

const API = "/.netlify/functions/referral-room";
const ROOM_FALLBACK_DESCRIPTION = "A curated referral circle for aligned healing professionals.";

export default function ReferralRoomProviderPage({ setNotice }) {
  const query = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedRoomId = query.get("room") || "";
  const [data, setData] = React.useState({ sessions: [], attendance: [], serviceTypes: [], provider: null });
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState(requestedRoomId ? "details" : "browse");
  const [selectedId, setSelectedId] = React.useState(requestedRoomId);
  const [form, setForm] = React.useState({ serviceType: "", notes: "" });
  const [message, setMessage] = React.useState(null);
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(() => {
    return api("provider-data")
      .then((payload) => {
        setData(payload);
        setSelectedId((value) => value || requestedRoomId || payload.sessions?.[0]?.id || "");
      })
      .catch((error) => setMessage({ type: "error", text: error.message }))
      .finally(() => setLoading(false));
  }, [requestedRoomId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const activeAttendance = React.useMemo(
    () => data.attendance.filter((item) => !isCancelled(item.status)),
    [data.attendance],
  );
  const selectedSession = data.sessions.find((session) => session.id === selectedId) || data.sessions[0];

  function showMessage(text, type = "success") {
    setNotice?.("");
    setMessage({ text, type });
  }

  function goToDetails(session) {
    setSelectedId(session.id);
    setView("details");
    window.history.replaceState(null, "", `${window.location.pathname}?room=${encodeURIComponent(session.id)}`);
  }

  function goToRequest(session) {
    setSelectedId(session.id);
    setForm({
      serviceType: cleanText(data.provider?.serviceType) || cleanText(data.provider?.providerType) || "",
      notes: "",
    });
    setView("request");
    window.history.replaceState(null, "", `${window.location.pathname}?room=${encodeURIComponent(session.id)}`);
  }

  async function requestSeat(session) {
    const serviceType = form.serviceType || cleanText(data.provider?.serviceType) || cleanText(data.provider?.providerType);
    if (!serviceType) {
      showMessage("Choose the provider type that best fits this room before submitting.", "error");
      return;
    }
    setBusy(`request-${session.id}`);
    try {
      const result = await api("request-seat", {
        method: "POST",
        body: { sessionId: session.id, serviceType, notes: form.notes },
      });
      const roomName = cleanText(session.name) || "this room";
      showMessage(
        result.request.status === "Waitlist"
          ? `Waitlist request received for ${roomName}. It will stay visible in My RSVPs while it is reviewed.`
          : `Request received for ${roomName}. Your RSVP is pending review and will stay visible in My RSVPs.`,
      );
      await load();
      setView("details");
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setBusy("");
    }
  }

  async function cancelSeat(request) {
    if (!request?.id) return;
    setBusy(`cancel-${request.id}`);
    try {
      const result = await api("cancel-seat", {
        method: "POST",
        body: { requestId: request.id },
      });
      showMessage(`Your RSVP for ${result.request?.sessionName || "this room"} was removed.`);
      await load();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setBusy("");
    }
  }

  return <main className="referral-provider-page referral-room-v2">
    <ReferralHero />
    <section className="content-shell referral-room-stage">
      {message ? <InlineMessage message={message} onClose={() => setMessage(null)} /> : null}
      {loading ? <RoomLoading /> : <>
        <RoomNav view={view} setView={setView} rsvpCount={activeAttendance.length} />
        {view === "browse" ? <BrowseRooms sessions={data.sessions} attendance={activeAttendance} onDetails={goToDetails} onRequest={goToRequest} /> : null}
        {view === "details" ? <RoomDetails session={selectedSession} sessions={data.sessions} attendance={activeAttendance} onSelect={goToDetails} onBrowse={() => setView("browse")} onRequest={goToRequest} onCancel={cancelSeat} onViewRsvps={() => setView("rsvps")} busy={busy} /> : null}
        {view === "request" ? <RequestSeat session={selectedSession} provider={data.provider} form={form} setForm={setForm} onBrowse={() => setView("browse")} onSubmit={requestSeat} busy={busy} /> : null}
        {view === "rsvps" ? <MyRsvps attendance={activeAttendance} sessions={data.sessions} onDetails={goToDetails} onCancel={cancelSeat} onBrowse={() => setView("browse")} busy={busy} /> : null}
      </>}
    </section>
  </main>;
}

function ReferralHero() {
  return <section className="referral-hero-v2">
    <div>
      <p className="eyebrow">Provider referral circles</p>
      <h1>The Referral Room</h1>
      <p>Small, curated rooms for providers to meet, exchange thoughtful referrals, and build aligned community across New Jersey and Pennsylvania.</p>
    </div>
    <aside>
      <CheckCircle2 size={20} />
      <span><strong>Verified status</strong><small>Verified means a provider has been personally introduced within The Healing Directory referral community. Attending and participating in The Referral Room may help your profile become Verified.</small></span>
    </aside>
  </section>;
}

function RoomNav({ view, setView, rsvpCount }) {
  return <nav className="referral-room-tabs" aria-label="The Referral Room views">
    <button className={view === "browse" ? "active" : ""} onClick={() => setView("browse")}>Browse</button>
    <button className={view === "details" ? "active" : ""} onClick={() => setView("details")}>Room details</button>
    <button className={view === "request" ? "active" : ""} onClick={() => setView("request")}>Request a seat</button>
    <button className={view === "rsvps" ? "active" : ""} onClick={() => setView("rsvps")}>My RSVPs <span>{rsvpCount}</span></button>
  </nav>;
}

function BrowseRooms({ sessions, attendance, onDetails, onRequest }) {
  if (!sessions.length) return <RoomEmpty title="No upcoming rooms yet" text="New Referral Room dates will appear here when registration opens." />;
  return <div className="room-card-grid">
    {sessions.map((session) => {
      const request = requestForSession(attendance, session.id);
      const total = Number(session.totalSeats || 0);
      const open = Number(session.remaining || 0);
      const status = request ? statusLabel(request.status) : "";
      return <article className="room-tile" key={session.id}>
        <div className="room-tile-top">
          <span className="date-dot">{shortDate(session.date)}</span>
          {request ? <Status value={status} /> : null}
        </div>
        <h2>{cleanText(session.name) || "The Referral Room"}</h2>
        <p>{roomDescription(session)}</p>
        <div className="room-progress-meta">
          <strong>{sessionOpenText(session)}</strong>
          <span>{providerTypeCount(session)}</span>
        </div>
        <div className="room-progress"><span style={{ width: `${progressWidth(open, total)}%` }} /></div>
        <button className={request ? "button subtle full" : "button full"} onClick={() => request ? onDetails(session) : onRequest(session)}>
          {request ? "Manage RSVP" : "Request a seat"} <ArrowRight size={18} />
        </button>
      </article>;
    })}
  </div>;
}

function RoomDetails({ session, sessions, attendance, onSelect, onBrowse, onRequest, onCancel, onViewRsvps, busy }) {
  if (!session) return <RoomEmpty title="Choose a room" text="Select an upcoming room to review details." />;
  const request = requestForSession(attendance, session.id);
  return <div className="room-detail-layout">
    <div className="room-detail-main">
      <button className="back-link" onClick={onBrowse}>← All rooms</button>
      <div className="room-chip-row">
        {sessions.map((item) => <button key={item.id} className={item.id === session.id ? "active" : ""} onClick={() => onSelect(item)}>{cleanText(item.name) || "Room"}</button>)}
      </div>
      <article className="room-detail-card">
        <header>
          <p className="eyebrow">{formatDate(session.date)}</p>
          <h2>{cleanText(session.name) || "The Referral Room"}</h2>
          <p>{roomDescription(session)}</p>
        </header>
        <div className="room-stat-strip">
          <RoomStat label="Total seats" value={session.totalSeats || 0} />
          <RoomStat label="Seats open" value={session.remaining || 0} />
          <RoomStat label="Approved" value={session.accepted || 0} />
        </div>
        <SeatMix session={session} />
      </article>
    </div>
    <aside className="room-side-panel">
      <section>
        <p className="eyebrow">Your seat</p>
        {request ? <>
          <div className="seat-status-row"><Status value={statusLabel(request.status)} /><strong>{request.serviceType || "Provider"}</strong></div>
          <p>{statusLabel(request.status) === "Pending" ? "Your request is waiting for review." : "Your RSVP is connected to this room."}</p>
          <button className="button subtle full" onClick={onViewRsvps}>Manage RSVP</button>
          <button className="button subtle full" disabled={busy === `cancel-${request.id}`} onClick={() => onCancel(request)}>
            {busy === `cancel-${request.id}` ? <RefreshCw className="spin" size={16} /> : null} Remove RSVP
          </button>
        </> : <>
          <p>Review the room mix, then request a seat if it feels aligned.</p>
          <button className="button full" onClick={() => onRequest(session)}>Request a seat <ArrowRight size={18} /></button>
        </>}
      </section>
      <section className="verification-soft">
        <CheckCircle2 size={18} />
        <p><strong>Verified</strong> means a provider has been personally introduced within The Healing Directory referral community. Attending and participating in The Referral Room may help your profile become Verified.</p>
      </section>
    </aside>
  </div>;
}

function SeatMix({ session }) {
  const rules = Array.isArray(session.rules) ? session.rules : [];
  const approved = Array.isArray(session.approvedProviders) ? session.approvedProviders : [];
  if (!rules.length) {
    return <section className="approved-provider-panel">
      <p className="eyebrow">Approved providers</p>
      <ApprovedProviderList providers={approved} emptyText="No approved providers have been added yet." />
    </section>;
  }
  const fullRules = rules.filter((rule) => rule.remaining <= 0 || rule.accepting === false);
  const openRules = rules.filter((rule) => Number(rule.remaining || 0) > 0 && rule.accepting !== false);
  const isCompact = rules.length > 6;
  return <section className={`approved-provider-panel ${isCompact ? "compact-seat-panel" : ""}`}>
    <div className="seat-panel-heading">
      <div>
        <p className="eyebrow">Provider mix</p>
        <h3>{isCompact ? "Seat options" : "Open seats by provider type"}</h3>
      </div>
      <span>{openRules.length ? `${openRules.length} provider type${openRules.length === 1 ? "" : "s"} with open seats` : "Waitlist review only"}{fullRules.length ? ` · ${fullRules.length} waitlist-only` : ""}</span>
    </div>
    <div className="seat-mix-list">
      {rules.map((rule) => <SeatMixRow key={rule.id || rule.serviceType} rule={rule} compact={isCompact} />)}
    </div>
  </section>;
}

function SeatMixRow({ rule, compact = false }) {
  const providers = Array.isArray(rule.approvedProviders) ? rule.approvedProviders : [];
  const open = Math.max(Number(rule.remaining || 0), 0);
  const limit = Number(rule.seatLimit || 0);
  return <article className={`${open ? "seat-mix-row" : "seat-mix-row full"} ${compact ? "compact" : ""}`}>
    <div>
      <h4>{rule.serviceType || "Provider type"}</h4>
      <p>{open}/{limit || open} seats open</p>
    </div>
    <ApprovedProviderList providers={providers} fallbackType={rule.serviceType} emptyText={compact ? "" : "No approved providers yet."} />
  </article>;
}

function RequestSeat({ session, provider, form, setForm, onBrowse, onSubmit, busy }) {
  if (!session) return <RoomEmpty title="Choose a room" text="Pick an upcoming room before submitting a request." />;
  const choices = providerChoices(session, provider);
  const hasOpenChoice = choices.some((choice) => choice.open);
  return <div className="request-page">
    <button className="back-link" onClick={onBrowse}>← All rooms</button>
    <article className="request-room-summary">
      <p className="eyebrow">{formatDate(session.date)}</p>
      <h2>{cleanText(session.name) || "The Referral Room"}</h2>
      <p>{roomDescription(session)}</p>
      <span>{sessionOpenText(session)}</span>
    </article>
    <section className="request-form-panel">
      <h2>Request a seat</h2>
      <label className="field">
        <span>Your provider type *</span>
        <select value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })}>
          <option value="">Select your provider type...</option>
          {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </select>
      </label>
      <label className="field full-field">
        <span>Optional note to The Healing Directory</span>
        <textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Share anything helpful about your practice or why you'd like to join this room." />
      </label>
      {!hasOpenChoice ? <p className="form-note">This room may be full, but you can still request waitlist review.</p> : null}
      <button className="button full" disabled={busy === `request-${session.id}`} onClick={() => onSubmit(session)}>
        {busy === `request-${session.id}` ? <RefreshCw className="spin" size={16} /> : null} Submit request
      </button>
    </section>
  </div>;
}

function MyRsvps({ attendance, sessions, onDetails, onCancel, onBrowse, busy }) {
  const groups = [
    { key: "pending", label: "Pending", items: attendance.filter((item) => normalize(item.status).includes("pending") || normalize(item.status).includes("waitlist")) },
    { key: "accepted", label: "Accepted", items: attendance.filter((item) => statusLabel(item.status) === "Accepted") },
    { key: "attended", label: "Attended", items: attendance.filter((item) => normalize(item.status).includes("attend") || item.attended) },
  ];
  return <div className="my-rsvps-page">
    <p className="eyebrow">My Referral Room</p>
    <h2>My RSVPs</h2>
    <p>Track your requests, approvals, and attended rooms in one place.</p>
    <div className="rsvp-columns">
      {groups.map((group) => <section key={group.key}>
        <header><span>{group.label}</span><b>{group.items.length}</b></header>
        {group.items.length ? group.items.map((item) => {
          const session = sessions.find((candidate) => candidate.id === item.sessionId);
          return <article className="rsvp-card" key={item.id}>
            <p>{formatDate(item.sessionDate || session?.date)}</p>
            <h3>{cleanText(item.sessionName) || cleanText(session?.name) || "The Referral Room"}</h3>
            <span>{item.serviceType || "Provider"}</span>
            <div>
              <Status value={statusLabel(item.status)} />
              <button onClick={() => session && onDetails(session)}>Manage →</button>
            </div>
            {group.key !== "attended" ? <button className="text-button" disabled={busy === `cancel-${item.id}`} onClick={() => onCancel(item)}>Remove RSVP</button> : null}
          </article>;
        }) : <p className="empty-column">Nothing here yet.</p>}
      </section>)}
    </div>
    <section className="verification-wide">
      <CheckCircle2 size={24} />
      <p><strong>About verification</strong><br /><strong>Verified</strong> means a provider has been personally introduced within The Healing Directory referral community. Attending and participating in The Referral Room may help your profile become Verified.</p>
      <button className="button" onClick={onBrowse}>Browse upcoming rooms</button>
    </section>
  </div>;
}

function ApprovedProviderList({ providers = [], fallbackType, emptyText = "No approved providers yet." }) {
  if (!providers.length) return emptyText ? <p className="seat-empty">{emptyText}</p> : null;
  return <div className="approved-provider-list">
    {providers.map((provider, index) => {
      const item = normalizeProviderSummary(provider, fallbackType);
      const content = <>
        {item.photo ? <img src={item.photo} alt="" /> : <span>{initials(item.name)}</span>}
        <b>{item.name}</b>
        {item.serviceType ? <small>{item.serviceType}</small> : null}
      </>;
      return item.profileUrl
        ? <a key={`${item.name}-${index}`} href={item.profileUrl}>{content}</a>
        : <div key={`${item.name}-${index}`}>{content}</div>;
    })}
  </div>;
}

function InlineMessage({ message, onClose }) {
  return <div className={`referral-message ${message.type === "error" ? "error" : "success"}`}>
    <CheckCircle2 size={20} />
    <span>{message.text}</span>
    <button onClick={onClose} aria-label="Dismiss message"><X size={18} /></button>
  </div>;
}

function RoomStat({ label, value }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function Status({ value }) {
  const label = statusLabel(value);
  const tone = label === "Accepted" || label === "Attended" ? "good" : label === "Cancelled" ? "bad" : "warm";
  return <span className={`status ${tone}`}>{label}</span>;
}

function RoomLoading() {
  return <div className="state"><RefreshCw className="spin" /><h2>Loading The Referral Room...</h2></div>;
}

function RoomEmpty({ title, text }) {
  return <div className="state"><Sparkles /><h2>{title}</h2><p>{text}</p></div>;
}

function providerChoices(session, provider) {
  const providerType = cleanText(provider?.serviceType) || cleanText(provider?.providerType);
  const rules = Array.isArray(session.rules) ? session.rules : [];
  if (rules.length) {
    return rules.map((rule) => {
      const open = rule.remaining > 0 && rule.accepting !== false;
      return {
        value: cleanText(rule.serviceType),
        open,
        label: open ? `${cleanText(rule.serviceType)} (${rule.remaining} open)` : `${cleanText(rule.serviceType)} — waitlist only`,
      };
    });
  }
  return providerType ? [{ value: providerType, open: session.remaining > 0, label: providerType }] : [];
}

function normalizeProviderSummary(provider, fallbackType = "Provider") {
  if (provider?.fields) return normalizeProviderSummary({ id: provider.id, ...provider.fields }, fallbackType);
  if (provider?.record) return normalizeProviderSummary(provider.record, fallbackType);
  if (provider?.provider) return normalizeProviderSummary(provider.provider, fallbackType);
  if (provider?.linkedProvider) return normalizeProviderSummary(provider.linkedProvider, fallbackType);
  if (provider?.approvedProvider) return normalizeProviderSummary(provider.approvedProvider, fallbackType);
  if (provider?.name && typeof provider.name === "object") return normalizeProviderSummary({ ...provider, name: displayText(provider.name) }, fallbackType);
  if (typeof provider === "string") return { name: provider, serviceType: fallbackType, photo: "", profileUrl: "" };
  const name = cleanText(fieldFromObject(provider, ["Name", "name", "Full Name", "full_name", "Provider / Practice Name", "Provider Name", "providerName", "Practice Name", "Display Name", "displayName", "Email", "Provider Email", "email"])) || "Approved provider";
  const rawProfileId = cleanText(fieldFromObject(provider, ["Profile ID", "Provider Record ID", "recordId", "id"])) || cleanText(provider?.id) || cleanText(provider?.profileId);
  return {
    name,
    serviceType: cleanText(fieldFromObject(provider, ["Provider Type", "Service Type", "serviceType", "providerType"])) || fallbackType,
    photo: attachmentUrl(fieldFromObject(provider, ["Profile Photo", "Profile Photo URL", "Photo", "photo", "photoUrl", "profilePhoto"])),
    profileUrl: cleanText(fieldFromObject(provider, ["Profile URL", "profileUrl"])) || (rawProfileId ? `/provider-details?id=${encodeURIComponent(rawProfileId)}` : ""),
  };
}

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  const headers = { "Content-Type": "application/json" };
  const token = getAccessToken();
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
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function requestForSession(attendance, sessionId) {
  return attendance.find((item) => item.sessionId === sessionId);
}

function statusLabel(value) {
  const clean = normalize(value);
  if (clean.includes("attend")) return "Attended";
  if (clean.includes("accept") || clean.includes("approv") || clean.includes("confirm")) return "Accepted";
  if (clean.includes("wait")) return "Waitlist";
  if (clean.includes("cancel") || clean.includes("declin") || clean.includes("remove")) return "Cancelled";
  return "Pending";
}

function progressWidth(open, total) {
  if (!total) return open ? 100 : 0;
  return Math.max(4, Math.min(100, (open / total) * 100));
}

function roomDescription(session) {
  return cleanText(session?.description) || ROOM_FALLBACK_DESCRIPTION;
}

function sessionOpenText(session) {
  const open = Number(session?.remaining || 0);
  const total = Number(session?.totalSeats || 0);
  return `${open} of ${total || open} seats open`;
}

function providerTypeCount(session) {
  const count = Array.isArray(session?.rules) ? session.rules.length : 0;
  if (!count) return "Open provider mix";
  return `${count} provider type${count === 1 ? "" : "s"}`;
}

function shortDate(value) {
  const time = new Date(value || 0).getTime();
  if (!time || Number.isNaN(time)) return "Date coming soon";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(time);
}

function formatDate(value) {
  const time = new Date(value || 0).getTime();
  if (!time || Number.isNaN(time)) return "Date and time coming soon";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(time);
}

function displayText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const direct = value.name ?? value.fullName ?? value.full_name ?? value.displayName ?? value.providerName ?? value.title ?? value.label ?? value.value ?? value.text ?? value.email;
    if (direct != null) return displayText(direct);
    if (value.fields) return displayText(value.fields.Name ?? value.fields.name ?? value.fields["Full Name"] ?? value.fields["Provider Name"] ?? value.fields.Email ?? value.fields.email);
    return "";
  }
  return String(value);
}

function cleanText(value) {
  const text = displayText(value).trim();
  return text === "[object Object]" ? "" : text;
}

function fieldFromObject(value, names) {
  if (!value || typeof value !== "object") return "";
  for (const name of names) {
    if (value[name] != null) return value[name];
    if (value.fields?.[name] != null) return value.fields[name];
  }
  return "";
}

function attachmentUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return attachmentUrl(value[0]);
  if (typeof value === "object") {
    return cleanText(value.url) || cleanText(value.thumbnails?.large?.url) || cleanText(value.thumbnails?.full?.url) || cleanText(value.thumbnails?.small?.url);
  }
  return "";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function isCancelled(value) {
  const clean = normalize(value);
  return clean.includes("cancel") || clean.includes("declin") || clean.includes("remove");
}

function initials(value) {
  return cleanText(value).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HD";
}
