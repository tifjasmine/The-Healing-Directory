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
      setData(nextData);
      setLoadError("");
      setSelectedId((current) => current || nextData.sessions?.[0]?.id || "");
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
      <RoomNav page={page} setPage={setPage} />

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
              onRequest={(session) => chooseSession(session, "request")}
            />
          ) : null}

          {page === "details" ? (
            <DetailsView
              sessions={sessions}
              session={selectedSession}
              request={selectedRequest}
              onSelect={(session) => chooseSession(session, "details")}
              onBrowse={() => setPage("browse")}
              onRequest={() => setPage("request")}
              onRemove={removeRsvp}
              busy={busy}
            />
          ) : null}

          {page === "request" ? (
            <RequestView
              sessions={sessions}
              session={selectedSession}
              request={selectedRequest}
              serviceTypes={data.serviceTypes || []}
              form={form}
              setForm={setForm}
              onSelect={(session) => chooseSession(session, "request")}
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

function RoomNav({ page, setPage }) {
  const pages = [
    ["browse", "Browse"],
    ["details", "Room details"],
    ["request", "Request a seat"],
    ["rsvps", "My RSVPs"],
  ];

  return (
    <header className="room-nav">
      <div className="room-nav-group">
        <span>Page</span>
        <div className="room-segment">
          {pages.map(([key, label]) => (
            <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
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
          <Check size={20} />
          <p><strong>Verified status</strong> · personally introduced within our community. Attending can help you qualify.</p>
        </aside>
      </section>

      <section className="room-card-grid">
        {sessions.length ? sessions.map((session) => {
          const request = attendance.find((item) => item.sessionId === session.id);
          return (
            <article className="room-preview-card" key={session.id}>
              <div className="room-preview-top">
                <span className="room-dot" style={{ background: accentFor(session.name) }} />
                <strong>{shortDate(session.date)}</strong>
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
              <button className={request ? "room-outline-button" : "room-solid-button"} onClick={() => request ? onDetails(session) : onRequest(session)}>
                {request ? "Manage RSVP" : "Request a seat"}
              </button>
            </article>
          );
        }) : <RoomEmpty title="No upcoming rooms yet" text="New Referral Room sessions will appear here when registration opens." />}
      </section>
    </>
  );
}

function DetailsView({ sessions, session, request, onSelect, onBrowse, onRequest, onRemove, busy }) {
  if (!session) return <RoomEmpty title="No room selected" text="Choose a room from Browse to see details." />;
  const fullRules = session.rules.filter((rule) => rule.remaining <= 0 || !rule.accepting);
  const openTypeCount = session.rules.filter((rule) => rule.remaining > 0 && rule.accepting && session.remaining > 0).length;

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
            <p>
              {openTypeCount ? `${openTypeCount} of ${session.rules.length} provider types still have open seats.` : "All listed provider types are currently full."}
              {fullRules.length ? <> <strong>Full: {fullRules.map((rule) => rule.serviceType).join(", ")}</strong></> : null}
            </p>
            <RuleLedger rules={session.rules} />
          </section>
        </article>
        <SideSeatPanel request={request} session={session} onRequest={onRequest} onRemove={onRemove} busy={busy} />
      </div>
    </section>
  );
}

function RequestView({ sessions, session, request, serviceTypes, form, setForm, onSelect, onSubmit, onRemove, busy }) {
  if (!session) return <RoomEmpty title="No room selected" text="Choose a room from Browse before requesting a seat." />;
  const rule = session.rules.find((item) => normalize(item.serviceType) === normalize(form.serviceType));
  const waitlist = form.serviceType && (session.remaining <= 0 || !rule || rule.remaining <= 0 || !rule.accepting);

  return (
    <section className="referral-stage">
      <RoomPills sessions={sessions} selected={session.id} onSelect={onSelect} />
      <div className="room-detail-layout">
        <form className="room-request-panel" onSubmit={onSubmit}>
          <p className="room-date-line">{formatDate(session.date)}</p>
          <h1>Request a seat</h1>
          <p className="room-description-large">Choose the provider type you want represented in this room. The manager will review fit and seat balance before approval.</p>
          <div className="room-form-grid">
            <RoomSelect
              label="Provider type"
              value={form.serviceType}
              onChange={(event) => setForm({ ...form, serviceType: event.target.value })}
              options={serviceTypes}
              placeholder="Select your provider type"
            />
            <RoomField
              label="Specialty / focus area"
              value={form.specialtyFocus}
              onChange={(event) => setForm({ ...form, specialtyFocus: event.target.value })}
              placeholder="Postpartum, trauma, pelvic health, nervous system..."
            />
            <RoomField
              label="Optional note"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Anything helpful about your work, fit for the theme, or referral interests."
              textarea
            />
          </div>
          <div className={waitlist ? "room-availability warm" : "room-availability"}>
            <strong>{form.serviceType || "Choose your provider type"}</strong>
            <span>
              {!form.serviceType
                ? "Availability will appear after you choose a provider type."
                : waitlist
                  ? "This provider type is waitlist-only for this room."
                  : `${Math.min(rule.remaining, session.remaining)} seat${Math.min(rule.remaining, session.remaining) === 1 ? "" : "s"} open for this provider type.`}
            </span>
          </div>
          <button className={waitlist ? "room-solid-button warm" : "room-solid-button"} disabled={busy === "request" || Boolean(request) || !form.serviceType}>
            {busy === "request" ? <RefreshCw className="spin" size={16} /> : null}
            {request ? `Already ${request.status}` : waitlist ? "Join waitlist" : "Request this date"}
          </button>
        </form>
        <SideSeatPanel request={request} session={session} onRequest={null} onRemove={onRemove} busy={busy} />
      </div>
    </section>
  );
}

function RsvpView({ upcoming, attended, onManage, onBrowse }) {
  const pending = upcoming.filter((item) => normalize(item.status).includes("pending") || normalize(item.status).includes("waitlist"));
  const accepted = upcoming.filter((item) => normalize(item.status).includes("accept"));

  return (
    <section className="referral-stage">
      <div className="rsvp-heading">
        <p>My Referral Room</p>
        <h1>My RSVPs</h1>
        <span>Tracking {pending.length + accepted.length + attended.length} rooms across your requests, approvals, and attendance.</span>
      </div>
      <div className="rsvp-columns">
        <RsvpColumn title="Pending" items={pending} onManage={onManage} />
        <RsvpColumn title="Accepted" items={accepted} onManage={onManage} />
        <RsvpColumn title="Attended" items={attended} onManage={onManage} />
      </div>
      <section className="verification-banner">
        <Check />
        <div>
          <h2>About verification</h2>
          <p>Attending and participating in The Referral Room may help your profile become <strong>Verified</strong> within The Healing Directory. You have {attended.length} attended room{attended.length === 1 ? "" : "s"} so far.</p>
        </div>
        <button className="room-solid-button" onClick={onBrowse}>Browse upcoming rooms</button>
      </section>
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

function SideSeatPanel({ request, session, onRequest, onRemove, busy }) {
  return (
    <aside className="room-side-panel">
      <section className="seat-card">
        <h2>Your seat</h2>
        {request ? (
          <>
            <div className="seat-chip"><Status value={request.status} /><strong>{request.serviceType || "Provider type"}</strong></div>
            <p>{request.reason || (normalize(request.status).includes("accept") ? "Reviewed for fit" : "Awaiting manager review")}</p>
            <button className="room-outline-button" onClick={onRequest || undefined}>Manage RSVP</button>
            <button className="room-text-button" disabled={busy === request.id} onClick={() => onRemove(request)}>
              {busy === request.id ? "Removing..." : "Remove RSVP"}
            </button>
          </>
        ) : (
          <>
            <p>{session.remaining} of {session.totalSeats} seats open</p>
            {onRequest ? <button className="room-solid-button" onClick={onRequest}>Request a seat</button> : null}
          </>
        )}
      </section>
      <section className="verify-card">
        <h2>✓ About verification</h2>
        <p>Attending and participating may help your profile become <strong>Verified</strong> within The Healing Directory.</p>
      </section>
    </aside>
  );
}

function RuleLedger({ rules }) {
  if (!rules.length) return <p className="muted-italic">No provider seat rules have been added yet.</p>;
  return (
    <div className="rule-ledger">
      {rules.map((rule) => (
        <article key={rule.id || rule.serviceType}>
          <strong>{rule.serviceType}</strong>
          <span>{rule.remaining}/{rule.seatLimit} open</span>
        </article>
      ))}
    </div>
  );
}

function RoomPills({ sessions, selected, onSelect }) {
  return <div className="room-pills">{sessions.map((session) => <button key={session.id} className={selected === session.id ? "active" : ""} onClick={() => onSelect(session)}>{session.name}</button>)}</div>;
}

function RoomField({ label, textarea, ...props }) {
  return <label className={textarea ? "room-field full" : "room-field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>;
}

function RoomSelect({ label, options, placeholder, ...props }) {
  return <label className="room-field"><span>{label}</span><select {...props}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
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
