// Scanner de QR code : utilise l'API native BarcodeDetector si disponible
// (rapide, pas de dépendance), sinon bascule sur jsQR (chargé depuis le
// CDN, cf. index.html) en dessinant les frames vidéo sur un canvas caché.

export class QrScanner {
  constructor(videoEl, { onResult, onError } = {}) {
    this.videoEl = videoEl;
    this.onResult = onResult;
    this.onError = onError;
    this.stream = null;
    this.running = false;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.detector = ("BarcodeDetector" in window) ? new BarcodeDetector({ formats: ["qr_code"] }) : null;
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (err) {
      this.onError?.(err);
      return;
    }
    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  // Relance la boucle de détection sans redemander l'accès caméra — utile
  // pour scanner plusieurs cartons à la suite (ex. vue déménageur) après un
  // premier résultat, puisque loop() s'arrête après chaque détection.
  resume() {
    if (!this.stream || this.running) return;
    this.running = true;
    this.loop();
  }

  async loop() {
    if (!this.running) return;
    try {
      const code = this.detector ? await this.scanNative() : this.scanFallback();
      if (code) {
        this.running = false; // en pause : le consommateur appelle resume() ou stop()
        this.onResult?.(code);
        return;
      }
    } catch (err) {
      // on ignore les erreurs de frame isolées, on continue la boucle
    }
    requestAnimationFrame(() => this.loop());
  }

  async scanNative() {
    if (this.videoEl.readyState < 2) return null;
    const codes = await this.detector.detect(this.videoEl);
    return codes[0]?.rawValue || null;
  }

  scanFallback() {
    if (this.videoEl.readyState < 2 || typeof jsQR === "undefined") return null;
    const w = this.videoEl.videoWidth;
    const h = this.videoEl.videoHeight;
    if (!w || !h) return null;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.videoEl, 0, 0, w, h);
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const result = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
    return result?.data || null;
  }
}
