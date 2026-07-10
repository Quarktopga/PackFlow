// Génération des QR codes de cartons — entièrement produits par la plateforme
// (il n'y a plus de QR pré-imprimé externe à scanner pour association).
// Le QR encode directement l'URL de la fiche carton : un scan avec
// n'importe quelle app appareil-photo ouvre PackFlow sur le bon carton.

export function boxUrl(id) {
  return `${location.origin}${location.pathname}#/cartons/${id}`;
}

export async function boxQrDataUrl(id, { size = 480 } = {}) {
  return QRCode.toDataURL(boxUrl(id), {
    width: size,
    margin: 1,
    color: { dark: "#14171f", light: "#f6f4efff" },
  });
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function printBoxLabel(id, dataUrl) {
  const w = window.open("", "_blank", "width=420,height=560");
  if (!w) return; // popup bloqué : le téléchargement reste disponible
  w.document.write(`
    <!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>Étiquette ${id} — PackFlow</title>
    <style>
      body { font-family: -apple-system, sans-serif; text-align: center; padding: 32px; }
      img { width: 240px; height: 240px; }
      .code { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 30px; font-weight: 700; letter-spacing: 6px; margin-top: 14px; }
      .brand { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #888; margin-top: 6px; }
    </style></head>
    <body>
      <img src="${dataUrl}" alt="QR carton ${id}">
      <div class="code">${id}</div>
      <div class="brand">PackFlow</div>
      <script>window.onload = () => setTimeout(() => window.print(), 150);</script>
    </body></html>
  `);
  w.document.close();
}
