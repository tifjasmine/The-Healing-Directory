import React from "react";
import { ChevronDown, CircleUserRound, LogIn, LogOut, Menu, X } from "lucide-react";
import { getUser, logout } from "./authClient.js";

export default function LegalChrome({ children }) {
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [signupOpen, setSignupOpen] = React.useState(false);
  const headerRef = React.useRef(null);

  React.useEffect(() => {
    let alive = true;
    getUser().then((current) => {
      if (alive) setUser(current);
    }).catch(() => null).finally(() => {
      if (alive) setReady(true);
    });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => {
    if (!menuOpen && !signupOpen) return undefined;
    function closeHeaderMenus(event) {
      if (headerRef.current?.contains(event.target)) return;
      setMenuOpen(false);
      setSignupOpen(false);
    }
    document.addEventListener("pointerdown", closeHeaderMenus);
    return () => document.removeEventListener("pointerdown", closeHeaderMenus);
  }, [menuOpen, signupOpen]);

  async function signOut() {
    await logout().catch(() => null);
    window.location.assign("/");
  }

  return <div className="app-shell">
    <header ref={headerRef} className="site-header warm-header">
      <button className="brand" type="button" onClick={() => go("/")}>
        <span><strong>The Healing Directory</strong><small>Relationship-based care</small></span>
      </button>
      <button className="menu-toggle icon-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? "site-nav open" : "site-nav"}>
        <button onPointerDown={(event) => { event.preventDefault(); go("/"); }} onClick={() => go("/")}>Providers</button>
        <button onPointerDown={(event) => { event.preventDefault(); go("/events"); }} onClick={() => go("/events")}>Events</button>
        {user ? <button onPointerDown={(event) => { event.preventDefault(); go(defaultDashboardPath(user)); }} onClick={() => go(defaultDashboardPath(user))}>Dashboard</button> : null}
      </nav>
      <div className="account-actions">
        {!ready ? null : user ? (
          <>
            <button className="account-chip" onClick={() => go("/account-settings")}><CircleUserRound size={17} /><span>{firstName(user.name || user.email)}</span></button>
            <button className="icon-button logout-arrow" onClick={signOut} title="Log out"><LogOut size={18} /></button>
          </>
        ) : (
          <>
            <button className="button compact login-button" onClick={() => go("/login")}><LogIn size={16} /> Login</button>
            <div className="signup-menu">
              <button className="button compact signup-trigger" onClick={() => setSignupOpen((open) => !open)}>Signup <ChevronDown size={16} /></button>
              {signupOpen ? <div className="signup-dropdown">
                <button onClick={() => go("/provider-signup")}>Become a Provider</button>
                <button onClick={() => go("/signup")}>Become a Member</button>
              </div> : null}
            </div>
          </>
        )}
      </div>
    </header>
    {children}
    <footer className="site-footer"><div><strong>The Healing Directory</strong><p>Thoughtful connections for healing, wellness, and trusted referrals.</p></div><nav><button onClick={() => go("/terms")}>Terms and Conditions</button><button onClick={() => go("/privacy")}>Privacy Policy</button></nav></footer>
  </div>;
}

function go(path) { window.location.assign(path); }
function firstName(value = "") { return String(value || "Account").split(/[ @._-]/).filter(Boolean)[0] || "Account"; }
function defaultDashboardPath(user) {
  const metadata = user?.userMetadata || user?.user_metadata || {};
  const accountType = String(metadata.account_type || metadata.accountType || user?.accountType || "").toLowerCase();
  return accountType === "provider" ? "/dashboard" : "/client-dashboard";
}
