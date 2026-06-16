import React from "react";
import { getUser } from "@netlify/identity";
import { X } from "lucide-react";
import App from "./App.jsx";
import EventWorkspace from "./EventWorkspace.jsx";
import AuthAccess from "./AuthAccess.jsx";
import ProviderDashboard from "./ProviderDashboard.jsx";
import ClientDashboard from "./ClientDashboard.jsx";
import PublicShowcase from "./PublicShowcase.jsx";
import ReferralRoomAdminPage from "./ReferralRoomAdminPage.jsx";
import ReferralRoomProviderPage from "./ReferralRoomProviderPage.jsx";
import ReferralRoomManagerPage from "./ReferralRoomManagerPage.jsx";
import "./event-workspace-theme.css";

const REFERRAL_ROUTES = new Set(["/referral-room", "/referral-room-admin", "/referral-room-manager"]);
const SHOWCASE_ROUTES = new Set(["/", "/providers", "/provider-details", "/events", "/event-details"]);
const AUTH_ROUTES = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);
const EVENT_WORKSPACE_ROUTES = new Set(["/my-events", "/add-event", "/edit-event"]);
const PROVIDER_DASHBOARD_ROUTES = new Set(["/dashboard", "/provider-dashboard"]);

export default function Root() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(!REFERRAL_ROUTES.has(path));
  const [notice, setNotice] = React.useState("");

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
  if (SHOWCASE_ROUTES.has(path)) return <PublicShowcase path={path} />;
  if (EVENT_WORKSPACE_ROUTES.has(path)) return <EventWorkspace path={path} />;
  if (path === "/client-dashboard") return <ClientDashboard />;
  if (PROVIDER_DASHBOARD_ROUTES.has(path)) return <ProviderDashboard />;
  if (!REFERRAL_ROUTES.has(path)) return <App />;
  if (!ready || !user) return <div className="state root-auth-state"><h2>Checking account...</h2></div>;

  return <div className="app-shell referral-root">
    <header className="referral-root-header"><a className="brand" href="/"><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></a><nav><a href="/dashboard">Dashboard</a><a href="/events">Events</a>{user.roles.includes("admin") ? <><a href="/referral-room-admin">Create session</a><a href="/referral-room-manager">Manager</a></> : null}</nav></header>
    {notice ? <div className="global-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div> : null}
    {path === "/referral-room" ? <ReferralRoomProviderPage user={user} setNotice={setNotice} /> : null}
    {path === "/referral-room-admin" ? <ReferralRoomAdminPage user={user} setNotice={setNotice} /> : null}
    {path === "/referral-room-manager" ? <ReferralRoomManagerPage user={user} setNotice={setNotice} /> : null}
  </div>;
}
