const RECORD_ID = /^rec[a-zA-Z0-9]+$/;

let hostPatchQueued = false;

function queueEventHostPatch() {
  if (hostPatchQueued) return;
  hostPatchQueued = true;
  window.setTimeout(() => {
    hostPatchQueued = false;
    patchEventHost().catch(() => {});
  }, 250);
}

async function patchEventHost() {
  if (window.location.pathname !== "/event-details") return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) return;

  const response = await fetch("/.netlify/functions/app-api?action=bootstrap", { credentials: "include" });
  if (!response.ok) return;
  const data = await response.json();
  const event = (data.events || []).find((item) => item.id === id);
  if (!event) return;

  const provider = findHostProvider(event, data.providers || []);
  if (!provider) return;

  replaceHostText(provider);
}

function findHostProvider(event, providers) {
  const hostName = String(event.hostName || "").trim();
  const hostEmail = String(event.hostEmail || "").trim().toLowerCase();
  return providers.find((provider) => provider.id === hostName)
    || providers.find((provider) => event.hostProviderId && provider.id === event.hostProviderId)
    || providers.find((provider) => hostEmail && String(provider.email || "").trim().toLowerCase() === hostEmail)
    || (!RECORD_ID.test(hostName) ? providers.find((provider) => same(provider.name, hostName)) : null);
}

function replaceHostText(provider) {
  const url = `/provider-details?id=${encodeURIComponent(provider.id)}`;
  const rawIds = new Set([provider.id]);

  document.querySelectorAll(".event-facts span").forEach((row) => {
    if (row.dataset.hostResolved === provider.id) return;
    if (![...rawIds].some((id) => row.textContent.includes(id))) return;
    const icon = row.querySelector("svg")?.cloneNode(true);
    row.textContent = "";
    if (icon) row.appendChild(icon);
    row.appendChild(hostLink(url, provider.name));
    row.dataset.hostResolved = provider.id;
  });

  document.querySelectorAll(".event-quick-card .event-info").forEach((row) => {
    if (row.dataset.hostResolved === provider.id) return;
    const label = row.querySelector("small")?.textContent.trim().toLowerCase();
    const value = row.querySelector("strong");
    if (label !== "host" && ![...rawIds].some((id) => row.textContent.includes(id))) return;
    if (!value) return;
    value.textContent = "";
    value.appendChild(hostLink(url, provider.name));
    row.dataset.hostResolved = provider.id;
  });
}

function hostLink(url, label) {
  const link = document.createElement("a");
  link.href = url;
  link.className = "event-host-runtime-link";
  link.textContent = label;
  return link;
}

function same(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", queueEventHostPatch);
  window.addEventListener("popstate", queueEventHostPatch);
  new MutationObserver(queueEventHostPatch).observe(document.documentElement, { childList: true, subtree: true });
  queueEventHostPatch();
}
