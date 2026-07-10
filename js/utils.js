export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function relativeDay(dateStr) {
  const d = daysUntil(dateStr);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  if (d > 1) return `Dans ${d} jours`;
  if (d === -1) return "Hier";
  return `En retard de ${Math.abs(d)} j`;
}

export function boxVolumeM3(box) {
  if (!box.width || !box.height || !box.depth) return 0;
  return (box.width * box.height * box.depth) / 1_000_000;
}

export function furnitureVolumeM3(f) {
  if (!f.width || !f.height || !f.depth) return 0;
  return (f.width * f.height * f.depth) / 1_000_000;
}

export function truckComparison(m3) {
  const trucks = [
    { size: 7.5, label: "utilitaire 7,5 m³" },
    { size: 12, label: "camion 12 m³" },
    { size: 20, label: "camion 20 m³" },
    { size: 30, label: "camion 30 m³" },
  ];
  const match = trucks.find((t) => m3 <= t.size) || trucks[trucks.length - 1];
  const pct = Math.min(100, Math.round((m3 / match.size) * 100));
  return { ...match, pct };
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function initialsColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${hash % 360}, 55%, 55%)`;
}

// Les QR codes sont générés par la plateforme et encodent l'URL de la fiche
// carton (#/cartons/XXXX). On accepte aussi une saisie manuelle brute du
// code à 4 caractères — les deux cas sont ramenés à un même identifiant.
export function parseBoxCode(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  const match = trimmed.match(/#\/cartons\/([A-Za-z0-9]{4})(?:[/?&]|$)/);
  if (match) return match[1].toUpperCase();
  return trimmed.toUpperCase();
}
