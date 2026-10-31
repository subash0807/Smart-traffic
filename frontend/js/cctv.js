/**
 * STMS - Live Simulated CCTV Camera & Computer Vision Feed Modal
 * HTML5 Canvas rendering of simulated highway traffic with real-time AI bounding box detection
 */

class CCTVViewer {
  constructor() {
    this.modalEl = null;
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.currentCam = 'Guindy Kathipara Junction';
    this.visionMode = 'normal'; // 'normal' | 'night' | 'thermal'
    this.vehicles = [];
    this.anprLogs = [];
  }

  open(location = 'Guindy Kathipara Junction') {
    this.currentCam = location;
    if (window.soundFx) window.soundFx.playClick();
    this.ensureModal();
    this.modalEl.style.display = 'flex';
    this.initCanvas();
    this.startSimulation();
  }

  close() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.modalEl) this.modalEl.style.display = 'none';
  }

  ensureModal() {
    if (document.getElementById('cctv-modal')) {
      this.modalEl = document.getElementById('cctv-modal');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'cctv-modal';
    modal.className = 'cctv-modal-overlay';
    modal.innerHTML = `
      <div class="cctv-modal-window">
        <div class="cctv-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="cctv-rec-dot"></span>
            <span style="font-weight: 700; font-family: monospace; letter-spacing: 0.05em;" id="cctv-title">
              LIVE SENSOR OPTICAL FEED: GUINDY KATHIPARA
            </span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select id="cctv-select-cam" class="form-select form-select-sm" onchange="cctvViewer.switchCam(this.value)" style="width: auto; background: rgba(0,0,0,0.5); font-size: 0.75rem;">
              <option value="Anna Salai Junction">CAM-01: Anna Salai</option>
              <option value="T. Nagar Panagal Park">CAM-02: T. Nagar</option>
              <option value="Guindy Kathipara Junction" selected>CAM-03: Kathipara</option>
              <option value="Velachery Vijayanagar">CAM-04: Velachery</option>
              <option value="Tambaram GST Junction">CAM-05: Tambaram</option>
              <option value="OMR Tidel Park Junction">CAM-06: OMR Tidel</option>
              <option value="Koyambedu Roundabout">CAM-07: Koyambedu</option>
            </select>
            <button class="btn btn-sm btn-outline" onclick="cctvViewer.setVisionMode('normal')" title="Normal RGB">RGB</button>
            <button class="btn btn-sm btn-outline" onclick="cctvViewer.setVisionMode('night')" title="Night Vision">Night NVG</button>
            <button class="btn btn-sm btn-outline" onclick="cctvViewer.setVisionMode('thermal')" title="Infrared Thermal">Thermal</button>
            <button class="btn btn-sm btn-outline" onclick="cctvViewer.close()">✕</button>
          </div>
        </div>

        <div class="cctv-canvas-container">
          <canvas id="cctv-canvas" width="760" height="420"></canvas>
          <div class="cctv-scanline"></div>
          <div class="cctv-overlay-hud" id="cctv-hud-text">
            FPS: 60 | OPTICAL ZOOM: 1.0X | AI DETECTIONS: ACTIVE
          </div>
        </div>

        <div class="cctv-footer">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
            ANPR (AUTOMATIC NUMBER PLATE RECOGNITION) LIVE TELEMETRY:
          </div>
          <div id="cctv-anpr-stream" class="cctv-anpr-stream">
            <span class="anpr-pill">[ANPR] TN-09-AX-4821 • CAR • 44 km/h • SAFE</span>
            <span class="anpr-pill">[ANPR] TN-01-BK-8920 • BUS • 26 km/h • SAFE</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
  }

  switchCam(loc) {
    this.currentCam = loc;
    const titleEl = document.getElementById('cctv-title');
    if (titleEl) titleEl.textContent = `LIVE SENSOR OPTICAL FEED: ${loc.toUpperCase()}`;
    this.initVehicles();
  }

  setVisionMode(mode) {
    this.visionMode = mode;
  }

  initCanvas() {
    this.canvas = document.getElementById('cctv-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.initVehicles();
  }

  initVehicles() {
    this.vehicles = [];
    const types = ['CAR', 'BUS', 'AUTO', 'BIKE'];
    const colors = ['#f59e0b', '#00f0ff', '#10b981', '#a855f7'];

    for (let i = 0; i < 7; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      this.vehicles.push({
        x: Math.random() * (this.canvas.width - 100) + 50,
        y: (i * 50) + 60,
        width: type === 'BUS' ? 70 : type === 'CAR' ? 44 : type === 'AUTO' ? 32 : 22,
        height: type === 'BUS' ? 32 : type === 'CAR' ? 24 : type === 'AUTO' ? 20 : 14,
        speed: (Math.random() * 1.8 + 1.0) * (i % 2 === 0 ? 1 : -1),
        type,
        color: colors[Math.floor(Math.random() * colors.length)],
        confidence: Math.floor(Math.random() * 10 + 90),
        plate: `TN-${String(Math.floor(Math.random() * 20 + 1)).padStart(2, '0')}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(Math.random() * 9000 + 1000)}`
      });
    }
  }

  startSimulation() {
    const loop = () => {
      this.drawFrame();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  drawFrame() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background road surface
    if (this.visionMode === 'night') {
      ctx.fillStyle = '#051b0d';
    } else if (this.visionMode === 'thermal') {
      ctx.fillStyle = '#16021f';
    } else {
      ctx.fillStyle = '#0a101d';
    }
    ctx.fillRect(0, 0, w, h);

    // Highway lanes
    ctx.strokeStyle = this.visionMode === 'night' ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 16]);
    for (let y = 100; y < h; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw and update simulated vehicles
    this.vehicles.forEach(v => {
      v.x += v.speed;
      if (v.speed > 0 && v.x > w + 40) v.x = -60;
      if (v.speed < 0 && v.x < -60) v.x = w + 40;

      // Draw vehicle body
      if (this.visionMode === 'thermal') {
        const radGrad = ctx.createRadialGradient(v.x + v.width / 2, v.y + v.height / 2, 4, v.x + v.width / 2, v.y + v.height / 2, v.width);
        radGrad.addColorStop(0, '#ffffff');
        radGrad.addColorStop(0.4, '#ff3366');
        radGrad.addColorStop(0.8, '#ffb800');
        radGrad.addColorStop(1, '#6600cc');
        ctx.fillStyle = radGrad;
      } else if (this.visionMode === 'night') {
        ctx.fillStyle = '#10ff77';
      } else {
        ctx.fillStyle = v.color;
      }
      ctx.fillRect(v.x, v.y, v.width, v.height);

      // AI Bounding Box (Futuristic computer vision detection frame)
      ctx.strokeStyle = this.visionMode === 'night' ? '#00ff66' : this.visionMode === 'thermal' ? '#ff00ff' : '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(v.x - 4, v.y - 4, v.width + 8, v.height + 8);

      // AI Detection Tag
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '9px monospace';
      ctx.fillText(`${v.type} ${v.confidence}% [${Math.round(Math.abs(v.speed * 26))} km/h]`, v.x - 4, v.y - 8);
    });

    // Timecode & Camera Overlay
    const now = new Date();
    ctx.fillStyle = this.visionMode === 'night' ? '#00ff88' : '#ffffff';
    ctx.font = '12px monospace';
    ctx.fillText(`REC ● CAM_ID: SEN-${this.currentCam.slice(0, 3).toUpperCase()} | CHENNAI TOC`, 16, 24);
    ctx.fillText(`${now.toISOString().replace('T', ' ').slice(0, 23)} IST`, w - 240, 24);

    // Crosshairs in center
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 20, h / 2);
    ctx.lineTo(w / 2 + 20, h / 2);
    ctx.moveTo(w / 2, h / 2 - 20);
    ctx.lineTo(w / 2, h / 2 + 20);
    ctx.stroke();
  }
}

const cctvViewer = new CCTVViewer();
window.cctvViewer = cctvViewer;

