import React from "react";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { getAccessToken, refreshSession } from "./authClient.js";

const API = "/.netlify/functions/referral-room";

export default function ReferralRoomProviderPage({ user, setNotice }) {
  const [data, setData] = React.useState({ sessions: [], attendance: [], serviceTypes: [] });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [page, setPage] = React.useState("browse");
  const [selectedId, setSelectedId] = React.useState("");
  const [form, setForm] = React.useState({ serviceType: "", specialtyFocus: "", notes: "" });
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("provider-data");
      const nextData = normalizePayload(payload);
      const params = new URLSearchParams(window.location.search);
      const requestedRoom = params.get("room") || "";
      setData(nextData);
      setLoadError("");
      setSelectedId((current) => requestedRoom || current || nextData.sessions?.[0]?.id || "");
      if (params.get("rsvps")) setPage("rsvps");
      else if (requestedRoom) setPage("details");
    } catch (error) {
      setLoadError(error.message || "Referral Room data could not load.");
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, [setNotice]);

  React.useEffect(() => {
    load();
  }, [load]);

  const sessions = data.sessions || [];
  const attendance = hydrateAttendance(data.attendance || [], sessions);
  const selectedSession = sessions.find((session) => session.id === selectedId) || sessions[0] || null;
  const selectedRequest = selectedSession ? attendance.find((item) => item.sessionId === selectedSession.id) : null;
  const upcoming = attendance.filter((item) => !item.attended);
  const attended = attendance.filter((item) => item.attended);

  function chooseSession(session, nextPage = "details") {
    setSelectedId(session.id);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function requestSeat(event) {
    event.preventDefault();
    if (!selectedSession) return;
    if (!form.serviceType) {
      setNotice("Choose your provider type before requesting a seat.");
      return;
    }

    setBusy("request");
    try {
      const result = await api("request-seat", {
        method: "POST",
        body: {
          sessionId: selectedSession.id,
          providerName: user?.name || "",
          ...form,
        },
      });
      setNotice(result.request.status === "Waitlist"
        ? `Your request was added to the waitlist: ${result.request.reason}.`
        : "Your Referral Room request was received.");
      await load();
      setPage("rsvps");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function removeRsvp(request) {
    if (!request?.id) return;
    setBusy(request.id);
    try {
      await api("remove-rsvp", { method: "POST", body: { requestId: request.id } });
      setNotice("Your RSVP was removed.");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="referral-provider-page room-experience">
      {loading ? (
        <section className="referral-stage"><RoomLoading /></section>
      ) : loadError ? (
        <section className="referral-stage">
          <RoomEmpty title="Referral Room could not load" text={loadError} />
        </section>
      ) : (
        <>
          {page === "browse" ? (
            <BrowseView
              sessions={sessions}
              attendance={attendance}
              onDetails={(session) => chooseSession(session, "details")}
              onRequest={(session) => chooseSession(session, "details")}
            />
          ) : null}

          {page === "details" ? (
            <DetailsView
              sessions={sessions}
              session={selectedSession}
              request={selectedRequest}
              form={form}
              setForm={setForm}
              onSelect={(session) => chooseSession(session, "details")}
              onBrowse={() => setPage("browse")}
              onManage={() => setPage("rsvps")}
              onSubmit={requestSeat}
              onRemove={removeRsvp}
              busy={busy}
            />
          ) : null}

          {page === "rsvps" ? (
            <RsvpView
              upcoming={upcoming}
              attended={attended}
              onManage={(item) => {
                setSelectedId(item.sessionId);
                setPage("details");
              }}
              onBrowse={() => setPage("browse")}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

function BrowseView({ sessions, attendance, onDetails, onRequest }) {
  return (
    <>
      <section className="room-hero">
        <div>
          <p>Provider Referral Circles</p>
          <h1>The Referral Room</h1>
          <span>Small, curated rooms for providers to meet, exchange thoughtful referrals, and build aligned community across New Jersey and Pennsylvania.</span>
        </div>
        <aside>
          <Check size={18} />
          <p><strong>Join a Referral Room to become a Verified provider.</strong> This means you have been personally introduced within The Healing Directory referral community. It is not a guarantee of fit, availability, or outcomes.</p>
        </aside>
      </section>

      <section className="room-card-grid">
        {sessions.length ? sessions.map((session) => {
          const request = attendance.find((item) => item.sessionId === session.id);
          return (
            <button className="room-preview-card clickable-room-card" type="button" key={session.id} onClick={() => request ? onDetails(session) : onRequest(session)}>
              <div className="room-preview-top">
                <span className="room-dot" style={{ background: accentFor(session.name) }} />
                <strong>{shortNumericDate(session.date)} - {session.name}</strong>
                {request ? <Status value={request.status} /> : null}
              </div>
              <h2>{session.name}</h2>
              <p>{session.description || "A curated referral circle for aligned healing professionals."}</p>
              <div className="room-preview-rule" />
              <div className="room-preview-meta">
                <strong>{session.remaining} of {session.totalSeats} seats open</strong>
                <span>{session.rules.length} provider types</span>
              </div>
              <div className="room-progress"><i style={{ width: `${fillPercent(session)}%` }} /></div>
              <span className={request ? "room-outline-button" : "room-solid-button"}>
                {request ? "Manage RSVP" : "Request a seat"}
              </span>
            </button>
          );
        }) : <RoomEmpty title="No upcoming rooms yet" text="New Referral Room sessions will appear here when registration opens." />}
      </section>
    </>
  );
}

function DetailsView({ sessions, session, request, form, setForm, onSelect, onBrowse, onManage, onSubmit, onRemove, busy }) {
  if (!session) return <RoomEmpty title="No room selected" text="Choose a room from Browse to see details." />;
  const fullRules = session.rules.filter((rule) => rule.remaining <= 0 || !rule.accepting);

  return (
    <section className="referral-stage">
      <button className="room-back" onClick={onBrowse}>← All rooms</button>
      <RoomPills sessions={sessions} selected={session.id} onSelect={onSelect} />
      <div className="room-detail-layout">
        <article className="room-detail-panel" style={{ "--accent": accentFor(session.name) }}>
          <p className="room-date-line">{formatDate(session.date)}</p>
          <h1>{session.name}</h1>
          <p className="room-description-large">{session.description || "A curated referral circle for aligned healing professionals."}</p>
          <div className="room-detail-rule" />
          <div className="room-stat-grid">
            <RoomStat label="Total seats" value={session.totalSeats} />
            <RoomStat label="Open" value={session.remaining} />
            <RoomStat label="Approved" value={session.accepted} />
          </div>
          <section className="approved-panel">
            <h3>Approved Providers</h3>
            <RuleLedger rules={session.rules} approvedProviders={session.approvedProviders || []} />
          </section>
        </article>
        <SideSeatPanel request={request} session={session} form={form} setForm={setForm} onManage={onManage} onSubmit={onSubmit} onRemove={onRemove} busy={busy} />
      </div>
    </section>
  );
}

function RsvpView({ upcoming, attended, onManage, onBrowse }) {
  const pending = upcoming.filter((item) => normalize(item.status).includes("pending") || normalize(item.status).includes("waitlist"));
  const accepted = upcoming.filter((item) => normalize(item.status).includes("accept"));
  const total = pending.length + accepted.length + attended.length;

  return (
    <section className="referral-stage rsvp-stage">
      <div className="rsvp-heading">
        <h1>My RSVPs</h1>
        <span>{total} room{total === 1 ? "" : "s"} across requests, approvals, and attendance.</span>
        <button className="room-outline-button rsvp-browse-button" onClick={onBrowse}>Browse rooms</button>
      </div>
      <div className="rsvp-columns">
        <RsvpColumn title="Pending" items={pending} onManage={onManage} />
        <RsvpColumn title="Accepted" items={accepted} onManage={onManage} />
        <RsvpColumn title="Attended" items={attended} onManage={onManage} />
      </div>
    </section>
  );
}

function RsvpColumn({ title, items, onManage }) {
  return (
    <section className="rsvp-column">
      <header><span className="room-dot" style={{ background: accentFor(title) }} /> <strong>{title}</strong><em>{items.length}</em></header>
      {items.length ? items.map((item) => (
        <article className="rsvp-card" key={item.id} style={{ "--accent": accentFor(item.sessionName || title) }}>
          <p>{formatDate(item.sessionDate)}</p>
          <h2>{item.sessionName || "Referral Room"}</h2>
          <span>{item.serviceType || "Provider type not listed"}</span>
          <footer><Status value={item.attended ? "Attended" : item.status} /><button onClick={() => onManage(item)}>Manage →</button></footer>
        </article>
      )) : <p className="rsvp-empty">No {title.toLowerCase()} rooms yet.</p>}
    </section>
  );
}

function SideSeatPanel({ request, session, form, setForm, onManage, onSubmit, onRemove, busy }) {
  const openRules = (session.rules || []).filter((rule) => rule.accepting !== false && rule.remaining > 0 && session.remaining > 0);
  const selectedRule = (session.rules || []).find((item) => normalize(item.serviceType) === normalize(form?.serviceType));
  const waitlist = form?.serviceType && (session.remaining <= 0 || !selectedRule || selectedRule.remaining <= 0 || selectedRule.accepting === false);
  return (
    <aside className="room-side-panel">
      <section className="seat-card">
        <h2>Your seat</h2>
        {request ? (
          <>
            <div className="seat-chip"><Status value={request.status} /><strong>{request.serviceType || "Provider type"}</strong></div>
            <button className="room-outline-button" type="button" onClick={onManage}>Manage RSVP</button>
            <button className="room-text-button" disabled={busy === request.id} onClick={() => onRemove(request)}>
              {busy === request.id ? "Removing..." : "Remove RSVP"}
            </button>
          </>
        ) : (
          <form className="seat-request-form" onSubmit={onSubmit}>
            <p>{session.remaining} of {session.totalSeats} seats open</p>
            <RoomSelect
              label="Your provider type"
              value={form.serviceType}
              onChange={(event) => setForm({ ...form, serviceType: event.target.value })}
              options={openRules.map((rule) => `${rule.serviceType} (${Math.min(rule.remaining, session.remaining)}/${rule.seatLimit})`)}
              optionValues={openRules.map((rule) => rule.serviceType)}
              placeholder="Select your provider type"
            />
            <RoomField
              label="Optional note"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Share anything helpful about your practice or why you would like to join this room."
              textarea
            />
            {form.serviceType ? <div className={waitlist ? "room-availability warm" : "room-availability"}>
              <strong>{form.serviceType}</strong>
              <span>{waitlist ? "This provider type is waitlist-only for this room." : `${Math.min(selectedRule.remaining, session.remaining)} seat${Math.min(selectedRule.remaining, session.remaining) === 1 ? "" : "s"} open for this provider type.`}</span>
            </div> : null}
            <button className={waitlist ? "room-solid-button warm" : "room-solid-button"} disabled={busy === "request" || !form.serviceType}>
              {busy === "request" ? <RefreshCw className="spin" size={16} /> : null}
              {waitlist ? "Join waitlist" : "Submit request"}
            </button>
          </form>
        )}
      </section>
    </aside>
  );
}

function RuleLedger({ rules, approvedProviders = [] }) {
  const approvedRules = rules.filter((rule) => rule.approvedProviders?.length);
  const matchedIds = new Set(approvedRules.flatMap((rule) => rule.approvedProviders.map((provider) => provider.id)));
  const unmatchedProviders = approvedProviders.filter((provider) => !matchedIds.has(provider.id));
  if (!approvedRules.length && !unmatchedProviders.length) return <p className="muted-italic">No approved providers yet.</p>;
  return (
    <div className="rule-ledger">
      {approvedRules.map((rule) => (
        <article key={rule.id || rule.serviceType}>
          <div>
            <strong>{rule.serviceType}</strong>
            <div className="rule-provider-pills">
              {rule.approvedProviders.map((provider) => <ProviderChip key={provider.id || provider.email || provider.name} provider={provider} />)}
            </div>
          </div>
          <span>{rule.approvedProviders.length}/{rule.seatLimit} approved</span>
        </article>
      ))}
      {unmatchedProviders.length ? (
        <article>
          <div>
            <strong>Approved providers</strong>
            <div className="rule-provider-pills">
              {unmatchedProviders.map((provider) => <ProviderChip key={provider.id || provider.email || provider.name} provider={provider} />)}
            </div>
          </div>
          <span>{unmatchedProviders.length} approved</span>
        </article>
      ) : null}
    </div>
  );
}

function RoomPills({ sessions, selected, onSelect }) {
  return <div className="room-pills">{sessions.map((session) => <button key={session.id} className={selected === session.id ? "active" : ""} onClick={() => onSelect(session)}>{shortNumericDate(session.date)} - {session.name}</button>)}</div>;
}

function ProviderChip({ provider }) {
  const content = <>
    <span className="provider-chip-photo">
      <span className="provider-chip-initials">{initials(provider.name)}</span>
      {provider.photo ? <img src={provider.photo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
    </span>
    <span>{provider.name || "Approved provider"}</span>
  </>;
  return provider.profileId
    ? <a href={`/provider-details?id=${encodeURIComponent(provider.profileId)}`} className="provider-chip">{content}</a>
    : <span className="provider-chip">{content}</span>;
}

function RoomField({ label, textarea, ...props }) {
  return <label className={textarea ? "room-field full" : "room-field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>;
}

function RoomSelect({ label, options, optionValues, placeholder, ...props }) {
  return <label className="room-field"><span>{label}</span><select {...props}><option value="">{placeholder}</option>{options.map((option, index) => <option key={optionValues?.[index] || option} value={optionValues?.[index] || option}>{option}</option>)}</select></label>;
}

function RoomStat({ label, value }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function Status({ value }) {
  const clean = normalize(value);
  const tone = clean.includes("accept") || clean.includes("attended") ? "good" : clean.includes("declin") || clean.includes("cancel") ? "bad" : "warm";
  return <span className={`status ${tone}`}>{value || "Pending"}</span>;
}

function RoomLoading() {
  return <div className="state"><RefreshCw className="spin" /><h2>Loading Referral Room...</h2></div>;
}

function RoomEmpty({ title, text }) {
  return <div className="state"><Sparkles /><h2>{title}</h2><p>{text}</p></div>;
}

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  let token = getAccessToken();
  if (!token) token = (await refreshSession().catch(() => null))?.access_token || getAccessToken();
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
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function normalizePayload(payload) {
  return {
    sessions: Array.isArray(payload?.sessions) ? payload.sessions : Array.isArray(payload?.rooms) ? payload.rooms : [],
    attendance: Array.isArray(payload?.attendance) ? payload.attendance : Array.isArray(payload?.requests) ? payload.requests : [],
    serviceTypes: Array.isArray(payload?.serviceTypes) ? payload.serviceTypes : [],
  };
}

function hydrateAttendance(items, sessions) {
  return items.map((item) => {
    const session = sessions.find((entry) => entry.id === item.sessionId);
    return {
      ...item,
      sessionName: item.sessionName || session?.name || "Referral Room",
      sessionDate: item.sessionDate || session?.date || "",
    };
  });
}

function fillPercent(session) {
  if (!session.totalSeats) return 0;
  return Math.max(0, Math.min(100, (session.accepted / session.totalSeats) * 100));
}

function accentFor(value) {
  const accents = ["#3d7d58", "#bc6f43", "#5f8898", "#a66caf", "#7d8b4d"];
  const text = String(value || "");
  const sum = Array.from(text).reduce((total, char) => total + char.charCodeAt(0), 0);
  return accents[sum % accents.length];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function shortDate(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) || !time
    ? "Date coming soon"
    : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(time).replace(",", " ·");
}

function shortNumericDate(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) || !time
    ? "Date TBD"
    : new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", year: "2-digit" }).format(time);
}

function initials(value) {
  return String(value || "Provider").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "P";
}

function formatDate(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) || !time
    ? "Date and time coming soon"
    : new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(time);
}
