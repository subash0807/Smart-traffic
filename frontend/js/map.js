/**
 * STMS - Interactive Leaflet OpenStreetMap Controller
 */

let leafletMap = null;
let mapMarkers = [];
let currentMapFilter = 'ALL';

function initTrafficMap() {
  const mapContainer = document.getElementById('traffic-map');
  if (!mapContainer || typeof L === 'undefined') return;

  // Initialize map if not yet created
  if (!leafletMap) {
    leafletMap = L.map('traffic-map', {
      zoomControl: true,
      attributionControl: true
    }).setView([13.04, 80.22], 12);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | STMS Simulation'
    }).addTo(leafletMap);
  }

  // Force map to recalculate container size when section becomes active
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

    // Map signal by location
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
      const color = j.congestion === 'NORMAL' ? '#10b981'
        : j.congestion === 'MODERATE' ? '#f59e0b'
        : j.congestion === 'HEAVY' ? '#f97316'
        : '#ef4444';

      // Custom Glowing SVG Circle Marker
      const customIcon = L.divIcon({
        className: 'custom-traffic-pin',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: ${color};
            border: 3px solid #0f172a;
            box-shadow: 0 0 14px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: bold;
          ">
            ${j.vehicleCount}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([j.latitude, j.longitude], { icon: customIcon }).addTo(leafletMap);

      const popupContent = `
        <div style="font-family: inherit; color: #0f172a; min-width: 200px;">
          <h4 style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #1e293b;">${escapeHtml(j.location)}</h4>
          <div style="font-size: 12px; line-height: 1.6;">
            <div><strong>Congestion:</strong> <span style="font-weight: bold; color: ${color};">${j.congestion}</span></div>
            <div><strong>Vehicles Detected:</strong> ${j.vehicleCount}</div>
            <div><strong>Avg Speed:</strong> ${j.avgSpeed} km/h</div>
            <div><strong>Signal Phase:</strong> <span style="font-weight: 600;">${sig ? sig.status : 'GREEN'} (${sig ? sig.mode : 'AUTO'})</span></div>
            <div><strong>Sensor:</strong> ${j.sensorId || 'N/A'}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Last Updated: ${new Date(j.timestamp).toLocaleTimeString()}</div>
            <div style="font-size: 9px; color: #3b82f6; margin-top: 2px;">⚡ Simulated Data</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      mapMarkers.push(marker);
    });

  } catch (err) {
    console.error('Failed to load map junctions:', err);
  }
}

function filterMap(level) {
  currentMapFilter = level;
  document.querySelectorAll('.map-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
  loadMapJunctions();
}
