/**
 * STMS - High-Tech Tactical Leaflet Map Controller
 * Dark CartoDB tactical tiles with glowing SVG pulsing pins & live CCTV launcher
 */

let leafletMap = null;
let mapMarkers = [];
let currentMapFilter = 'ALL';

function initTrafficMap() {
  const mapContainer = document.getElementById('traffic-map');
  if (!mapContainer || typeof L === 'undefined') return;

  if (!leafletMap) {
    leafletMap = L.map('traffic-map', {
      zoomControl: true,
      attributionControl: true
    }).setView([13.04, 80.22], 12);

    // High-tech dark tactical tiles with fallback
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; CartoDB &copy; OpenStreetMap | STMS Tactical Grid'
    }).addTo(leafletMap);
  }

  setTimeout(() => {
    if (leafletMap) leafletMap.invalidateSize();
  }, 200);

  loadMapJunctions();
}

async function loadMapJunctions() {
  if (!leafletMap) return;

  try {
    const [trafficRes, signalsRes] = await Promise.all([
      api.get('/traffic/latest/junctions'),
      api.get('/signals')
    ]);

    const junctions = trafficRes.data || [];
    const signals = signalsRes.data || [];

    const signalMap = {};
    signals.forEach(s => { signalMap[s.location] = s; });

    // Clear old markers
    mapMarkers.forEach(m => leafletMap.removeLayer(m));
    mapMarkers = [];

    junctions.forEach(j => {
      if (currentMapFilter !== 'ALL' && j.congestion !== currentMapFilter) {
        return;
      }

      const sig = signalMap[j.location];
      const color = j.congestion === 'NORMAL' ? '#00ff88'
        : j.congestion === 'MODERATE' ? '#ffb800'
        : j.congestion === 'HEAVY' ? '#ff7700'
        : '#ff3366';

      // Custom High-Tech Glowing Pulse Icon
      const customIcon = L.divIcon({
        className: 'custom-traffic-pin',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: ${color};
            border: 3px solid #060a12;
            box-shadow: 0 0 20px ${color}, inset 0 0 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #060a12;
            font-size: 11px;
            font-weight: 800;
            font-family: 'Orbitron', monospace;
            cursor: pointer;
          ">
            ${j.vehicleCount}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([j.latitude, j.longitude], { icon: customIcon }).addTo(leafletMap);

      const popupContent = `
        <div style="font-family: 'Inter', sans-serif; color: #f8fafc; min-width: 220px; padding: 4px;">
          <h4 style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #00f0ff;">${escapeHtml(j.location)}</h4>
          <div style="font-size: 12px; line-height: 1.6; color: #cbd5e1;">
            <div><strong>Congestion:</strong> <span style="font-weight: bold; color: ${color};">${j.congestion}</span></div>
            <div><strong>Queue Length:</strong> ${j.vehicleCount} vehicles</div>
            <div><strong>Speed Telemetry:</strong> ${j.avgSpeed} km/h</div>
            <div><strong>Active Signal:</strong> <span style="color: ${sig && sig.status === 'GREEN' ? '#00ff88' : sig && sig.status === 'RED' ? '#ff3366' : '#ffb800'}; font-weight: 700;">${sig ? sig.status : 'GREEN'} (${sig ? sig.mode : 'AUTO'})</span></div>
            <div><strong>Sensor ID:</strong> <code>${j.sensorId || 'SEN-AUTO'}</code></div>
          </div>
          <button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 10px;" onclick="cctvViewer.open('${escapeHtml(j.location)}')">
            📹 View Live CCTV Feed
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'tactical-popup'
      });

      mapMarkers.push(marker);
    });
  } catch (err) {
    console.error('Failed to load map junctions:', err);
  }
}

function filterMap(severity) {
  currentMapFilter = severity;
  if (window.soundFx) window.soundFx.playClick();
  document.querySelectorAll('.map-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === severity);
  });
  loadMapJunctions();
}

window.initTrafficMap = initTrafficMap;
window.loadMapJunctions = loadMapJunctions;
window.filterMap = filterMap;
