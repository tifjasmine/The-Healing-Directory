import React from "react";
import { ArrowRight, CalendarDays, HeartHandshake, LayoutDashboard, LockKeyhole, RefreshCw, Save, Settings, ShieldCheck, UserRound } from "lucide-react";
import { requestPasswordRecovery } from "@netlify/identity";

const API = "/.netlify/functions/app-api";

export default function AccountSettings({ user, navigate, setNotice, setUser }) {
  const [form, setForm] = React.useState({
    name: user?.name || "",
    email: user?.email || "",
    accountType: user?.userMetadata?.account_type || user?.userMetadata?.accountType || "client",
  });
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
        });
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
      const payload = await api("save-account", { method: "POST", body: form });
      setNotice("Account settings saved.");

      if (payload.account) {
        setUser?.((current) => current ? {
          ...current,
          name: payload.account.name || current.name,
          userMetadata: {
            ...(current.userMetadata || {}),
            account_type: payload.account.accountType,
          },
        } : current);
      }
    } catch (error) {
      setNotice(error.message || "Account settings could not be saved.");
    } finally {
      setSaving(false);
    }
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
              <p>Small edits here keep your login and dashboard records aligned.</p>
            </div>
          </div>

          {loading ? <p className="inline-status"><RefreshCw className="spin" size={16} /> Loading settings...</p> : null}

          <label className="profile-field">
            <span>Name</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" />
          </label>

          <label className="profile-field">
            <span>Email</span>
            <input type="email" value={form.email} readOnly />
          </label>

          <label className="profile-field">
            <span>Account type</span>
            <select value={form.accountType} onChange={(event) => update("accountType", event.target.value)}>
              <option value="client">Community member / client</option>
              <option value="provider">Provider</option>
            </select>
          </label>

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
          <section className="account-card account-summary-card">
            <ShieldCheck size={24} />
            <h2>Connected</h2>
            <p>Your saved lists use this email so providers and events appear in your dashboard.</p>
          </section>
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
