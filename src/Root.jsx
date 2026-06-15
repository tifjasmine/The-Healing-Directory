import React from "react";
import { getUser } from "@netlify/identity";
import { X } from "lucide-react";
import App from "./App.jsx";
import { ReferralRoomAdmin, ReferralRoomManager, ReferralRoomPage } from "./ReferralRoom.jsx";

const REFERRAL_ROUTES = new Set(["/referral-room", "/referral-room-admin", "/referral-room-manager"]);

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

  if (!REFERRAL_ROUTES.has(path)) return <App />;
  if (!ready || !user) return <div className="state root-auth-state"><h2>Checking account...</h2></div>;

  return <div className="app-shell referral-root">
    <header className="referral-root-header"><a className="brand" href="/"><img src="/healing-directory-logo.svg" alt="" /><span><strong>The Healing Directory</strong><small>Relationship-based care</small></span></a><nav><a href="/dashboard">Dashboard</a><a href="/events">Events</a>{user.roles.includes("admin") ? <><a href="/referral-room-admin">Create session</a><a href="/referral-room-manager">Manager</a></> : null}</nav></header>
    {notice ? <div className="global-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16} /></button></div> : null}
    {path === "/referral-room" ? <ReferralRoomPage user={user} setNotice={setNotice} /> : null}
    {path === "/referral-room-admin" ? <ReferralRoomAdmin user={user} setNotice={setNotice} /> : null}
    {path === "/referral-room-manager" ? <ReferralRoomManager user={user} setNotice={setNotice} /> : null}
  </div>;
}
