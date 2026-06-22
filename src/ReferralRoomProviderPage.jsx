import React from "react";
import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { getAccessToken } from "./authClient.js";

const API = "/.netlify/functions/referral-room";

export default function ReferralRoomProviderPage({ user, setNotice }) {
  const query = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedRoomId = query.get("room") || "";
  const [data, setData] = React.useState({ sessions: [], attendance: [], serviceTypes: [] });
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState("");
  const [form, setForm] = React.useState({ serviceType: "", specialtyFocus: "", notes: "" });
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(() => {
    return api("provider-data")
      .then((payload) => {
        setData(payload);
        setExpanded((value) => value || requestedRoomId || payload.sessions?.[0]?.id || "");
      })
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [requestedRoomId, setNotice]);

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
        : `Request received for ${session.name}. Your RSVP is pending review and will stay visible under this room.`);
      await load();
    } catch (error) {
      setNotice(error.message);
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
      setNotice(`Your RSVP for ${result.request?.sessionName || "this room"} was removed.`);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  const activeAttendance = data.attendance.filter((item) => !isCancelled(item.status));

  return <main className="referral-provider-page">
    <ReferralTitle />
    <section className="content-shell referral-shell">
      {loading ? <RoomLoading />
        : <div className="room-list">{data.sessions.length ? data.sessions.map((session) => <SessionCard key={session.id} session={session} attendance={activeAttendance} form={form} setForm={setForm} serviceTypes={data.serviceTypes} expanded={expanded} setExpanded={setExpanded} busy={busy} requestSeat={requestSeat} cancelSeat={cancelSeat} />) : <RoomEmpty title="No upcoming dates yet" text="New dates for The Referral Room will appear here when registration opens." />}</div>}
    </section>
  </main>;
}

function SessionCard({ session, attendance, form, setForm, serviceTypes, expanded, setExpanded, busy, requestSeat, cancelSeat }) {
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
  const fit = seatFitMessage({ serviceType: form.serviceType, rule, session, available, roomFull, typeFull, hasRules });
  return <article className="room-card">
    <button className="room-card-header" aria-expanded={open} onClick={() => setExpanded(open ? "" : session.id)}><div><h2>{session.name || "The Referral Room"}</h2><p>{formatDate(session.date)}</p></div><div className="room-header-meta">{myRequest ? <Status value={myRequest.status} /> : null}<span className="room-remaining">{session.remaining} open</span><span className="room-toggle" aria-hidden="true">{open ? "−" : "+"}</span></div></button>
    {open ? <div className="room-card-body">
      <p className="room-description">{session.description || "A curated referral circle for aligned healing professionals."}</p>
      <SeatRules rules={session.rules} hasRules={hasRules} openRules={openRules} fullRules={fullRules} approvedProviders={session.approvedProviders || []} />
      {!myRequest ? <section className="room-request-details">
        <div>
          <h3>Request this room</h3>
          <p>Choose the provider type that best fits your work. Your request stays pending until The Healing Directory reviews it.</p>
        </div>
        <div className="form-grid">
          <RoomSelect label="Your provider type" value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })} options={serviceTypes} placeholder="Select the closest fit" />
          <RoomField label="Specialty / focus area" value={form.specialtyFocus} onChange={(event) => setForm({ ...form, specialtyFocus: event.target.value })} placeholder="Postpartum, trauma, pelvic health, nervous system..." />
          <RoomField label="Optional note to The Healing Directory" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Anything helpful about your work, fit for the theme, or referral interests." textarea />
        </div>
      </section> : null}
      {!myRequest ? <div className={`availability ${fit.tone}`}><strong>{fit.title}</strong><span>{fit.text}</span></div> : null}
      {myRequest ? <div className="room-request existing-request">
        <div><strong>You already have an RSVP for this room</strong><p>{session.name} · {formatDate(session.date)} · {myRequest.status || "Pending"}</p></div>
        <button className="button subtle" disabled={busy === `cancel-${myRequest.id}`} onClick={() => cancelSeat(myRequest)}>{busy === `cancel-${myRequest.id}` ? <RefreshCw className="spin" size={16} /> : null}Remove my RSVP</button>
      </div> : <div className="room-request"><div><strong>{waitlist ? "Request waitlist review" : "Request this seat"}</strong><p>{session.name} · {formatDate(session.date)}</p></div><button className={waitlist ? "button warm" : "button"} disabled={busy === session.id || !form.serviceType} onClick={() => requestSeat(session)}>{busy === session.id ? <RefreshCw className="spin" size={16} /> : null}{!form.serviceType ? "Choose your provider type first" : waitlist ? "Join waitlist" : "Request this seat"}</button></div>}
    </div> : null}
  </article>;
}

function SeatRules({ rules, hasRules, openRules, fullRules, approvedProviders = [] }) {
  if (!hasRules) {
    return <div className="room-types"><strong>Who this room is inviting</strong><p>This room does not have specific provider-type seats set yet, so requests will be reviewed for overall group balance.</p></div>;
  }
  const displayRules = rules.map((rule) => {
    const ruleProviders = providersForRule(rule, approvedProviders);
    const taken = Math.max(Number(rule.taken || 0), ruleProviders.length);
    return { ...rule, displayProviders: ruleProviders, displayTaken: taken, displayRemaining: Math.max(Number(rule.seatLimit || 0) - taken, 0) };
  });
  const matchedProviderKeys = new Set(displayRules.flatMap((rule) => rule.displayProviders.map(providerKey)));
  const unmatchedProviders = approvedProviders.filter((provider) => !matchedProviderKeys.has(providerKey(provider)));
  return <section className="seat-rule-panel">
    <div className="seat-rule-heading">
      <strong>Who this room is inviting</strong>
      <span>{openRules.length} provider type{openRules.length === 1 ? "" : "s"} with open seats · {fullRules.length} waitlist-only</span>
    </div>
    {unmatchedProviders.length ? <div className="seat-approved-summary"><strong>Approved, not matched to a seat type yet:</strong><ApprovedProviderList providers={unmatchedProviders} fallbackType="Provider" /></div> : null}
    <div className="seat-rule-grid">
      {displayRules.map((rule) => (
        <article className={rule.displayRemaining > 0 && rule.accepting !== false ? "seat-rule-card" : "seat-rule-card full"} key={rule.id || rule.serviceType}>
          <div>
            <strong>{rule.serviceType || "Provider type"}</strong>
            <small>{rule.accepting === false ? "Not accepting" : rule.displayRemaining > 0 ? "Accepting requests" : "Waitlist only"}</small>
          </div>
          <p className="seat-rule-limit"><strong>{rule.displayRemaining || 0}/{rule.seatLimit || 0}</strong> seats open</p>
          <ApprovedProviderList providers={rule.displayProviders} fallbackType={rule.serviceType} />
        </article>
      ))}
    </div>
  </section>;
}

function providersForRule(rule, approvedProviders = []) {
  const existing = Array.isArray(rule.approvedProviders) ? rule.approvedProviders : [];
  const seen = new Set(existing.map(providerKey));
  const inferred = approvedProviders.filter((provider) => providerTypeMatches(displayText(provider?.serviceType), displayText(rule?.serviceType)) && !seen.has(providerKey(provider)));
  return [...existing, ...inferred];
}

function ApprovedProviderList({ providers = [], fallbackType }) {
  if (!providers.length) return <p className="seat-empty">No approved providers in this seat yet.</p>;
  return <div className="seat-rsvps">
    <strong>RSVPs</strong>
    <div>
      {providers.map((provider, index) => {
        const item = typeof provider === "string" ? { name: provider, serviceType: fallbackType } : provider;
        const name = displayText(item.name) || displayText(item.fullName) || displayText(item.providerName) || displayText(item.email) || displayText(item) || "Approved provider";
        const serviceType = displayText(item.serviceType) || displayText(item.providerType) || fallbackType || "Provider";
        const photo = displayText(item.photo) || displayText(item.photoUrl) || displayText(item.profilePhoto);
        const content = <>
          {photo ? <img src={photo} alt="" /> : <span className="seat-rsvp-avatar">{initials(name)}</span>}
          <span><b>{name}</b><small>{serviceType}</small></span>
        </>;
        return item.profileUrl
          ? <a className="seat-rsvp" key={`${item.profileUrl}-${index}`} href={item.profileUrl}>{content}</a>
          : <span className="seat-rsvp" key={`${name}-${index}`}>{content}</span>;
      })}
    </div>
  </div>;
}

function ReferralTitle() { return <section className="page-title referral-title"><div className="content-shell title-inner"><div><p className="eyebrow ink">Provider referral circle</p><h1>The Referral Room</h1><p>Request a seat in a small, curated referral circle for relationship-based collaboration across New Jersey and Pennsylvania providers.</p><div className="verification-callout"><CheckCircle2 size={20} /><span><strong>How verification works</strong><small>Attend, participate, and The Healing Directory team can mark your provider profile as verified after the room.</small></span></div></div></div></section>; }
function RoomField({ label, textarea, ...props }) { return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="3" {...props} /> : <input {...props} />}</label>; }
function RoomSelect({ label, options, placeholder, help, ...props }) { return <label className="field"><span>{label}</span><select {...props}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>{help ? <small>{help}</small> : null}</label>; }
function RoomStat({ label, value }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function Status({ value }) { const clean = normalize(value); const tone = clean.includes("accept") || clean.includes("attended") ? "good" : clean.includes("declin") || clean.includes("cancel") ? "bad" : "warm"; return <span className={`status ${tone}`}>{value || "Pending"}</span>; }
function RoomLoading() { return <div className="state"><RefreshCw className="spin" /><h2>Loading The Referral Room...</h2></div>; }
function RoomEmpty({ title, text }) { return <div className="state"><Sparkles /><h2>{title}</h2><p>{text}</p></div>; }
async function api(action, options = {}) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); const headers = { "Content-Type": "application/json" }; const token = getAccessToken(); if (token) { headers.Authorization = `Bearer ${token}`; headers["X-Supabase-Access-Token"] = token; } const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`); return payload; }
function normalize(value) { return String(value || "").trim().toLowerCase(); }
function displayText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(displayText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const direct = value.name ?? value.fullName ?? value.providerName ?? value.title ?? value.label ?? value.value ?? value.text ?? value.email;
    if (direct != null) return displayText(direct);
    if (value.fields) return displayText(value.fields.Name ?? value.fields.name ?? value.fields.Email ?? value.fields.email);
    return "";
  }
  return String(value);
}
function compact(value) { return normalize(value).replace(/&/g, "and").replace(/[^a-z0-9]/g, ""); }
function isCancelled(value) { const clean = normalize(value); return clean.includes("cancel") || clean.includes("declin") || clean.includes("remove"); }
function initials(value) { return displayText(value).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "HD"; }
function providerKey(provider) {
  if (typeof provider === "string") return normalize(provider);
  return `${normalize(provider?.profileId || "")}|${normalize(provider?.email || "")}|${normalize(displayText(provider?.name) || displayText(provider))}`;
}
function providerTypeMatches(left, right) { const a = compact(left); const b = compact(right); return Boolean(a && b && (a === b || a.includes(b) || b.includes(a))); }
function findMatchingRule(rules, serviceType) {
  const selected = compact(serviceType);
  if (!selected) return null;
  return rules.find((item) => {
    const key = compact(item.serviceType);
    return key === selected || key.includes(selected) || selected.includes(key);
  }) || null;
}
function seatFitMessage({ serviceType, rule, session, available, roomFull, typeFull, hasRules }) {
  if (!serviceType) return {
    tone: "neutral",
    title: "Choose your provider type above",
    text: "After you choose your provider type, this room will show whether there appears to be an open seat for that type.",
  };
  if (!hasRules) return {
    tone: "good",
    title: `${serviceType} can request review`,
    text: "This room is not limited to a specific provider mix yet. The Healing Directory will review requests for fit and balance.",
  };
  if (rule && !roomFull && !typeFull && available > 0) return {
    tone: "good",
    title: `${available} open ${rule.serviceType} seat${available === 1 ? "" : "s"}`,
    text: "Your provider type matches this room's current seat options.",
  };
  if (rule && (roomFull || typeFull)) return {
    tone: "warm",
    title: `${rule.serviceType} is waitlist-only right now`,
    text: roomFull ? "The room is full, but you can still ask to join the waitlist." : "This provider-type seat is currently full or closed, but you can still ask to join the waitlist.",
  };
  return {
    tone: "warm",
    title: `${serviceType} is not listed for this room`,
    text: "You can still request review, but this room is currently prioritizing the provider types shown above.",
  };
}
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date and time coming soon" : new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(time); }
