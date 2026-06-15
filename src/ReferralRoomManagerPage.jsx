import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";

const API = "/.netlify/functions/referral-room";
const REQUESTS_PER_PAGE = 5;
const STATUSES = ["Pending", "Accepted", "Waitlist", "Declined", "Attended", "Cancelled"];
const REASONS = [
  "",
  "Room Full",
  "Provider Type Full",
  "Provider Type Not Open",
  "Provider Type Closed",
  "Balanced Group Fit",
  "Other",
];
const SESSION_STATUSES = ["Open", "Draft", "Closed", "Full", "Cancelled"];

export default function ReferralRoomManagerPage({ setNotice }) {
  const [data, setData] = React.useState({ requests: [], sessions: [] });
  const [drafts, setDrafts] = React.useState({});
  const [tab, setTab] = React.useState("requests");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [sessionFilter, setSessionFilter] = React.useState("All");
  const [query, setQuery] = React.useState("");
  const [expanded, setExpanded] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("manager-data");
      setData(payload);
      setDrafts(Object.fromEntries((payload.requests || []).map((item) => {
        const email = buildEmail(item, item.status, item.reason);
        return [item.id, {
          status: item.status || "Pending",
          reason: item.reason || "",
          attended: Boolean(item.attended),
          verified: Boolean(item.verified),
          managerNote: "",
          sendEmail: false,
          emailSubject: email.subject,
          emailBody: email.body,
        }];
      })));
      setPage(1);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, [setNotice]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { setPage(1); setExpanded(""); }, [statusFilter, sessionFilter, query]);

  const counts = React.useMemo(() => {
    const next = { total: data.requests.length, pending: 0, accepted: 0, waitlist: 0, attended: 0, verified: 0 };
    data.requests.forEach((item) => {
      const status = normalize(item.status);
      if (status.includes("pending")) next.pending += 1;
      if (status.includes("accept")) next.accepted += 1;
      if (status.includes("waitlist")) next.waitlist += 1;
      if (status.includes("attended")) next.attended += 1;
      if (item.verified) next.verified += 1;
    });
    return next;
  }, [data.requests]);

  const filtered = React.useMemo(() => data.requests.filter((item) => {
    const statusMatch = statusFilter === "All" || normalize(item.status) === normalize(statusFilter);
    const sessionMatch = sessionFilter === "All" || item.sessionId === sessionFilter;
    const text = [item.providerName, item.email, item.serviceType, item.specialtyFocus, item.sessionName, item.status]
      .join(" ").toLowerCase();
    return statusMatch && sessionMatch && (!query.trim() || text.includes(query.trim().toLowerCase()));
  }), [data.requests, query, sessionFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REQUESTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const shown = filtered.slice((safePage - 1) * REQUESTS_PER_PAGE, safePage * REQUESTS_PER_PAGE);

  function change(id, values) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...values } }));
  }

  function changeStatus(item, status) {
    const draft = drafts[item.id] || {};
    const email = buildEmail(item, status, draft.reason);
    change(item.id, {
      status,
      attended: status === "Attended" ? true : draft.attended,
      emailSubject: email.subject,
      emailBody: email.body,
    });
  }

  function changeReason(item, reason) {
    const draft = drafts[item.id] || {};
    const email = buildEmail(item, draft.status || item.status, reason);
    change(item.id, { reason, emailSubject: email.subject, emailBody: email.body });
  }

  async function saveRequest(item) {
    const draft = drafts[item.id] || {};
    setBusy(item.id);
    try {
      await api("update-request", {
        method: "POST",
        body: {
          requestId: item.id,
          status: draft.status,
          reason: draft.reason,
          attended: draft.attended,
          verified: draft.verified,
          managerNote: draft.managerNote,
        },
      });
      if (draft.sendEmail && item.email) {
        window.location.href = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(draft.emailSubject || "")}&body=${encodeURIComponent(draft.emailBody || "")}`;
        setNotice("Request updated. Your prepared email draft is opening.");
      } else {
        setNotice("Referral Room request updated.");
      }
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  async function saveSession(session) {
    setBusy(session.id);
    try {
      await api("update-session", {
        method: "POST",
        body: {
          sessionId: session.id,
          name: session.name,
          date: session.date,
          focus: session.focus,
          status: session.status,
          description: session.description,
          notes: session.notes,
        },
      });
      setNotice("Referral Room event content updated.");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="referral-manager-page">
      <section className="manager-hero">
        <p className="manager-eyebrow"><span />Manager</p>
        <h1>Referral Room Manager</h1>
        <p>Review requests, accept or waitlist providers, prepare status emails, mark attendance, verify providers, and edit Referral Room event content.</p>
      </section>

      <section className="manager-workspace">
        <div className="manager-tabs">
          <button className={tab === "requests" ? "active" : ""} onClick={() => setTab("requests")}>Requests</button>
          <button className={tab === "events" ? "active" : ""} onClick={() => setTab("events")}>Event Content</button>
          <button onClick={load}><RefreshCw size={16} />Refresh</button>
        </div>

        {tab === "requests" ? (
          <>
            <div className="manager-stats">
              <ManagerStat label="Total" value={counts.total} />
              <ManagerStat label="Pending" value={counts.pending} />
              <ManagerStat label="Accepted" value={counts.accepted} />
              <ManagerStat label="Waitlist" value={counts.waitlist} />
              <ManagerStat label="Attended" value={counts.attended} />
              <ManagerStat label="Verified" value={counts.verified} />
            </div>

            <div className="manager-filters">
              <label><span>Search</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, service type..." /></div></label>
              <ManagerSelect label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} options={["All", ...STATUSES]} />
              <label><span>Event</span><select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)}><option value="All">All Events</option>{data.sessions.map((session) => <option key={session.id} value={session.id}>{session.name} - {formatDate(session.date)}</option>)}</select></label>
            </div>

            <div className="manager-pagination">
              <strong>{filtered.length ? `Showing ${(safePage - 1) * REQUESTS_PER_PAGE + 1}-${Math.min(safePage * REQUESTS_PER_PAGE, filtered.length)} of ${filtered.length} requests` : "Showing 0 requests"}</strong>
              <div>
                <button disabled={safePage <= 1} onClick={() => { setPage((value) => Math.max(1, value - 1)); setExpanded(""); }}><ChevronLeft size={17} />Previous</button>
                <button disabled={safePage >= totalPages} onClick={() => { setPage((value) => Math.min(totalPages, value + 1)); setExpanded(""); }}>Next<ChevronRight size={17} /></button>
              </div>
            </div>

            {loading ? <ManagerEmpty title="Loading manager data..." /> : shown.length ? (
              <div className="manager-request-list">
                {shown.map((item) => {
                  const draft = drafts[item.id] || {};
                  const open = expanded === item.id;
                  return (
                    <article className="manager-request-card" key={item.id}>
                      <button className="manager-request-summary" onClick={() => setExpanded(open ? "" : item.id)}>
                        <div>
                          <h2>{item.providerName || item.email || "Provider"}</h2>
                          <p>{item.sessionName || "Referral Room"} · {formatDate(item.sessionDate)}</p>
                          <span>{item.serviceType || "No service type"}</span>
                        </div>
                        <div><StatusPill value={draft.status || item.status} /><b>{open ? "−" : "+"}</b></div>
                      </button>

                      {open ? (
                        <div className="manager-request-body">
                          <div className="manager-meta-grid">
                            <Meta label="Email" value={item.email || "Missing email"} />
                            <Meta label="Service Type" value={item.serviceType || "Not listed"} />
                            <Meta label="Specialty / Focus" value={item.specialtyFocus || "Not listed"} />
                            <Meta label="Current Status" value={item.status || "Pending"} />
                          </div>

                          <div className="manager-editor-grid">
                            <ManagerSelect label="Choose Status" value={draft.status || "Pending"} onChange={(event) => changeStatus(item, event.target.value)} options={STATUSES} />
                            <ManagerSelect label="Reason" value={draft.reason || ""} onChange={(event) => changeReason(item, event.target.value)} options={REASONS} emptyLabel="No reason" />
                            <fieldset><legend>Attendance</legend><Check label="Mark attended" checked={Boolean(draft.attended)} onChange={(checked) => change(item.id, { attended: checked, status: checked ? "Attended" : draft.status })} /><Check label="Mark verified" checked={Boolean(draft.verified)} onChange={(checked) => change(item.id, { verified: checked, attended: checked || draft.attended, status: checked ? "Attended" : draft.status })} /></fieldset>
                            <fieldset><legend>Email</legend><Check label="Open email draft when saved" checked={Boolean(draft.sendEmail)} onChange={(checked) => change(item.id, { sendEmail: checked })} /><button className="manager-secondary" onClick={() => { const email = buildEmail(item, draft.status, draft.reason); change(item.id, { emailSubject: email.subject, emailBody: email.body }); }}><Mail size={16} />Generate Email</button></fieldset>
                            <ManagerField className="full" label="Email Subject" value={draft.emailSubject || ""} onChange={(event) => change(item.id, { emailSubject: event.target.value })} />
                            <ManagerField className="full" label="Email Body" textarea value={draft.emailBody || ""} onChange={(event) => change(item.id, { emailBody: event.target.value })} />
                            <ManagerField className="full" label="Internal Manager Note" textarea value={draft.managerNote || ""} onChange={(event) => change(item.id, { managerNote: event.target.value })} placeholder="Optional private note for this request." />
                          </div>

                          <div className="manager-save-row">
                            <button disabled={busy === item.id} onClick={() => saveRequest(item)}><Save size={16} />{busy === item.id ? "Saving..." : draft.sendEmail ? "Save + Open Email" : "Save Status"}</button>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : <ManagerEmpty title="No matching requests" text="Try changing the filters or refreshing the page." />}
          </>
        ) : (
          <div className="manager-event-list">
            {loading ? <ManagerEmpty title="Loading event content..." /> : data.sessions.length ? data.sessions.map((session) => (
              <article className="manager-event-card" key={session.id}>
                <div className="manager-event-heading"><div><h2>{session.name}</h2><p>{formatDate(session.date)}</p></div><StatusPill value={session.status} /></div>
                <div className="manager-editor-grid">
                  <ManagerField label="Session Name" value={session.name || ""} onChange={(event) => updateSession(setData, session.id, { name: event.target.value })} />
                  <ManagerField label="Session Date + Time" type="datetime-local" value={toLocal(session.date)} onChange={(event) => updateSession(setData, session.id, { date: event.target.value })} />
                  <ManagerField label="Focus" value={session.focus || ""} onChange={(event) => updateSession(setData, session.id, { focus: event.target.value })} />
                  <ManagerSelect label="Status" value={session.status || "Open"} onChange={(event) => updateSession(setData, session.id, { status: event.target.value })} options={SESSION_STATUSES} />
                  <ManagerField className="full" label="Description" textarea value={session.description || ""} onChange={(event) => updateSession(setData, session.id, { description: event.target.value })} />
                  <ManagerField className="full" label="Internal Notes" textarea value={session.notes || ""} onChange={(event) => updateSession(setData, session.id, { notes: event.target.value })} />
                </div>
                <div className="manager-save-row"><button disabled={busy === session.id} onClick={() => saveSession(session)}><Save size={16} />{busy === session.id ? "Saving..." : "Save Event Content"}</button></div>
              </article>
            )) : <ManagerEmpty title="No Referral Room events found" />}
          </div>
        )}
      </section>
    </main>
  );
}

function ManagerStat({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function Meta({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function ManagerField({ label, textarea, className = "", ...props }) {
  return <label className={className}><span>{label}</span>{textarea ? <textarea rows="6" {...props} /> : <input {...props} />}</label>;
}

function ManagerSelect({ label, options, emptyLabel, ...props }) {
  return <label><span>{label}</span><select {...props}>{options.map((option) => <option key={option || "empty"} value={option}>{option || emptyLabel}</option>)}</select></label>;
}

function Check({ label, checked, onChange }) {
  return <label className="manager-check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}

function StatusPill({ value }) {
  const status = normalize(value);
  const tone = status.includes("accept") || status.includes("attended") || status === "open"
    ? "accepted"
    : status.includes("waitlist")
      ? "waitlist"
      : status.includes("declin") || status.includes("cancel") || status === "closed"
        ? "declined"
        : "pending";
  return <span className={`manager-status ${tone}`}>{value || "Pending"}</span>;
}

function ManagerEmpty({ title, text }) {
  return <div className="manager-empty"><h2>{title}</h2>{text ? <p>{text}</p> : null}</div>;
}

function updateSession(setData, id, values) {
  setData((current) => ({ ...current, sessions: current.sessions.map((item) => item.id === id ? { ...item, ...values } : item) }));
}

function buildEmail(item, statusValue, reasonValue) {
  const status = cleanStatus(statusValue);
  const firstName = String(item.providerName || "there").trim().split(/\s+/)[0] || "there";
  const session = item.sessionName || "The Referral Room";
  const date = formatDate(item.sessionDate);
  const reason = reasonValue ? ` because ${String(reasonValue).toLowerCase()}` : "";
  if (status === "Accepted") return { subject: `You've been accepted for ${session}`, body: `Hi ${firstName},\n\nYou've been accepted for ${session} on ${date}.\n\nI'm looking forward to having you in this Referral Room. This is a small, intentionally curated referral circle, so please only hold this seat if you're able to attend live.\n\nI'll send any final details before the event.\n\nWarmly,\nTiffany` };
  if (status === "Waitlist") return { subject: `Referral Room waitlist update for ${session}`, body: `Hi ${firstName},\n\nThank you for requesting a seat for ${session} on ${date}.\n\nAt this time, I'm adding you to the waitlist${reason}. The Referral Room is intentionally balanced by provider type, so I'm keeping the group small and diverse.\n\nIf a seat opens, I'll reach out with an update.\n\nWarmly,\nTiffany` };
  if (status === "Declined") return { subject: `Referral Room request update for ${session}`, body: `Hi ${firstName},\n\nThank you for requesting a seat for ${session} on ${date}.\n\nUnfortunately, I'm not able to offer you a seat for this one${reason}. This does not mean you won't be a fit for a future room.\n\nWarmly,\nTiffany` };
  if (status === "Attended") return { subject: `Thank you for attending ${session}`, body: `Hi ${firstName},\n\nThank you for attending ${session} on ${date}.\n\nI'm so glad you joined the conversation. Your participation can now be reflected in your Healing Directory verification status.\n\nWarmly,\nTiffany` };
  return { subject: `Referral Room request update for ${session}`, body: `Hi ${firstName},\n\nThank you for requesting a seat for ${session} on ${date}.\n\nYour request is currently marked as: ${status}.\n\nI'll follow up with any additional details as the room is finalized.\n\nWarmly,\nTiffany` };
}

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  const response = await fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function cleanStatus(value) {
  const text = String(value || "").trim();
  if (/attended/i.test(text)) return "Attended";
  if (/accepted|confirmed/i.test(text)) return "Accepted";
  if (/wait\s*list|waitlist/i.test(text)) return "Waitlist";
  if (/declined|denied|rejected/i.test(text)) return "Declined";
  if (/cancelled|canceled/i.test(text)) return "Cancelled";
  return "Pending";
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime()) || !value) return "Date and time coming soon";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toLocal(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime()) || !value) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
