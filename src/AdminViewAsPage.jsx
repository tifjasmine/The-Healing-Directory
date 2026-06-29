import React from "react";
import { ArrowLeft, Eye, Loader, Search, X } from "lucide-react";
import { getAccessToken, refreshSession } from "./authClient.js";
import ProviderDashboard from "./ProviderDashboard.jsx";
import ClientDashboard from "./ClientDashboard.jsx";

const API = "/.netlify/functions/app-api";

export default function AdminViewAsPage() {
  const initialEmail = new URLSearchParams(window.location.search).get("email") || "";
  const [email, setEmail] = React.useState(initialEmail);
  const [preview, setPreview] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (initialEmail) load(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextEmail = email) {
    const cleanEmail = String(nextEmail || "").trim();
    if (!cleanEmail) return;
    setBusy(true);
    setError("");
    try {
      const payload = await api("view-as", { query: { email: cleanEmail } });
      setPreview(payload);
      const url = new URL(window.location.href);
      url.searchParams.set("email", cleanEmail);
      window.history.replaceState({}, "", url);
    } catch (caught) {
      setPreview(null);
      setError(caught.message || "No user found for that email.");
    } finally {
      setBusy(false);
    }
  }

  const accountType = preview?.accountType || "";
  const previewUser = preview?.user || null;
  const previewPayload = preview?.dashboard || null;

  return <div className="app-shell admin-view-as-page">
    <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/dashboard")}><span><strong>The Healing Directory</strong><small>Admin preview</small></span></button>
      <nav className="site-nav"><button onClick={() => go("/")}>Providers</button><button onClick={() => go("/events")}>Events</button><button onClick={() => go("/dashboard")}>Dashboard</button></nav>
    </header>

    <main>
      <section className="admin-view-hero">
        <button className="admin-back-button" type="button" onClick={() => go("/dashboard")}><ArrowLeft size={16} /> Back to dashboard</button>
        <div>
          <p className="admin-view-kicker"><Eye size={16} /> Admin View As</p>
          <h1>Preview an account by email.</h1>
          <p>See the dashboard data connected to a member or provider without logging in as them.</p>
        </div>
        <form className="admin-view-search" onSubmit={(event) => { event.preventDefault(); load(); }}>
          <Search size={19} />
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="provider@email.com" />
          <button className="button" disabled={busy}>{busy ? <Loader className="spin" size={16} /> : <Eye size={16} />}{busy ? "Loading" : "View as"}</button>
        </form>
        {error ? <div className="admin-view-error">{error}</div> : null}
      </section>

      {preview ? <section className="admin-preview-frame">
        <div className="admin-preview-banner">
          <span>Viewing as</span>
          <strong>{preview.user?.email}</strong>
          <em>{accountType === "provider" ? "Provider dashboard" : "Client dashboard"}</em>
          <button type="button" onClick={() => { setPreview(null); setEmail(""); window.history.replaceState({}, "", "/admin/view-as"); }}><X size={15} /> Clear</button>
        </div>
        {accountType === "provider"
          ? <ProviderDashboard hideHeader previewUser={previewUser} previewPayload={previewPayload} readOnly />
          : <ClientDashboard hideHeader previewUser={previewUser} previewPayload={previewPayload} readOnly />}
      </section> : null}
    </main>
  </div>;
}

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  Object.entries(options.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));
  const request = async (token) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { method: options.method || "GET", headers, body: options.body ? JSON.stringify(options.body) : undefined });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  };
  let token = getAccessToken();
  if (!token) token = (await refreshSession().catch(() => null))?.access_token || getAccessToken();
  let { response, payload } = await request(token);
  if (response.status === 401) {
    token = (await refreshSession().catch(() => null))?.access_token || getAccessToken();
    ({ response, payload } = await request(token));
  }
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function go(path) { window.location.assign(path); }
