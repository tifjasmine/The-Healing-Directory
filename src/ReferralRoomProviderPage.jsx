import React from "react";
import { CalendarDays, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { getAccessToken } from "./authClient.js";

const API = "/.netlify/functions/referral-room";

export default function ReferralRoomProviderPage({ user, setNotice }) {
  const [data, setData] = React.useState({ sessions: [], attendance: [], serviceTypes: [] });
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState("dates");
  const [expanded, setExpanded] = React.useState("");
  const [form, setForm] = React.useState({ serviceType: "", specialtyFocus: "", notes: "" });
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(() => {
    return api("provider-data")
      .then((payload) => {
        setData(payload);
        setExpanded((value) => value || payload.sessions?.[0]?.id || "");
      })
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [setNotice]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function requestSeat(session) {
    if (!form.serviceType) {
      setNotice("Choose your service type before requesting a seat.");
      return;
    }
    setBusy(session.id);
    try {
      const result = await api("request-seat", {
        method: "POST",
        body: { sessionId: session.id, providerName: user?.name || "", ...form },
      });
      setNotice(result.request.status === "Waitlist"
        ? `Your request was added to the waitlist: ${result.request.reason}.`
        : "Your Referral Room request was received.");
      await load();
      setTab("rsvps");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  const upcoming = data.attendance.filter((item) => !item.attended);
  const attended = data.attendance.filter((item) => item.attended);

  return <main className="referral-provider-page">
    <ReferralTitle />
    <section className="content-shell referral-shell">
      <div className="segmented referral-tabs">
        <button className={tab === "dates" ? "active" : ""} onClick={() => setTab("dates")}>Upcoming Dates</button>
        <button className={tab === "rsvps" ? "active" : ""} onClick={() => setTab("rsvps")}>My RSVPs ({upcoming.length})</button>
        <button className={tab === "attended" ? "active" : ""} onClick={() => setTab("attended")}>Attended ({attended.length})</button>
      </div>
      {loading ? <RoomLoading /> : tab === "dates" ? <>
        <section className="referral-form-panel provider-details-panel">
          <div><h2>Choose Your Provider Type</h2><p>Choose the provider type that best fits how you want to participate in this room. Attendance and participation are what make a provider eligible to be verified.</p></div>
          <div className="form-grid">
            <RoomSelect label="Provider type" value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} options={data.serviceTypes} placeholder="Select your provider type" />
            <RoomField label="Specialty / focus area" value={form.specialtyFocus} onChange={(event) => setForm({ ...form, specialtyFocus: event.target.value })} placeholder="Postpartum, trauma, pelvic health, nervous system..." />
            <RoomField label="Optional note" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Anything helpful about your work, fit for the theme, or referral interests." textarea />
          </div>
        </section>
        <div className="room-list">{data.sessions.length ? data.sessions.map((session) => <SessionCard key={session.id} session={session} attendance={data.attendance} form={form} expanded={expanded} setExpanded={setExpanded} busy={busy} requestSeat={requestSeat} />) : <RoomEmpty title="No upcoming dates yet" text="New Referral Room sessions will appear here when registration opens." />}</div>
      </> : <AttendanceList items={tab === "attended" ? attended : upcoming} empty={tab === "attended" ? "No attended rooms yet" : "No upcoming RSVPs yet"} />}
    </section>
  </main>;
}

function SessionCard({ session, attendance, form, expanded, setExpanded, busy, requestSeat }) {
  const myRequest = attendance.find((item) => item.sessionId === session.id);
  const rule = findMatchingRule(session.rules, form.serviceType);
  const hasRules = session.rules.length > 0;
  const roomFull = session.remaining <= 0;
  const typeFull = Boolean(rule && (rule.remaining <= 0 || rule.accepting === false));
  const waitlist = roomFull || typeFull;
  const open = expanded === session.id;
  const openRules = session.rules.filter((item) => item.remaining > 0 && session.remaining > 0);
  const fullRules = session.rules.filter((item) => item.remaining <= 0 || session.remaining <= 0);
  const available = rule ? Math.min(rule.remaining, session.remaining) : session.remaining;
  return <article className="room-card">
    <button className="room-card-header" onClick={() => setExpanded(open ? "" : session.id)}><div><h2>{session.name}</h2><p>{formatDate(session.date)}</p></div><div className="room-header-meta">{myRequest ? <Status value={myRequest.status} /> : null}<span className="room-focus">{session.focus || "Referral Room"}</span><span className="room-remaining">{session.remaining} left</span><span className="room-toggle">{open ? "−" : "+"}</span></div></button>
    {open ? <div className="room-card-body">
      <p className="room-description">{session.description || "A curated referral circle for aligned healing professionals."}</p>
      <div className="room-stats"><RoomStat label="Total seats" value={session.totalSeats} /><RoomStat label="Approved" value={session.accepted} /><RoomStat label="Open seats" value={session.remaining} /></div>
      <SeatRules rules={session.rules} hasRules={hasRules} openRules={openRules} fullRules={fullRules} />
      <div className={form.serviceType && waitlist ? "availability warm" : "availability good"}><strong>{form.serviceType ? `Your selected type: ${form.serviceType}` : "Choose your provider type above"}</strong><span>{form.serviceType ? waitlist ? roomFull ? "This room is waitlist-only because the room is full." : "This provider type is waitlist-only for this room." : rule ? `${available} spot${available === 1 ? "" : "s"} may be available for this provider type.` : `${available} room spot${available === 1 ? "" : "s"} may be available. The team will review your provider type for group balance.` : "Once you select your provider type, this section will show whether a seat appears open for this date."}</span></div>
      <div className="room-request"><div><strong>{myRequest ? "Your RSVP Status" : "Request this date"}</strong><p>{session.name} · {formatDate(session.date)}</p></div><button className={waitlist ? "button warm" : "button"} disabled={busy === session.id || Boolean(myRequest) || !form.serviceType} onClick={() => requestSeat(session)}>{busy === session.id ? <RefreshCw className="spin" size={16} /> : null}{myRequest ? myRequest.status : !form.serviceType ? "Choose Provider Type First" : waitlist ? "Join Waitlist" : "Request This Date"}</button></div>
    </div> : null}
  </article>;
}

function SeatRules({ rules, hasRules, openRules, fullRules }) {
  if (!hasRules) {
    return <div className="room-types"><strong>Provider seat options for this room</strong><div className="tag-row large-tags"><span>Open provider mix</span></div></div>;
  }
  return <section className="seat-rule-panel">
    <div className="seat-rule-heading">
      <strong>Provider seat options for this room</strong>
      <span>{openRules.length} accepted profession{openRules.length === 1 ? "" : "s"} with space · {fullRules.length} waitlist-only</span>
    </div>
    <div className="seat-rule-grid">
      {rules.map((rule) => (
        <article className={rule.remaining > 0 && rule.accepting !== false ? "seat-rule-card" : "seat-rule-card full"} key={rule.id || rule.serviceType}>
          <div>
            <strong>{rule.serviceType || "Provider type"}</strong>
            <small>{rule.accepting === false ? "Not accepting" : rule.remaining > 0 ? "Accepting requests" : "Waitlist only"}</small>
          </div>
          <div className="seat-rule-counts">
            <span><b>{rule.taken || 0}</b> approved</span>
            <span><b>{rule.remaining || 0}</b> open</span>
          </div>
          {rule.approvedProviders?.length ? <p>Approved: {rule.approvedProviders.join(", ")}</p> : <p>No approved providers in this seat yet.</p>}
        </article>
      ))}
    </div>
  </section>;
}

function ReferralTitle() { return <section className="page-title referral-title"><div className="content-shell title-inner"><div><p className="eyebrow ink">Provider referral circle</p><h1>Referral Room Dates</h1><p>Request a seat in a small, curated referral circle for relationship-based collaboration across New Jersey and Pennsylvania providers.</p><div className="verification-callout"><CheckCircle2 size={20} /><span><strong>How verification works</strong><small>Attend, participate, and The Healing Directory team can mark your provider profile as verified after the room.</small></span></div></div></div></section>; }
function AttendanceList({ items, empty }) { return items.length ? <div className="room-list">{items.map((item) => <article className="attendance-card" key={item.id}><div><h3>{item.sessionName || "Referral Room"}</h3><p><CalendarDays size={15} />{formatDate(item.sessionDate)}</p></div><Status value={item.status} /><div className="attendance-meta"><span><strong>Service type</strong>{item.serviceType || "Not listed"}</span><span><strong>Attendance</strong>{item.attended ? "Attended" : "Not attended yet"}</span><span><strong>Verification</strong>{item.verified ? "Verified" : "Pending attendance"}</span></div></article>)}</div> : <RoomEmpty title={empty} text="Your Referral Room activity will appear here." />; }
function RoomField({ label, textarea, ...props }) { return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>; }
function RoomSelect({ label, options, placeholder, ...props }) { return <label className="field"><span>{label}</span><select {...props}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function RoomStat({ label, value }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function Status({ value }) { const clean = normalize(value); const tone = clean.includes("accept") || clean.includes("attended") ? "good" : clean.includes("declin") || clean.includes("cancel") ? "bad" : "warm"; return <span className={`status ${tone}`}>{value || "Pending"}</span>; }
function RoomLoading() { return <div className="state"><RefreshCw className="spin" /><h2>Loading Referral Room...</h2></div>; }
function RoomEmpty({ title, text }) { return <div className="state"><Sparkles /><h2>{title}</h2><p>{text}</p></div>; }
async function api(action, options = {}) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); const headers = { "Content-Type": "application/json" }; const token = getAccessToken(); if (token) { headers.Authorization = `Bearer ${token}`; headers["X-Supabase-Access-Token"] = token; } const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`); return payload; }
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function compact(value) { return normalize(value).replace(/&/g, "and").replace(/[^a-z0-9]/g, ""); }
function findMatchingRule(rules, serviceType) {
  const selected = compact(serviceType);
  if (!selected) return null;
  return rules.find((item) => {
    const key = compact(item.serviceType);
    return key === selected || key.includes(selected) || selected.includes(key);
  }) || null;
}
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date and time coming soon" : new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(time); }
