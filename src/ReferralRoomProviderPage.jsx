import React from "react";
import { CalendarDays, RefreshCw, Sparkles } from "lucide-react";
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
          <div><h2>Choose Your Provider Type</h2><p>Your name and email are pulled from your logged-in provider account behind the scenes. Choose your service type, then open a date below and click Request This Date.</p></div>
          <div className="form-grid">
            <RoomSelect label="Service type" value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} options={data.serviceTypes} placeholder="Select your service type" />
            <RoomField label="Specialty / focus area" value={form.specialtyFocus} onChange={(event) => setForm({ ...form, specialtyFocus: event.target.value })} placeholder="Postpartum, trauma, pelvic health, nervous system..." />
            <RoomField label="Optional note" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Anything helpful about your work, fit for the theme, or referral interests." textarea />
          </div>
          <p className="provider-form-note">Each date below has its own request button and provider mix.</p>
        </section>
        <div className="room-list">{data.sessions.length ? data.sessions.map((session) => <SessionCard key={session.id} session={session} attendance={data.attendance} form={form} expanded={expanded} setExpanded={setExpanded} busy={busy} requestSeat={requestSeat} />) : <RoomEmpty title="No upcoming dates yet" text="New Referral Room sessions will appear here when registration opens." />}</div>
      </> : <AttendanceList items={tab === "attended" ? attended : upcoming} empty={tab === "attended" ? "No attended rooms yet" : "No upcoming RSVPs yet"} />}
    </section>
  </main>;
}

function SessionCard({ session, attendance, form, expanded, setExpanded, busy, requestSeat }) {
  const myRequest = attendance.find((item) => item.sessionId === session.id);
  const rule = session.rules.find((item) => normalize(item.serviceType) === normalize(form.serviceType));
  const waitlist = session.remaining <= 0 || !rule || rule.remaining <= 0;
  const open = expanded === session.id;
  const openRules = session.rules.filter((item) => item.remaining > 0 && session.remaining > 0);
  const fullRules = session.rules.filter((item) => item.remaining <= 0 || session.remaining <= 0);
  const available = rule ? Math.min(rule.remaining, session.remaining) : 0;
  return <article className="room-card">
    <button className="room-card-header" onClick={() => setExpanded(open ? "" : session.id)}><div><h2>{session.name}</h2><p>{formatDate(session.date)}</p></div><div className="room-header-meta">{myRequest ? <Status value={myRequest.status} /> : null}<span className="room-focus">{session.focus || "Referral Room"}</span><span className="room-remaining">{session.remaining} left</span><span className="room-toggle">{open ? "−" : "+"}</span></div></button>
    {open ? <div className="room-card-body">
      <p className="room-description">{session.description || "A curated referral circle for aligned healing professionals."}</p>
      <div className="room-stats"><RoomStat label="Total seats" value={session.totalSeats} /><RoomStat label="Accepted" value={session.accepted} /><RoomStat label="Remaining" value={session.remaining} /></div>
      <div className="room-types"><strong>This event is open to</strong><div className="tag-row large-tags">{openRules.length ? openRules.map((item) => <span key={item.id}>{item.serviceType}</span>) : <span className="closed">All listed provider types are currently full</span>}</div>{fullRules.length ? <><b>Slots full / waitlist only</b><div className="tag-row large-tags waitlist-tags">{fullRules.map((item) => <span className="closed" key={item.id}>{item.serviceType}</span>)}</div></> : null}</div>
      <div className={form.serviceType && waitlist ? "availability warm" : "availability good"}><strong>{form.serviceType ? `Your selected type: ${form.serviceType}` : "Choose your service type above"}</strong><span>{form.serviceType ? waitlist ? "This provider type may be waitlist-only for this room." : `${available} spot${available === 1 ? "" : "s"} may be available for this provider type.` : "Once you select your service type, this section will show whether your category appears open for this event."}</span></div>
      <div className="room-request"><div><strong>{myRequest ? "Your RSVP Status" : "Request this date"}</strong><p>{session.name} · {formatDate(session.date)}</p></div><button className={waitlist ? "button warm" : "button"} disabled={busy === session.id || Boolean(myRequest) || !form.serviceType} onClick={() => requestSeat(session)}>{busy === session.id ? <RefreshCw className="spin" size={16} /> : null}{myRequest ? myRequest.status : !form.serviceType ? "Choose Service Type First" : waitlist ? "Join Waitlist" : "Request This Date"}</button></div>
    </div> : null}
  </article>;
}

function ReferralTitle() { return <section className="page-title referral-title"><div className="content-shell title-inner"><div><p className="eyebrow ink">The Referral Room</p><h1>Referral Room Dates</h1><p>Request a seat in a small, curated referral circle. Each room is intentionally balanced across provider types so members can build trusted relationships, share aligned referrals, and get verified through participation.</p></div></div></section>; }
function AttendanceList({ items, empty }) { return items.length ? <div className="room-list">{items.map((item) => <article className="attendance-card" key={item.id}><div><h3>{item.sessionName || "Referral Room"}</h3><p><CalendarDays size={15} />{formatDate(item.sessionDate)}</p></div><Status value={item.status} /><div className="attendance-meta"><span><strong>Service type</strong>{item.serviceType || "Not listed"}</span><span><strong>Attendance</strong>{item.attended ? "Attended" : "Not attended yet"}</span><span><strong>Verification</strong>{item.verified ? "Verified" : "Pending attendance"}</span></div></article>)}</div> : <RoomEmpty title={empty} text="Your Referral Room activity will appear here." />; }
function RoomField({ label, textarea, ...props }) { return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>; }
function RoomSelect({ label, options, placeholder, ...props }) { return <label className="field"><span>{label}</span><select {...props}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function RoomStat({ label, value }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function Status({ value }) { const clean = normalize(value); const tone = clean.includes("accept") || clean.includes("attended") ? "good" : clean.includes("declin") || clean.includes("cancel") ? "bad" : "warm"; return <span className={`status ${tone}`}>{value || "Pending"}</span>; }
function RoomLoading() { return <div className="state"><RefreshCw className="spin" /><h2>Loading Referral Room...</h2></div>; }
function RoomEmpty({ title, text }) { return <div className="state"><Sparkles /><h2>{title}</h2><p>{text}</p></div>; }
async function api(action, options = {}) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); const headers = { "Content-Type": "application/json" }; const token = getAccessToken(); if (token) { headers.Authorization = `Bearer ${token}`; headers["X-Supabase-Access-Token"] = token; } const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`); return payload; }
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date and time coming soon" : new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(time); }
