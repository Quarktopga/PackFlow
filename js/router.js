const routes = new Map();
let notFoundHandler = () => {};
let beforeEach = null;

export function registerRoute(path, handler) {
  routes.set(path, handler);
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function setBeforeEach(fn) {
  beforeEach = fn;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  const params = Object.fromEntries(new URLSearchParams(query || ""));
  return { path: path || "/", params };
}

export async function navigate(path, replace = false) {
  const target = `#${path}`;
  if (replace) location.replace(target);
  else location.hash = target;
}

async function render() {
  const { path, params } = parseHash();
  const app = document.getElementById("app");
  app.setAttribute("aria-busy", "true");

  if (beforeEach) {
    const redirect = await beforeEach(path, params);
    if (redirect) {
      navigate(redirect, true);
      return;
    }
  }

  let fn = routes.get(path);
  let dynamicParams = {};
  if (!fn) {
    const match = matchDynamic(path);
    if (match) {
      fn = match.fn;
      dynamicParams = match.dynamicParams;
    }
  }
  if (!fn) {
    notFoundHandler(app, params);
    app.removeAttribute("aria-busy");
    return;
  }
  await fn(app, { ...params, ...dynamicParams });
  window.scrollTo(0, 0);
  app.removeAttribute("aria-busy");
}

function matchDynamic(path) {
  for (const [pattern, fn] of routes) {
    if (!pattern.includes(":")) continue;
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;
    const dynamicParams = {};
    let ok = true;
    patternParts.forEach((part, i) => {
      if (part.startsWith(":")) dynamicParams[part.slice(1)] = decodeURIComponent(pathParts[i]);
      else if (part !== pathParts[i]) ok = false;
    });
    if (ok) return { fn, dynamicParams };
  }
  return null;
}

export function startRouter() {
  window.addEventListener("hashchange", render);
  render();
}

export function currentPath() {
  return parseHash().path;
}
