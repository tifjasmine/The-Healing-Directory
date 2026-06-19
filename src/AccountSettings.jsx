import React from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, HeartHandshake, LayoutDashboard, LockKeyhole, RefreshCw, Save, Settings, UserRound, X } from "lucide-react";
import { requestPasswordRecovery, updateUser } from "./authClient.js";

const API = "/.netlify/functions/app-api";
const FALLBACK_INTERESTS = ["Therapist", "Coach", "Bodyworker", "Energy Worker", "Holistic Health", "Consultant", "Events", "Referral Room"];

export default function AccountSettings({ user, navigate, setNotice, setUser }) {
  const [form, setForm] = React.useState({
    name: user?.name || "",
    email: user?.email || "",
    accountType: user?.userMetadata?.account_type || user?.userMetadata?.accountType || "client",
    interests: [],
  });
  const [originalEmail, setOriginalEmail] = React.useState(user?.email || "");
  const [interestOptions, setInterestOptions] = React.useState(FALLBACK_INTERESTS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let alive = true;

    api("account-settings")
      .then((payload) => {
        if (!alive) return;
        setForm({
          name: payload.account?.name || user?.name || "",
          email: payload.account?.email || user?.email || "",
          accountType: payload.account?.accountType || "client",
          interests: payload.account?.interests || [],
        });
        setOriginalEmail(payload.account?.email || user?.email || "");
        const providerTypes = payload.directoryOptions?.providerType;
        if (Array.isArray(providerTypes) && providerTypes.length) setInterestOptions([...providerTypes, "Events", "Referral Room"]);
      })
      .catch((error) => setNotice(error.message || "Account settings could not load."))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [setNotice, user?.email, user?.name]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const nextEmail = form.email.trim().toLowerCase();
      const currentEmail = originalEmail.trim().toLowerCase();
      const emailChanged = nextEmail && nextEmail !== currentEmail;

      if (emailChanged) {
        await updateUser({
          email: nextEmail,
          data: {
            full_name: form.name,
            account_type: form.accountType,
            accountType: form.accountType,
            area_interest: form.interests,
            previous_email: originalEmail,
          },
        });
      } else {
        await updateUser({
          data: {
            full_name: form.name,
            account_type: form.accountType,
            accountType: form.accountType,
            area_interest: form.interests,
          },
        }).catch(() => null);
      }

      const payload = await api("save-account", { method: "POST", body: { ...form, email: originalEmail } });
      setNotice(emailChanged ? "Confirmation email sent. Your account email will update after you confirm it." : "Account settings saved.");

      if (payload.account) {
        setUser?.((current) => current ? {
          ...current,
          name: payload.account.name || current.name,
          userMetadata: {
            ...(current.userMetadata || {}),
            account_type: payload.account.accountType,
            area_interest: payload.account.interests || form.interests,
            previous_email: emailChanged ? originalEmail : current.userMetadata?.previous_email,
          },
        } : current);
      }
    } catch (error) {
      setNotice(error.message || "Account settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(value) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((item) => item !== value)
        : [...current.interests, value],
    }));
  }

  async function sendPasswordReset() {
    if (!form.email) {
      setNotice("Add an email address before requesting a password reset.");
      return;
    }

    try {
      await requestPasswordRecovery(form.email);
      setNotice("Password reset email sent.");
    } catch (error) {
      setNotice(error.message || "Password reset email could not be sent.");
    }
  }

  return (
    <main className="account-page">
      <section className="account-hero account-hero-clean">
        <div>
          <p className="brand-pill">Account</p>
          <h1>Manage your profile and access.</h1>
          <p>Keep the basics connected to your saved providers, saved events, and dashboard tools.</p>
        </div>
        <div className="account-identity">
          <UserRound size={24} />
          <span>{form.accountType === "provider" ? "Provider account" : "Member account"}</span>
          <strong>{form.email || user?.email}</strong>
        </div>
      </section>

      <section className="settings-grid">
        <form className="account-card settings-card" onSubmit={save}>
          <div className="account-card-heading">
            <Settings size={20} />
            <div>
              <h2>Account Details</h2>
              <p>Update the basics connected to your member profile.</p>
            </div>
          </div>

          {loading ? <p className="inline-status"><RefreshCw className="spin" size={16} /> Loading settings...</p> : null}

          <label className="profile-field">
            <span>Name</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" />
          </label>

          <label className="profile-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@email.com" />
          </label>

          <InterestPicker values={form.interests} options={interestOptions} onToggle={toggleInterest} />

          {form.email.trim().toLowerCase() !== originalEmail.trim().toLowerCase() ? <div className="account-email-note">Changing your email sends a confirmation link. Your saved records update after the new email is confirmed.</div> : null}

          <div className="profile-actions">
            <button type="button" className="button tertiary" onClick={sendPasswordReset}>
              <LockKeyhole size={16} />
              Send password reset
            </button>
            <button className="button" disabled={saving}>
              {saving ? <RefreshCw className="spin" size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : "Save account"}
            </button>
          </div>
        </form>

        <aside className="account-side-stack">
          <section className="account-card account-quick">
            <h2>Next Steps</h2>
            <button onClick={() => navigate(form.accountType === "provider" ? "/dashboard" : "/client-dashboard")}><LayoutDashboard size={17} /> Open dashboard <ArrowRight size={16} /></button>
            <button onClick={() => navigate("/") }><HeartHandshake size={17} /> Browse providers <ArrowRight size={16} /></button>
            <button onClick={() => navigate("/events")}><CalendarDays size={17} /> Browse events <ArrowRight size={16} /></button>
            {form.accountType === "provider" ? <button onClick={() => navigate("/edit-profile")}>Edit provider profile <ArrowRight size={16} /></button> : null}
            {form.accountType === "provider" ? <button onClick={() => navigate("/edit-membership")}>Edit membership <ArrowRight size={16} /></button> : null}
          </section>
        </aside>
      </section>
    </main>
  );
}

function InterestPicker({ values, options, onToggle }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const selected = Array.isArray(values) ? values : [];

  React.useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div className="account-interest" ref={ref}>
    <span>Interests</span>
    <button type="button" className={open ? "account-interest-trigger open" : "account-interest-trigger"} onClick={() => setOpen((current) => !current)}>
      <strong>{selected.length ? `${selected.length} selected` : "Choose interests"}</strong><ChevronDown size={17} />
    </button>
    {selected.length ? <div className="account-interest-selected">{selected.map((value) => <button type="button" key={value} onClick={() => onToggle(value)}>{value}<X size={12} /></button>)}</div> : null}
    {open ? <div className="account-interest-menu">
      {options.map((option) => <button type="button" key={option} className={selected.includes(option) ? "selected" : ""} onClick={() => onToggle(option)}><span>{selected.includes(option) ? <Check size={14} /> : null}</span>{option}</button>)}
    </div> : null}
  </div>;
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
