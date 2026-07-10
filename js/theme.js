const STORAGE_KEY = "packflow-theme"; // "light" | "dark" | "system"
const listeners = new Set();
const media = window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePreference() {
  return localStorage.getItem(STORAGE_KEY) || "system";
}

export function resolveTheme(pref = getThemePreference()) {
  if (pref === "system") return media.matches ? "dark" : "light";
  return pref;
}

export function applyTheme(pref = getThemePreference()) {
  document.documentElement.setAttribute("data-theme", resolveTheme(pref));
}

export function setThemePreference(pref) {
  if (pref === "system") localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
  listeners.forEach((fn) => fn(pref));
}

export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Réagit au changement de préférence système si l'utilisateur n'a pas
// explicitement choisi un thème fixe.
media.addEventListener("change", () => {
  if (getThemePreference() === "system") applyTheme("system");
});

// Appliqué immédiatement à l'import (avant le premier rendu) pour éviter
// tout flash du mauvais thème — un second appel a lieu aussi en inline
// dans <head> pour éviter le flash au tout premier paint HTML/CSS.
applyTheme();
