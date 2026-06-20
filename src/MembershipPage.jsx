import React from "react";
import { ArrowRight, CreditCard, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { getAccessToken } from "./authClient.js";

const API = "/.netlify/functions/app-api";
const DIRECT_PORTAL_URL = import.meta.env.VITE_STRIPE_PORTAL_URL || "";

export default function MembershipPage({ user, navigate }) {
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    async function openPortal() {
      setLoading(true);
      setMessage("");
      try {
        if (DIRECT_PORTAL_URL) {
          window.location.assign(DIRECT_PORTAL_URL);
          return;
        }
        const payload = await api("stripe-portal", {
          method: "POST",
          body: { returnUrl: `${window.location.origin}/dashboard` },
        });
        if (payload.url) {
          window.location.assign(payload.url);
          return;
        }
        throw new Error("Stripe did not return a portal link.");
      } catch (error) {
        if (!alive) return;
        setMessage(error.message || "Membership billing could not be opened yet.");
        setLoading(false);
      }
    }

    openPortal();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="membership-page">
      <section className="membership-hero soft-hero">
        <p className="brand-pill">Membership</p>
        <h1>Manage your membership.</h1>
        <p>Billing and plan changes are handled securely through Stripe.</p>
      </section>

      <section className="membership-layout membership-portal-layout">
        <div className="account-card membership-card membership-portal-card">
          <div className="section-heading">
            {loading ? <RefreshCw className="spin" size={22} /> : <CreditCard size={22} />}
            <div>
              <h2>{loading ? "Opening Stripe..." : "Stripe billing portal"}</h2>
              <p>{loading ? "One moment while we create your secure billing session." : "Manage payment methods, invoices, subscriptions, and billing details in Stripe."}</p>
            </div>
          </div>

          {loading ? (
            <div className="portal-loading">
              <RefreshCw className="spin" size={28} />
              <span>Redirecting to Stripe</span>
            </div>
          ) : (
            <div className="stripe-placeholder portal-fallback">
              <ShieldCheck size={28} />
              <h3>We could not open billing automatically.</h3>
              <p>{message}</p>
              <p>If your membership was just approved, Stripe may still be connecting your customer record.</p>
              <div className="portal-actions">
                <button className="button" type="button" onClick={() => window.location.reload()}>
                  Try again <ArrowRight size={16} />
                </button>
                <a className="button tertiary" href="mailto:admin@thehealingdirectory.com">
                  Email support <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}
        </div>

        <aside className="account-card account-quick">
          <h2>Provider tools</h2>
          <p>You can keep working on your profile and events while billing is being connected.</p>
          <button onClick={() => navigate("/edit-profile")}>Edit profile <ArrowRight size={16} /></button>
          <button onClick={() => navigate("/dashboard")}>Provider dashboard <ArrowRight size={16} /></button>
        </aside>
      </section>
    </main>
  );
}

async function api(action, options = {}) {
  const url = new URL(API, window.location.origin);
  url.searchParams.set("action", action);
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(url, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}
