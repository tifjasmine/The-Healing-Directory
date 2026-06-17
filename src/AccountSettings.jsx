import React from "react";
import { ArrowRight, LockKeyhole, RefreshCw, Save, ShieldCheck, UserRound } from "lucide-react";
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
      <section className="account-hero soft-hero">
        <p className="brand-pill">Account settings</p>
        <h1>Manage your account.</h1>
        <p>Update the basics connected to your Healing Directory login and choose where you want to go next.</p>
      </section>

      <section className="settings-grid">
        <form className="account-card settings-card" onSubmit={save}>
          <div className="section-heading">
            <UserRound size={22} />
            <div>
              <h2>Profile access</h2>
              <p>Your account row stays connected to your saved providers, saved events, and provider tools.</p>
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

        <aside className="account-card account-quick">
          <ShieldCheck size={26} />
          <h2>Quick access</h2>
          <button onClick={() => navigate("/edit-profile")}>Edit provider profile <ArrowRight size={16} /></button>
          <button onClick={() => navigate("/edit-membership")}>Edit membership <ArrowRight size={16} /></button>
          <button onClick={() => navigate(form.accountType === "provider" ? "/dashboard" : "/client-dashboard")}>Open dashboard <ArrowRight size={16} /></button>
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
