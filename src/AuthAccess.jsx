import React from "react";
import {
  getUser,
  login,
  requestPasswordRecovery,
  updateUser,
} from "@netlify/identity";
import { HeartHandshake, LogIn, Users } from "lucide-react";

// Public request intake; account approval still happens after review.
const SIGNUP_API = "https://zpgvztndfkochixhuvaf.functions.supabase.co/signup-request";

export default function AuthAccess({ path }) {
  const mode = path.replace("/", "") || "login";
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "", accountType: "client", phone: "", website: "", professionalTitle: "", message: "" });
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const signingUp = mode === "signup";
  const providerSignup = signingUp && form.accountType === "provider";
  const title = signingUp ? (providerSignup ? "Apply as a provider" : "Request client access") : mode === "forgot-password" ? "Reset your password" : mode === "reset-password" ? "Choose a new password" : "Welcome back";
  const intro = signingUp
    ? providerSignup
      ? "Provider applications are reviewed before access is granted."
      : "Client accounts are reviewed so the community stays intentional."
    : "Log in to save providers, manage events, and return to your dashboard.";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (signingUp) {
        const result = await api({ method: "POST", body: form });
        setNotice(result.status === "approved" ? "Your request was received. You will hear back with access details." : "Your application was received. You will hear back after review.");
        return;
      }
      if (mode === "forgot-password") {
        await requestPasswordRecovery(form.email);
        setNotice("Check your email for a secure password reset link.");
        return;
      }
      if (mode === "reset-password") {
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        await updateUser({ password: form.password });
        window.location.assign("/dashboard");
        return;
      }
      await login(form.email, form.password);
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      window.location.assign(next);
    } catch (error) {
      setNotice(error.message || "Authentication could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return <div className="app-shell auth-root">
    <header className="site-header">
      <a className="brand" href="/"><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></a>
      <nav className="site-nav"><a href="/">Providers</a><a href="/events">Events</a></nav>
      <div className="account-actions"><a className="button compact" href="/login"><LogIn size={16} /> Log in</a></div>
    </header>
    {notice ? <div className="global-notice"><span>{notice}</span></div> : null}
    <main className="auth-page"><section className="auth-shell">
      <div className="auth-copy"><img src="/healing-directory-logo.svg" alt="The Healing Directory" /><p className="eyebrow">Relationship-based care</p><h1>Care, connection, and community.</h1><p>{intro}</p></div>
      <form className="auth-form" onSubmit={submit}>
        <p className="eyebrow ink">{signingUp ? "Join the directory" : "Account access"}</p>
        <h2>{title}</h2>
        {signingUp ? <div className="signup-choice" role="tablist" aria-label="Choose account type"><button type="button" className={form.accountType === "client" ? "active" : ""} onClick={() => setForm({ ...form, accountType: "client" })}><Users size={18} /><span><strong>Client</strong><small>Save providers and events.</small></span></button><button type="button" className={form.accountType === "provider" ? "active" : ""} onClick={() => setForm({ ...form, accountType: "provider" })}><HeartHandshake size={18} /><span><strong>Provider</strong><small>Apply for reviewed access.</small></span></button></div> : null}
        {signingUp ? <Field label="Full name" value={form.name} onChange={set("name")} required /> : null}
        {mode !== "reset-password" ? <Field label="Email" type="email" value={form.email} onChange={set("email")} required /> : null}
        {providerSignup ? <><Field label="Phone" value={form.phone} onChange={set("phone")} /><Field label="Website or profile link" value={form.website} onChange={set("website")} /><Field label="Professional title" value={form.professionalTitle} onChange={set("professionalTitle")} required /><Field label="Tell us about your work" textarea value={form.message} onChange={set("message")} required /></> : null}
        {!mode.includes("forgot") && !signingUp ? <Field label="Password" type="password" value={form.password} onChange={set("password")} required /> : null}
        {mode === "reset-password" ? <Field label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")} required /> : null}
        <button className="button full" disabled={busy}>{busy ? "Working..." : providerSignup ? "Submit provider application" : signingUp ? "Request access" : mode.includes("password") ? "Continue" : "Log in"}</button>
        <div className="auth-links">{mode === "login" ? <><a href="/forgot-password">Forgot password?</a><a href="/signup">Create an account</a></> : <a href="/login">Back to login</a>}</div>
      </form>
    </section></main>
  </div>;
}

function Field({ label, textarea, ...props }) {
  return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>;
}

async function api(options = {}) {
  const response = await fetch(SIGNUP_API, { method: options.method || "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}
