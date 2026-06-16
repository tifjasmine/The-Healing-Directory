import React from "react";
import { createRoot } from "react-dom/client";
import Root from "./Root.jsx";
import "./styles.css";
import "./finishing.css";
import "./referral-room.css";
import "./referral-manager.css";
import "./screenshot-theme.css";
import "./dashboard-admin-theme.css";
import "./auth-signup-overrides.css";
import "./current-fixes.css";

createRoot(document.getElementById("root")).render(<Root />);
