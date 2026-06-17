import React from "react";
import { Download } from "lucide-react";

export default function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = React.useState(null);
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    function onInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!promptEvent) {
      window.alert("Use your browser's Share or Add to Home Screen option to install The Healing Directory.");
      return;
    }

    promptEvent.prompt();

    const choice = await promptEvent.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);

    setPromptEvent(null);
  }

  return (
    <button type="button" className="pwa-install-button" onClick={installApp}>
      <Download size={15} />
      {installed ? "App installed" : "Download app"}
    </button>
  );
}
