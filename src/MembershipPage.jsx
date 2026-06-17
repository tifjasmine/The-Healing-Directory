import React from "react";
import { ArrowRight, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";

const PRICING_TABLE_ID = import.meta.env.VITE_STRIPE_PRICING_TABLE_ID || "";
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

export default function MembershipPage({ user, navigate }) {
  const hasStripeEmbed = PRICING_TABLE_ID && STRIPE_KEY;

  React.useEffect(() => {
    if (!hasStripeEmbed || document.querySelector('script[src="https://js.stripe.com/v3/pricing-table.js"]')) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://js.stripe.com/v3/pricing-table.js";
    document.body.appendChild(script);
  }, [hasStripeEmbed]);

  return (
    <main className="membership-page">
      <section className="membership-hero soft-hero">
        <p className="brand-pill">Membership</p>
        <h1>Edit your membership.</h1>
        <p>Manage provider membership, billing, and access to relationship-based referral tools.</p>
      </section>

      <section className="membership-layout">
        <div className="account-card membership-card">
          <div className="section-heading">
            <CreditCard size={22} />
            <div>
              <h2>Stripe membership</h2>
              <p>Use the secure Stripe embed below for plan changes and billing updates.</p>
            </div>
          </div>

          {hasStripeEmbed ? (
            React.createElement("stripe-pricing-table", {
              "pricing-table-id": PRICING_TABLE_ID,
              "publishable-key": STRIPE_KEY,
              "client-reference-id": user?.id || user?.email || "",
              "customer-email": user?.email || "",
            })
          ) : (
            <div className="stripe-placeholder">
              <ShieldCheck size={28} />
              <h3>Stripe embed is ready for your keys.</h3>
              <p>Add <code>VITE_STRIPE_PRICING_TABLE_ID</code> and <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in Netlify environment variables, then redeploy.</p>
              <a className="button tertiary" href="https://dashboard.stripe.com/pricing-tables" target="_blank" rel="noreferrer">
                Open Stripe pricing tables <ExternalLink size={16} />
              </a>
            </div>
          )}
        </div>

        <aside className="account-card account-quick">
          <h2>After membership</h2>
          <p>Providers can finish the public profile, add events, and join referral spaces once their account is ready.</p>
          <button onClick={() => navigate("/edit-profile")}>Edit profile <ArrowRight size={16} /></button>
          <button onClick={() => navigate("/dashboard")}>Provider dashboard <ArrowRight size={16} /></button>
        </aside>
      </section>
    </main>
  );
}
