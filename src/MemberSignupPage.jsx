import React from "react";
import { signup } from "./authClient.js";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Heart,
  Loader,
  Mail,
  Sparkles,
} from "lucide-react";

const APP_API = "/.netlify/functions/app-api";
const FALLBACK_INTERESTS = ["Therapist", "Coach", "Bodyworker", "Energy Worker", "Holistic Health", "Consultant", "Events", "Referral Room"];

export default function MemberSignupPage() {
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "", areaInterest: [] });
  const [options, setOptions] = React.useState(FALLBACK_INTERESTS);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    api("directory-options")
      .then((payload) => {
        if (!active) return;
        const providerTypes = payload.directoryOptions?.providerType;
        if (Array.isArray(providerTypes) && providerTypes.length) setOptions(providerTypes);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const passwordChecks = passwordChecklist(form.password);
  const passwordReady = passwordChecks.every((item) => item.ok);
  const valid = form.name.trim() && validEmail(form.email) && passwordReady && form.password === form.confirm && form.areaInterest.length;

  function change(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  function toggle(value) {
    setForm((current) => ({
      ...current,
      areaInterest: current.areaInterest.includes(value)
        ? current.areaInterest.filter((item) => item !== value)
        : [...current.areaInterest, value],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    if (!valid) {
      setNotice(form.password && !passwordReady ? "Please choose a stronger password before creating your account." : "Please complete each field and choose at least one area of interest.");
      return;
    }
    setBusy(true);
    try {
      await signup(form.email, form.password, {
        full_name: form.name,
        account_type: "client",
        area_interest: form.areaInterest,
      });
      await api("signup-profile", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          accountType: "client",
          areaInterest: form.areaInterest,
          application: { areaInterest: form.areaInterest },
        },
      });
      setSubmitted(true);
    } catch (error) {
      setNotice(memberErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return <MemberSuccess email={form.email} />;

  return <div className="member-signup-page">
    <section className="member-signup-hero">
      <div>
        <p className="member-kicker">The Healing Directory</p>
        <h1>Become a member</h1>
        <p>Save providers, keep track of events, and come back to the healing support that feels aligned.</p>
      </div>
    </section>

    <main className="member-signup-shell">
      <form className="member-signup-card" onSubmit={submit}>
        <div className="member-card-head">
          <span><Heart size={18} /></span>
          <div>
            <h2>Create your member account</h2>
            <p>Members get immediate access after email verification.</p>
          </div>
        </div>

        <label className="member-field"><span>Full name *</span><input value={form.name} onChange={change("name")} placeholder="Jane Smith" /></label>
        <label className="member-field"><span>Email *</span><input type="email" value={form.email} onChange={change("email")} placeholder="you@email.com" /></label>

        <div className="member-interest">
          <span>Area of interest *</span>
          <div className="member-interest-pills">
            {options.map((option) => <button type="button" key={option} className={form.areaInterest.includes(option) ? "selected" : ""} onClick={() => toggle(option)}>{form.areaInterest.includes(option) ? <Check size={14} /> : null}{option}</button>)}
          </div>
        </div>

        <label className="member-field"><span>Password *</span><input type="password" value={form.password} onChange={change("password")} placeholder="Create a strong password" autoComplete="new-password" /></label>
        <PasswordChecklist checks={passwordChecks} />
        <label className="member-field"><span>Confirm password *</span><input type="password" value={form.confirm} onChange={change("confirm")} placeholder="Retype password" /></label>

        {notice ? <div className="member-notice"><AlertCircle size={16} />{notice}</div> : null}

        <button className="member-submit" disabled={busy || !valid}>{busy ? <Loader className="spin" size={16} /> : <Sparkles size={16} />}{busy ? "Creating account" : "Create member account"}</button>
        <div className="member-links"><a href="/login">Already have an account?</a><a href="/provider-signup">Become a provider</a></div>
      </form>
    </main>
  </div>;
}

function MemberSuccess({ email }) {
  return <div className="member-signup-page">
    <section className="member-signup-hero">
      <div>
        <p className="member-kicker">The Healing Directory</p>
        <h1>Check your email</h1>
        <p>Your member account was created. Verify your email to finish logging in.</p>
      </div>
    </section>
    <main className="member-signup-shell">
      <section className="member-signup-card member-success-card">
        <CheckCircle2 size={48} />
        <h2>Verification sent</h2>
        <p>We sent a verification email to <strong>{email}</strong>. After you verify, you can log in and use your dashboard.</p>
        <p>Questions? Email <a href="mailto:admin@thehealingdirectory.com">admin@thehealingdirectory.com</a>.</p>
        <a className="member-submit member-success-link" href="/login"><Mail size={16} /> Go to login <ArrowRight size={15} /></a>
      </section>
    </main>
  </div>;
}

async function api(action, options = {}) {
  const url = new URL(APP_API, window.location.origin);
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

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function passwordChecklist(value) {
  const password = String(value || "");
  return [
    { label: "At least 10 characters", ok: password.length >= 10 },
    { label: "Upper and lowercase letters", ok: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", ok: /\d/.test(password) },
    { label: "At least one symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

function PasswordChecklist({ checks }) {
  return <div className="password-checklist" aria-live="polite">
    <strong>Password requirements</strong>
    {checks.map((item) => <span key={item.label} className={item.ok ? "met" : ""}><Check size={13} />{item.label}</span>)}
  </div>;
}

function memberErrorMessage(error) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();
  if (normalized.includes("already")) return "An account already exists for this email. Please log in instead.";
  if (normalized.includes("registration") || normalized.includes("signup") || normalized.includes("not allowed")) return "Member signup is being blocked by the Supabase auth settings. Check that email signup is enabled.";
  if (normalized.includes("password")) return "Please choose a stronger password with at least 10 characters, mixed case, a number, and a symbol.";
  if (normalized.includes("failed to fetch")) return "The signup service could not be reached. Please try again in a moment.";
  return message || "Account could not be created.";
}
