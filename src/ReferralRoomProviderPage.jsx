import React from "react";
import { CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { getAccessToken } from "./authClient.js";

const API = "/.netlify/functions/referral-room";

export default function ReferralRoomProviderPage({ user, setNotice }) {
  const query = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const requestedRoomId = query.get("room") || "";
  const [data, setData] = React.useState({ sessions: [], attendance: [], serviceTypes: [], provider: null });
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
    setBusy(session.id);
    try {
      const providerType = displayText(data.provider?.serviceType) || form.serviceType || "";
      const result = await api("request-seat", {
        method: "POST",
        body: { sessionId: session.id, providerName: user?.name || "", ...form, serviceType: providerType },
      });
      setNotice(result.request.status === "Waitlist"
        ? `Your request was added to the waitlist: ${result.request.reason}.`
        : `Your request for ${session.name} was received. It will stay visible here as pending review.`);
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
        : <div className="room-list">{data.sessions.length ? data.sessions.map((session) => <SessionCard key={session.id} session={session} attendance={activeAttendance} form={form} setForm={setForm} provider={data.provider} expanded={expanded} setExpanded={setExpanded} busy={busy} requestSeat={requestSeat} cancelSeat={cancelSeat} />) : <RoomEmpty title="No upcoming dates yet" text="New dates for The Referral Room will appear here when registration opens." />}</div>}
    </section>
  </main>;
}

function SessionCard({ session, attendance, form, setForm, provider, expanded, setExpanded, busy, requestSeat, cancelSeat }) {
  const myRequest = attendance.find((item) => item.sessionId === session.id);
  const providerType = displayText(provider?.serviceType) || form.serviceType || "";
  const rule = findMatchingRule(session.rules, providerType);
  const hasRules = session.rules.length > 0;
  const roomFull = session.remaining <= 0;
  const typeFull = Boolean(rule && (rule.remaining <= 0 || rule.accepting === false));
  const waitlist = roomFull || typeFull;
  const open = expanded === session.id;
  return <article className={open ? "room-card open" : "room-card"}>
    <button className="room-card-header" aria-expanded={open} onClick={() => setExpanded(open ? "" : session.id)}><div><h2>{session.name || "The Referral Room"}</h2><p>{formatDate(session.date)}</p></div><div className="room-header-meta">{myRequest ? <Status value={myRequest.status} /> : null}<span className="room-remaining">{session.remaining} open</span><span className="room-toggle" aria-hidden="true">{open ? "−" : "+"}</span></div></button>
    {open ? <div className="room-card-body">
      <p className="room-description">{session.description || "A curated referral circle for aligned healing professionals."}</p>
      <SeatRules rules={session.rules} hasRules={hasRules} approvedProviders={session.approvedProviders || []} providerType={providerType} />
      {!myRequest ? <section className="room-request-details">
        <div className="room-request-copy">
          <h3>Request this room</h3>
          <p>Your provider type is matched from your profile. Add an optional note if there is anything helpful for review.</p>
        </div>
        <div className="form-grid compact">
          <RoomField label="Optional note to The Healing Directory" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Anything helpful about your work, fit for the theme, or referral interests." textarea />
        </div>
      </section> : null}
      {myRequest ? <div className="room-request existing-request">
        <div><strong>You already have an RSVP for this room</strong><p>{session.name} · {formatDate(session.date)} · {myRequest.status || "Pending"}</p></div>
        <button className="button subtle" disabled={busy === `cancel-${myRequest.id}`} onClick={() => cancelSeat(myRequest)}>{busy === `cancel-${myRequest.id}` ? <RefreshCw className="spin" size={16} /> : null}Remove my RSVP</button>
      </div> : <div className="room-request"><div><strong>{waitlist ? "Request waitlist review" : "Request this seat"}</strong><p>{session.name} · {formatDate(session.date)}</p></div><button className={waitlist ? "button warm" : "button"} disabled={busy === session.id} onClick={() => requestSeat(session)}>{busy === session.id ? <RefreshCw className="spin" size={16} /> : null}{waitlist ? "Join waitlist" : "Request this seat"}</button></div>}
    </div> : null}
  </article>;
}

function SeatRules({ rules, hasRules, approvedProviders = [], providerType = "" }) {
  if (!hasRules) {
    return <section className="seat-rule-panel seat-rule-summary">
      <div className="seat-summary-main">
        <div>
          <strong>Provider mix</strong>
          <p>This room is open for review across provider types. Requests are balanced by The Healing Directory.</p>
        </div>
        {providerType ? <div className="your-seat-match available"><span>Your provider type</span><strong>{providerType}</strong><small>Reviewed for room fit</small></div> : null}
      </div>
      <ApprovedSummary providers={approvedProviders} />
    </section>;
  }
  const displayRules = rules.map((rule) => {
    const ruleProviders = providersForRule(rule, approvedProviders);
    const taken = Math.max(Number(rule.taken || 0), ruleProviders.length);
    return { ...rule, displayProviders: ruleProviders, displayTaken: taken, displayRemaining: Math.max(Number(rule.seatLimit || 0) - taken, 0) };
  }).sort((a, b) => Number(b.displayRemaining || 0) - Number(a.displayRemaining || 0) || displayText(a.serviceType).localeCompare(displayText(b.serviceType)));
  const matchedProviderKeys = new Set(displayRules.flatMap((rule) => rule.displayProviders.map(providerKey)));
  const unmatchedProviders = approvedProviders.filter((provider) => !matchedProviderKeys.has(providerKey(provider)));
  const approvedList = approvedProvidersForSummary(displayRules, unmatchedProviders);
  const capacity = displayRules.reduce((sum, rule) => sum + Number(rule.seatLimit || 0), 0);
  const openSeats = displayRules.reduce((sum, rule) => sum + Number(rule.displayRemaining || 0), 0);
  const openRules = displayRules.filter((rule) => rule.displayRemaining > 0 && rule.accepting !== false);
  const waitlistRules = displayRules.filter((rule) => rule.displayRemaining <= 0 || rule.accepting === false);
  const yourRule = findMatchingRule(displayRules, providerType);
  return <section className="seat-rule-panel seat-rule-summary">
    <div className="seat-summary-main">
      <div>
        <strong>Provider mix</strong>
        <p>{capacity ? `${openSeats}/${capacity} seats are open across ${displayRules.length} provider type${displayRules.length === 1 ? "" : "s"}. Approved RSVPs are listed below so you can see who is already joining.` : "Requests are balanced across provider types."}</p>
      </div>
      {yourRule ? <div className={yourRule.displayRemaining > 0 && yourRule.accepting !== false ? "your-seat-match available" : "your-seat-match waitlist"}>
        <span>Your provider type</span>
        <strong>{yourRule.serviceType}</strong>
        <small>{yourRule.displayRemaining}/{yourRule.seatLimit} seats open</small>
      </div> : providerType ? <div className="your-seat-match waitlist">
        <span>Your provider type</span>
        <strong>{providerType}</strong>
        <small>Reviewed for fit</small>
      </div> : null}
    </div>
    <ApprovedSummary providers={approvedList} />
    <details className="seat-availability-details">
      <summary>View provider type availability <span>{openRules.length} open · {waitlistRules.length} waitlist-only</span></summary>
      <div className="seat-chip-grid">
        {displayRules.map((rule) => <span className={rule.displayRemaining > 0 && rule.accepting !== false ? "seat-chip" : "seat-chip full"} key={rule.id || rule.serviceType}>
          <b>{rule.serviceType || "Provider type"}</b>
          <small>{rule.displayRemaining || 0}/{rule.seatLimit || 0} open</small>
        </span>)}
      </div>
    </details>
  </section>;
}

function approvedProvidersForSummary(displayRules, unmatchedProviders = []) {
  const seen = new Set();
  const list = [];
  const add = (provider, fallbackType) => {
    const item = typeof provider === "string" ? { name: provider, serviceType: fallbackType } : { ...provider, serviceType: displayText(provider?.serviceType) || fallbackType };
    const key = providerKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    list.push(item);
  };
  displayRules.forEach((rule) => rule.displayProviders.forEach((provider) => add(provider, rule.serviceType)));
  unmatchedProviders.forEach((provider) => add(provider, "Provider"));
  return list;
}

function ApprovedSummary({ providers }) {
  return <div className="seat-approved-compact">
    <strong>Approved RSVPs</strong>
    <ApprovedProviderList providers={providers} fallbackType="Provider" emptyText="No providers have been approved for this room yet." />
  </div>;
}

function providersForRule(rule, approvedProviders = []) {
  const existing = Array.isArray(rule.approvedProviders) ? rule.approvedProviders : [];
  const seen = new Set(existing.map(providerKey));
  const inferred = approvedProviders.filter((provider) => providerTypeMatches(displayText(provider?.serviceType), displayText(rule?.serviceType)) && !seen.has(providerKey(provider)));
  return [...existing, ...inferred];
}

function ApprovedProviderList({ providers = [], fallbackType, emptyText = "No approved providers in this seat yet." }) {
  if (!providers.length) return <p className="seat-empty">{emptyText}</p>;
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

function ReferralTitle() {
  return <section className="page-title referral-title">
    <div className="content-shell title-inner">
      <div>
        <p className="eyebrow ink">Provider referral circles</p>
        <h1>The Referral Room</h1>
        <p>Small, curated rooms for providers to meet, exchange thoughtful referrals, and build aligned community across New Jersey and Pennsylvania.</p>
      </div>
      <aside className="verification-callout">
        <CheckCircle2 size={20} />
        <span><strong>Verified status</strong><small>Verified means a provider has been personally introduced within The Healing Directory referral community. Attend and participate in The Referral Room to become eligible.</small></span>
      </aside>
    </div>
  </section>;
}
function RoomField({ label, textarea, ...props }) { return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="3" {...props} /> : <input {...props} />}</label>; }
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
function formatDate(value) { const time = new Date(value || 0).getTime(); return Number.isNaN(time) || !time ? "Date and time coming soon" : new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(time); }
