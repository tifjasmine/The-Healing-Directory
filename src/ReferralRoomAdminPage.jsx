import React from "react";
import { Check, Plus, RefreshCw, Save, Sparkles } from "lucide-react";

const API = "/.netlify/functions/referral-room";
const SESSION_STATUSES = ["Open", "Draft", "Closed", "Full", "Cancelled"];

export default function ReferralRoomAdminPage({ setNotice }) {
  const [data, setData] = React.useState({ serviceTypes: [] });
  const [form, setForm] = React.useState({ name: "", date: defaultDate(), focus: "", status: "Open", totalSeats: 8, description: "", notes: "" });
  const [rules, setRules] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { api("manager-data").then(setData).catch((error) => setNotice(error.message)); }, [setNotice]);

  const selected = Object.entries(rules).filter(([, count]) => Number(count) > 0).map(([serviceType, seatLimit]) => ({ serviceType, seatLimit: Number(seatLimit) }));
  const categorySeatTotal = selected.reduce((total, item) => total + item.seatLimit, 0);
  const presets = {
    mothers: { name: "The Referral Room: Supporting Mothers", focus: "Mothers / Postpartum", rules: { "Birth & Postpartum Worker": 2, "Therapist / Counselor": 2, "Pelvic Floor Therapist": 2, "Nutritionist / Dietitian": 1, "Somatic Practitioner": 1 } },
    nervous: { name: "The Referral Room: Nervous System + Somatic Healing", focus: "Nervous System / Somatic Healing", rules: { "Therapist / Counselor": 2, "Somatic Practitioner": 2, "Bodywork & Massage Therapist": 1, Acupuncturist: 1, "Movement & Yoga Provider": 1, Coach: 1 } },
    family: { name: "The Referral Room: Whole Family Wellness", focus: "Family Wellness", rules: { "Therapist / Counselor": 2, "Occupational Therapist": 1, "Physical Therapist": 1, "Nutritionist / Dietitian": 1, Coach: 1, "Educator / Facilitator / Retreat Leader": 1, Other: 1 } },
  };

  function applyPreset(key) { const preset = presets[key]; setForm((current) => ({ ...current, name: preset.name, focus: preset.focus, totalSeats: 8 })); setRules(preset.rules); }
  function setOneEach() { setRules((current) => Object.fromEntries(Object.entries(current).filter(([, value]) => Number(value) > 0).map(([type]) => [type, 1]))); }
  function generateCopy() {
    const types = selected.map((item) => item.serviceType);
    const focus = form.focus || "aligned healing and wellness support";
    setForm((current) => ({
      ...current,
      description: `This Referral Room is open to ${formatList(types) || "selected healing and wellness providers"}.\n\nThis is a small, curated referral circle focused on ${focus}. The room is intentionally capped at ${form.totalSeats} total seats so the conversation stays personal, balanced, and relationship-centered.`,
      notes: `Total Seats: ${form.totalSeats}\nFocus: ${focus}\n\nProvider type caps:\n${selected.map((item) => `- ${item.serviceType}: ${item.seatLimit}`).join("\n")}`,
    }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!selected.length) return setNotice("Choose at least one provider type and category cap.");
    setBusy(true);
    try {
      await api("create-session", { method: "POST", body: { ...form, rules: selected } });
      setNotice("Referral Room session and seat rules created.");
      setForm({ name: "", date: defaultDate(), focus: "", status: "Open", totalSeats: 8, description: "", notes: "" });
      setRules({});
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }

  return <main className="referral-admin-page">
    <section className="page-title referral-title"><div className="content-shell title-inner"><div><p className="eyebrow ink">Referral Room Admin</p><h1>Create a Referral Room Session</h1><p>Create a curated Referral Room date, choose which service types are open, set category caps, and keep the full room capped at an intimate total seat count.</p></div></div></section>
    <section className="content-shell"><form className="referral-admin-grid" onSubmit={submit}>
      <section className="referral-form-panel"><h2>Session Details</h2><p>This creates the main record in The Referral Room table.</p><div className="form-grid">
        <Field label="Session name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Date and time" type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        <Select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} options={SESSION_STATUSES} />
        <Field label="Focus / theme" value={form.focus} onChange={(event) => setForm({ ...form, focus: event.target.value })} required />
        <Field label="Total seats" type="number" min="1" max="30" value={form.totalSeats} onChange={(event) => setForm({ ...form, totalSeats: Number(event.target.value) })} required />
        <div className="field admin-generate"><span>Generate copy</span><button type="button" className="button secondary" onClick={generateCopy}><Sparkles size={16} /> Generate Description + Notes</button></div>
        <Field label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} textarea required />
        <Field label="Internal notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} textarea />
      </div><div className="admin-templates"><h3>Quick Templates</h3><p>Use a template as a starting point, then adjust the copy and seat limits.</p>
        <Template title="Supporting Mothers" text="Doulas, therapists, pelvic floor, nutrition, bodywork, somatic care, and related support." onClick={() => applyPreset("mothers")} />
        <Template title="Nervous System + Somatic Healing" text="Somatic practitioners, therapists, bodywork, acupuncture, movement, and coaching." onClick={() => applyPreset("nervous")} />
        <Template title="Whole Family Wellness" text="A balanced room for emotional, physical, educational, and family-centered care." onClick={() => applyPreset("family")} />
      </div></section>
      <section className="referral-form-panel provider-cap-panel"><div className="section-heading"><div><h2>Open Provider Types + Category Caps</h2><p>Select every service type this event is open to. The room still closes when the total seat cap is reached.</p></div></div>
        <div className="cap-toolbar"><span><strong>{selected.length}</strong> types open · <strong>{categorySeatTotal}</strong> category-cap seats · <strong>{form.totalSeats}</strong> total room cap</span><div><button type="button" onClick={() => setRules({})}>Clear</button><button type="button" onClick={setOneEach}>1 each</button></div></div>
        <div className="rule-list">{(data.serviceTypes || []).map((type) => { const active = Number(rules[type] || 0) > 0; return <div className={active ? "rule-row active" : "rule-row"} key={type}><button type="button" className={active ? "rule-check active" : "rule-check"} onClick={() => setRules({ ...rules, [type]: active ? 0 : 1 })}>{active ? <Check /> : <Plus />}</button><span className="rule-copy"><strong>{type}</strong><small>Open this type. Cap how many from this category can be accepted.</small></span><input type="number" min="0" max="20" value={rules[type] || 0} onChange={(event) => setRules({ ...rules, [type]: Number(event.target.value) })} aria-label={`Cap for ${type}`} /></div>; })}</div>
        <div className="mix-preview"><h3>Selected Mix Preview</h3><div>{selected.length ? selected.map((item) => <span key={item.serviceType}>{item.serviceType} · cap {item.seatLimit}</span>) : <span>No provider types selected yet</span>}</div><p>Total accepted room cap: {form.totalSeats}. Category caps can add up to more than {form.totalSeats}; that is okay.</p></div>
        <div className="form-actions"><button className="button admin-submit" disabled={busy}>{busy ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}{busy ? "Creating" : "Create Referral Room"}</button></div>
      </section>
    </form></section>
  </main>;
}

function Field({ label, textarea, ...props }) { return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>; }
function Select({ label, options, ...props }) { return <label className="field"><span>{label}</span><select {...props}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function Template({ title, text, onClick }) { return <button type="button" onClick={onClick}><strong>{title}</strong><span>{text}</span></button>; }
async function api(action, options = {}) { const url = new URL(API, window.location.origin); url.searchParams.set("action", action); const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: options.body ? JSON.stringify(options.body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`); return payload; }
function toLocal(value) { const time = new Date(value || 0).getTime(); if (!time) return ""; const date = new Date(time); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function defaultDate() { const date = new Date(); date.setDate(date.getDate() + 14); date.setHours(18, 0, 0, 0); return toLocal(date); }
function formatList(items) { if (!items.length) return ""; if (items.length === 1) return items[0]; if (items.length === 2) return `${items[0]} and ${items[1]}`; return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`; }
