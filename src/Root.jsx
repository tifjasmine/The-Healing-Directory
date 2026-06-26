import React from "react";
import { getUser, handleAuthCallback, logout } from "./authClient.js";
import { CircleUserRound, LogOut, X } from "lucide-react";
import App from "./App.jsx";
import EventWorkspace from "./EventWorkspace.jsx";
import AuthAccess from "./AuthAccess.jsx";
import ProviderDashboard from "./ProviderDashboard.jsx";
import ClientDashboard from "./ClientDashboard.jsx";
import PublicShowcase from "./PublicShowcase.jsx";
import ReferralRoomAdminPage from "./ReferralRoomAdminPage.jsx";
import ReferralRoomProviderPage from "./ReferralRoomProviderPage.jsx";
import ReferralRoomSignupPage from "./ReferralRoomSignupPage.jsx";
import ReferralRoomManagerPage from "./ReferralRoomManagerPage.jsx";
import TermsPage from "./TermsPage.jsx";
import PrivacyPage from "./PrivacyPage.jsx";
import "./event-workspace-theme.css";

const REFERRAL_ROUTES = new Set(["/referral-room", "/referral-room-admin", "/referral-room-manager"]);
const SHOWCASE_ROUTES = new Set(["/", "/index.html", "/providers", "/provider-details", "/events", "/event-details"]);
const AUTH_ROUTES = new Set(["/login", "/signup", "/provider-signup", "/forgot-password", "/reset-password"]);
const LEGAL_ROUTES = new Set(["/terms", "/privacy"]);
const PUBLIC_REFERRAL_ROUTES = new Set(["/referral-room-signup", "/referral-room-interest"]);
const EVENT_WORKSPACE_ROUTES = new Set(["/my-events", "/add-event", "/edit-event"]);
const PROVIDER_DASHBOARD_ROUTES = new Set(["/dashboard", "/provider-dashboard"]);

export default function Root() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(!REFERRAL_ROUTES.has(path));
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    const hash = window.location.hash || "";
    if (!/^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/.test(hash)) return;
    handleAuthCallback().then(async (callback) => {
      if (callback?.type === "invite" && callback.token) {
        sessionStorage.setItem("thd_invite_token", callback.token);
        window.location.replace("/reset-password?flow=invite");
        return;
      }
      if (callback?.type === "recovery") {
        window.location.replace("/reset-password");
        return;
      }
      const currentUser = callback?.user || await getUser().catch(() => null);
      const metadata = currentUser?.user_metadata || currentUser?.userMetadata || {};
      const accountType = String(metadata.account_type || metadata.accountType || "").toLowerCase();
      window.location.replace(accountType === "provider" ? "/dashboard" : "/client-dashboard");
    }).catch(() => {
      window.location.replace("/login?auth=error");
    });
  }, []);

  React.useEffect(() => {
    if (!REFERRAL_ROUTES.has(path)) return;
    getUser().then((current) => {
      if (!current) {
        window.location.replace(`/login?next=${encodeURIComponent(path)}`);
        return;
      }
      const normalized = {
        id: current.id,
        email: current.email || "",
        name: current.name || current.userMetadata?.full_name || "",
        roles: current.roles || [],
      };
      const adminRoute = path === "/referral-room-admin" || path === "/referral-room-manager";
      if (adminRoute && !normalized.roles.includes("admin")) {
        window.location.replace("/dashboard");
        return;
      }
      setUser(normalized);
      setReady(true);
    }).catch((error) => {
      setNotice(error.message || "Account access could not be checked.");
      setReady(true);
    });
  }, [path]);

  if (AUTH_ROUTES.has(path)) return <AuthAccess path={path} />;
  if (LEGAL_ROUTES.has(path)) return path === "/terms" ? <TermsPage /> : <PrivacyPage />;
  if (PUBLIC_REFERRAL_ROUTES.has(path)) return <ReferralRoomSignupPage />;
  if (SHOWCASE_ROUTES.has(path)) return <PublicShowcase path={path} />;
  if (EVENT_WORKSPACE_ROUTES.has(path)) return <EventWorkspace path={path} />;
  if (path === "/client-dashboard") return <ClientDashboard />;
  if (PROVIDER_DASHBOARD_ROUTES.has(path)) return <ProviderDashboard />;
  if (!REFERRAL_ROUTES.has(path)) return <App />;
  if (!ready || !user) return <div className="state root-auth-state"><h2>Checking account...</h2></div>;

  return <div className="app-shell referral-root">
    <header className="site-header warm-header">
      <button className="brand" onClick={() => go("/")}><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></button>
      <nav className="site-nav">
        <button onClick={() => go("/")}>Providers</button>
        <button onClick={() => go("/events")}>Events</button>
        <button onClick={() => go("/dashboard")}>Dashboard</button>
      </nav>
      <div className="account-actions">
        <button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button>
        <button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button>
      </div>
    </header>
    {notice ? <div className={notice.startsWith("Request received") ? "global-notice success" : "global-notice"}><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div> : null}
    {path === "/referral-room" ? <ReferralRoomProviderPage user={user} setNotice={setNotice} /> : null}
    {path === "/referral-room-admin" ? <ReferralRoomAdminPage user={user} setNotice={setNotice} /> : null}
    {path === "/referral-room-manager" ? <ReferralRoomManagerPage user={user} setNotice={setNotice} /> : null}
  </div>;
}

function go(path) { window.location.assign(path); }
function firstName(value = "") { return String(value).split(/\s|@/)[0] || "Account"; }
async function signOut() { await logout().catch(() => null); window.location.assign("/"); }
