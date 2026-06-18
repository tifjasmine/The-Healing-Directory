import React from "react";
import {
  acceptInvite,
  getUser,
  login,
  requestPasswordRecovery,
  signup,
  updateUser,
} from "@netlify/identity";
import { ChevronDown, HeartHandshake, LogIn, Users } from "lucide-react";
import ProviderSignupPage from "./ProviderSignupPage.jsx";
import MemberSignupPage from "./MemberSignupPage.jsx";

const APP_API = "/.netlify/functions/app-api";

export default function AuthAccess({ path }) {
  const mode = path.replace("/", "") || "login";
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "", accountType: "client", phone: "", website: "", professionalTitle: "", message: "" });
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const inviteFlow = mode === "reset-password" && new URLSearchParams(window.location.search).get("flow") === "invite";
  const signingUp = mode === "signup";
  const providerSignup = mode === "provider-signup";
  const title = providerSignup ? "Apply as a provider" : signingUp ? "Create your client account" : mode === "forgot-password" ? "Reset your password" : inviteFlow ? "Create your password" : mode === "reset-password" ? "Choose a new password" : "Welcome back";
  const intro = signingUp || providerSignup
    ? providerSignup
      ? "Provider applications are reviewed before access is granted."
      : "Client accounts get access right away to save providers and events."
    : inviteFlow
      ? "Create a password to finish accepting your provider invitation."
    : "Log in to save providers, manage events, and return to your dashboard.";

  if (providerSignup) return <ProviderSignupPage />;
  if (signingUp) return <MemberSignupPage />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (providerSignup) {
        await api("signup-profile", {
          method: "POST",
          body: {
            name: form.name,
            email: form.email,
            accountType: "provider",
            phone: form.phone,
            website: form.website,
            professionalTitle: form.professionalTitle,
            message: form.message
          }
        });
        setNotice("Your provider application was received. You will hear back after review.");
        return;
      }
      if (signingUp) {
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        if (!strongPassword(form.password)) throw new Error("Please choose a stronger password with at least 10 characters, mixed case, a number, and a symbol.");
        await signup(form.email, form.password, { full_name: form.name, account_type: "client" });
        await api("signup-profile", { method: "POST", body: { name: form.name, email: form.email, accountType: "client" } }).catch(() => null);
        setNotice("Account created. Please check your email to verify your account before logging in.");
        return;
      }
      if (mode === "forgot-password") {
        await requestPasswordRecovery(form.email);
        setNotice("Check your email for a secure password reset link.");
        return;
      }
      if (mode === "reset-password") {
        if (form.password !== form.confirm) throw new Error("Passwords do not match.");
        if (!strongPassword(form.password)) throw new Error("Please choose a stronger password with at least 10 characters, mixed case, a number, and a symbol.");
        const inviteToken = sessionStorage.getItem("thd_invite_token");
        if (inviteFlow) {
          if (!inviteToken) throw new Error("This invite link is missing or expired. Please use the newest invite email.");
          await acceptInvite(inviteToken, form.password);
          sessionStorage.removeItem("thd_invite_token");
        } else {
          await updateUser({ password: form.password });
        }
        window.location.assign("/dashboard");
        return;
      }
      await login(form.email, form.password);
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      window.location.assign(next);
    } catch (error) {
      setNotice(authErrorMessage(error, signingUp));
    } finally {
      setBusy(false);
    }
  }

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return <div className="app-shell auth-root">
    <header className="site-header">
      <a className="brand" href="/"><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></a>
      <nav className="site-nav"><a href="/">Providers</a><a href="/events">Events</a><a href="/login?next=/client-dashboard">Dashboard</a></nav>
      <div className="account-actions">
        <a className="button compact login-button" href="/login"><LogIn size={16} /> Login</a>
        <div className="signup-menu">
          <button type="button" className="button compact signup-trigger" onClick={() => setSignupOpen((open) => !open)}>Signup <ChevronDown size={16} /></button>
          {signupOpen ? <div className="signup-dropdown">
            <button type="button" onClick={() => window.location.assign("/provider-signup")}>Become a Provider</button>
            <button type="button" onClick={() => window.location.assign("/signup")}>Become a Member</button>
          </div> : null}
        </div>
      </div>
    </header>
    {notice ? <div className="global-notice"><span>{notice}</span></div> : null}
    <main className={signingUp || providerSignup ? "auth-page signup-auth-page" : "auth-page"}><section className={providerSignup ? "auth-shell signup-auth-shell provider-auth-shell" : signingUp ? "auth-shell signup-auth-shell" : "auth-shell"}>
      <div className="auth-copy"><img src="/healing-directory-logo.svg" alt="The Healing Directory" /><p className="eyebrow">Relationship-based care</p><h1>{providerSignup ? "Join as a trusted provider." : signingUp ? "Start saving care that fits." : "Care, connection, and community."}</h1><p>{intro}</p></div>
      <form className="auth-form" onSubmit={submit}>
        <p className="eyebrow ink">{signingUp || providerSignup ? "Join the directory" : "Account access"}</p>
        <h2>{title}</h2>
        {signingUp ? <div className="signup-choice" role="tablist" aria-label="Choose account type"><button type="button" className="active"><Users size={18} /><span><strong>Client</strong><small>Save providers and events.</small></span></button><button type="button" onClick={() => window.location.assign("/provider-signup")}><HeartHandshake size={18} /><span><strong>Provider</strong><small>Apply for reviewed access.</small></span></button></div> : null}
        {providerSignup ? <div className="signup-choice provider-only" role="tablist" aria-label="Choose account type"><button type="button" className="active"><HeartHandshake size={18} /><span><strong>Provider application</strong><small>Tell us about your work and fit.</small></span></button><button type="button" onClick={() => window.location.assign("/signup")}><Users size={18} /><span><strong>Client account</strong><small>Create immediate access.</small></span></button></div> : null}
        {signingUp || providerSignup ? <Field label="Full name" value={form.name} onChange={set("name")} required /> : null}
        {mode !== "reset-password" ? <Field label="Email" type="email" value={form.email} onChange={set("email")} required /> : null}
        {providerSignup ? <><Field label="Phone" value={form.phone} onChange={set("phone")} /><Field label="Website or profile link" value={form.website} onChange={set("website")} /><Field label="Professional title" value={form.professionalTitle} onChange={set("professionalTitle")} required /><Field label="Tell us about your work" textarea value={form.message} onChange={set("message")} required /></> : null}
        {!mode.includes("forgot") && !providerSignup ? <><Field label="Password" type="password" value={form.password} onChange={set("password")} required autoComplete={mode === "login" ? "current-password" : "new-password"} />{mode !== "login" ? <PasswordRequirements password={form.password} /> : null}</> : null}
        {signingUp || mode === "reset-password" ? <Field label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")} required /> : null}
        <button className="button full" disabled={busy}>{busy ? "Working..." : providerSignup ? "Submit provider application" : signingUp ? "Create client account" : mode.includes("password") ? "Continue" : "Log in"}</button>
        <div className="auth-links">{mode === "login" ? <><a href="/forgot-password">Forgot password?</a><a href="/signup">Create an account</a></> : <a href="/login">Back to login</a>}</div>
      </form>
    </section></main>
  </div>;
}

function Field({ label, textarea, ...props }) {
  return <label className={textarea ? "field full-field" : "field"}><span>{label}</span>{textarea ? <textarea rows="5" {...props} /> : <input {...props} />}</label>;
}

function passwordChecks(value) {
  const password = String(value || "");
  return [
    { label: "At least 10 characters", ok: password.length >= 10 },
    { label: "Upper and lowercase letters", ok: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", ok: /\d/.test(password) },
    { label: "At least one symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

function strongPassword(value) { return passwordChecks(value).every((item) => item.ok); }

function PasswordRequirements({ password }) {
  return <div className="password-checklist compact-password-checklist">
    <strong>Strong password</strong>
    {passwordChecks(password).map((item) => <span key={item.label} className={item.ok ? "met" : ""}>{item.label}</span>)}
  </div>;
}

async function api(action, options = {}) {
  const url = new URL(APP_API, window.location.origin);
  url.searchParams.set("action", action);
  const response = await fetch(url, { method: options.method || "GET", credentials: "include", headers: { "Content-Type": "application/json" }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function authErrorMessage(error, signingUp) {
  const message = error?.message || "";
  const normalized = message.toLowerCase();
  if (signingUp && (normalized.includes("signup") || normalized.includes("registration") || normalized.includes("not allowed"))) {
    return "Client signup is being blocked by the site auth settings. In Netlify Identity, set Registration to Open so clients can create accounts right away.";
  }
  if (normalized.includes("email not confirmed") || normalized.includes("invalid_grant")) {
    return "Please verify your email before logging in. Check your inbox for the confirmation email, then try again.";
  }
  if (normalized.includes("already")) return "An account already exists for this email. Please log in instead.";
  if (normalized.includes("failed to fetch")) return "The signup service could not be reached. Please try again in a moment.";
  return message || "Authentication could not be completed.";
}
