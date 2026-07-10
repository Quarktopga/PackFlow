import { currentPath, navigate } from "./router.js";

const TABS = [
  { path: "/", label: "Accueil", icon: iconHome },
  { path: "/cartons", label: "Cartons", icon: iconBox },
  { path: "/scanner", label: "Scanner", icon: iconScan },
  { path: "/todo", label: "À faire", icon: iconCheck },
  { path: "/volume", label: "Volume", icon: iconVolume },
];

export function renderTabbar() {
  const path = currentPath();
  const bar = document.createElement("nav");
  bar.className = "tabbar";
  bar.setAttribute("aria-label", "Navigation principale");
  TABS.forEach((tab) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.setAttribute("aria-current", String(path === tab.path));
    btn.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
    btn.addEventListener("click", () => navigate(tab.path));
    bar.appendChild(btn);
  });
  return bar;
}

export function renderTopbar(title, { back, action } = {}) {
  const bar = document.createElement("header");
  bar.className = "topbar";
  bar.innerHTML = `
    ${back ? `<button class="btn-icon" aria-label="Retour">${iconBack}</button>` : ""}
    <h1 class="h-display">${title}</h1>
    <span class="spacer"></span>
  `;
  if (back) bar.querySelector(".btn-icon").addEventListener("click", back);
  if (action) bar.appendChild(action);
  return bar;
}

function iconHome() {}
function iconBox() {}
function iconScan() {}
function iconCheck() {}
function iconVolume() {}
function iconBack() {}

// Icônes SVG inline (traits fins, cohérentes avec l'esthétique manifeste)
export const svg = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/></svg>`,
  box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8 12 4l9 4-9 4-9-4Z"/><path d="M3 8v9l9 4 9-4V8"/><path d="M12 12v9"/></svg>`,
  scan: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8V5a1 1 0 0 1 1-1h3"/><path d="M20 8V5a1 1 0 0 0-1-1h-3"/><path d="M4 16v3a1 1 0 0 0 1 1h3"/><path d="M20 16v3a1 1 0 0 1-1 1h-3"/><path d="M4 12h16"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12.5 9 17l11-11"/></svg>`,
  volume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 21 8v8l-9 5-9-5V8Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5 8 12l7 7"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4L18 10l-4-4L4 16v4Z"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v12"/><path d="M8 8l4-4 4 4"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px;display:inline;vertical-align:-2px;"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  qr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:16px;height:16px;display:inline;vertical-align:-3px;"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>`,
  device: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M9 20h6M12 16v4"/></svg>`,
};

const TAB_ICONS = { "/": svg.home, "/cartons": svg.box, "/scanner": svg.scan, "/todo": svg.check, "/volume": svg.volume };
TABS.forEach((t) => (t.icon = TAB_ICONS[t.path]));
