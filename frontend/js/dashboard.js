/**
 * STMS - Dashboard Controller & Interactive Visualizations
 * High-Tech Cyber Command Center HUD with Defcon Threat Index & Tactical Clock
 */

let chartVehicles = null;
let chartCongestion = null;
let chartSpeed = null;
let chartSignals = null;
let dashboardRefreshTimer = null;
let clockTimer = null;

async function initDashboard() {
  initTacticalClock();
  await loadDashboardData();

  if (dashboardRefreshTimer) clearInterval(dashboardRefreshTimer);
  dashboardRefreshTimer = setInterval(loadDashboardData, 8000);
}

function initTacticalClock() {
  if (clockTimer) clearInterval(clockTimer);
  const updateClock = () => {
    const clockEl = document.getElementById('hud-clock-time');
    if (clockEl) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      clockEl.textContent = `${timeStr} IST`;
    }
  };
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
}

async function loadDashboardData() {
  try {
    const [summaryRes, latestJunctionsRes, alertsRes, emergencyRes, signalsRes] = await Promise.all([
      api.get('/congestion/summary'),
      api.get('/traffic/latest/junctions'),
      api.get('/alerts?limit=5'),
      api.get('/emergency-requests?status=PENDING'),
      api.get('/signals')
    ]);

    const summary = summaryRes.data || {};
    const junctions = latestJunctionsRes.data || [];
    const alerts = alertsRes.data || [];
    const pendingEmergencies = emergencyRes.data || [];
    const signals = signalsRes.data || [];

    // 1. Calculate KPI Metrics
    const totalLocations = junctions.length;
    let totalVehicles = 0;
    let normalCount = 0;
    let congestedCount = 0;
    let severeCount = 0;

    junctions.forEach((j) => {
      totalVehicles += j.vehicleCount || 0;
      if (j.congestion === 'NORMAL') normalCount++;
      else if (j.congestion === 'MODERATE' || j.congestion === 'HEAVY') congestedCount++;
      else if (j.congestion === 'SEVERE') severeCount++;
    });

    setElText('kpi-total-locations', totalLocations);
    setElText('kpi-total-vehicles', totalVehicles);
    setElText('kpi-normal-traffic', normalCount);
    setElText('kpi-congested-traffic', congestedCount);
    setElText('kpi-severe-incidents', severeCount);
    setElText('kpi-active-emergency', pendingEmergencies.length);

    // 2. Update Defcon Threat Index
    updateDefconBadge(severeCount, congestedCount);

    // 3. Update alert count badge in topbar
    const unreadAlerts = alerts.filter(a => a.status === 'NEW').length;
    const badge = document.getElementById('nav-alert-badge');
    if (badge) {
      badge.textContent = unreadAlerts > 0 ? unreadAlerts : alerts.length;
      badge.style.display = alerts.length > 0 ? 'inline-flex' : 'none';
    }

    // 4. Update Last Refreshed Time
    setElText('last-refresh-time', new Date().toLocaleTimeString());

    // 5. Render Neon Charts
    renderCharts(junctions, summary.distribution || {}, signals);

    // 6. Render Recent Alerts
    renderRecentAlerts(alerts);

    // 7. Render Active Emergency Banner
    renderEmergencyBanner(pendingEmergencies);

  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

function updateDefconBadge(severeCount, congestedCount) {
  const badge = document.getElementById('hud-defcon');
  const text = document.getElementById('hud-defcon-text');
  if (!badge || !text) return;

  if (severeCount >= 2) {
    badge.className = 'defcon-badge defcon-critical';
    text.textContent = 'DEFCON 3: CRITICAL GRIDLOCK';
  } else if (congestedCount >= 2 || severeCount === 1) {
    badge.className = 'defcon-badge defcon-congested';
    text.textContent = 'DEFCON 2: ELEVATED QUEUES';
  } else {
    badge.className = 'defcon-badge';
    text.textContent = 'DEFCON 1: NOMINAL FLOW';
  }
}

function setElText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val !== undefined && val !== null ? val : 0;
}

function renderCharts(junctions, distribution, signals) {
  if (typeof Chart === 'undefined') return;
  const dashSection = document.getElementById('section-dashboard');
  if (dashSection && dashSection.style.display === 'none') return;

  const labels = junctions.map(j => j.location.replace(' Junction', '').replace(' Roundabout', ''));
  const vehicleCounts = junctions.map(j => j.vehicleCount);
  const speeds = junctions.map(j => j.avgSpeed);

  // 1. Vehicle Volume by Junction Bar Chart (Neon Cyan)
  const ctxVehicles = document.getElementById('chart-vehicles');
  if (ctxVehicles) {
    if (chartVehicles) chartVehicles.destroy();
    chartVehicles = new Chart(ctxVehicles, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Vehicle Queue Count',
          data: vehicleCounts,
          backgroundColor: 'rgba(0, 240, 255, 0.75)',
          borderColor: '#00f0ff',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // 2. Congestion Breakdown Doughnut (Neon Palette)
  const ctxCongestion = document.getElementById('chart-congestion');
  if (ctxCongestion) {
    if (chartCongestion) chartCongestion.destroy();
    chartCongestion = new Chart(ctxCongestion, {
      type: 'doughnut',
      data: {
        labels: ['Normal', 'Moderate', 'Heavy', 'Severe'],
        datasets: [{
          data: [
            distribution.NORMAL || 2,
            distribution.MODERATE || 2,
            distribution.HEAVY || 2,
            distribution.SEVERE || 1
          ],
          backgroundColor: ['#00ff88', '#ffb800', '#ff7700', '#ff3366'],
          borderColor: '#0b1220',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 14 } }
        }
      }
    });
  }

  // 3. Average Speed Comparison Bar Chart (Neon Violet)
  const ctxSpeed = document.getElementById('chart-speed');
  if (ctxSpeed) {
    if (chartSpeed) chartSpeed.destroy();
    chartSpeed = new Chart(ctxSpeed, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Avg Speed (km/h)',
          data: speeds,
          backgroundColor: 'rgba(176, 38, 255, 0.75)',
          borderColor: '#b026ff',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // 4. Signal Phase Distribution
  const ctxSignals = document.getElementById('chart-signals');
  if (ctxSignals) {
    let red = 0, yellow = 0, green = 0;
    signals.forEach(s => {
      if (s.status === 'RED') red++;
      else if (s.status === 'YELLOW') yellow++;
      else if (s.status === 'GREEN') green++;
    });

    if (chartSignals) chartSignals.destroy();
    chartSignals = new Chart(ctxSignals, {
      type: 'pie',
      data: {
        labels: ['Green Phase', 'Yellow Phase', 'Red Phase'],
        datasets: [{
          data: [green || 3, yellow || 1, red || 3],
          backgroundColor: ['#00ff88', '#ffb800', '#ff3366'],
          borderColor: '#0b1220',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 14 } }
        }
      }
    });
  }
}

function renderRecentAlerts(alerts) {
  const container = document.getElementById('dashboard-alerts-list');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); padding: 16px;">All urban arterials nominal. No active incident alerts.</div>';
    return;
  }

  container.innerHTML = alerts.slice(0, 4).map(a => `
    <div class="alert-item priority-${a.priority || 'LOW'}">
      <div class="alert-content">
        <div class="alert-header">
          <span class="badge ${a.priority === 'CRITICAL' ? 'badge-severe' : a.priority === 'HIGH' ? 'badge-heavy' : 'badge-moderate'}">
            ${a.priority}
          </span>
          <strong style="font-size: 0.85rem; color: #fff;">${escapeHtml(a.location)}</strong>
        </div>
        <div class="alert-msg">${escapeHtml(a.message)}</div>
        <div class="alert-time">${new Date(a.timestamp).toLocaleTimeString()} IST</div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-outline btn-sm" onclick="cctvViewer.open('${escapeHtml(a.location)}')">📹 CCTV</button>
        <button class="btn btn-secondary btn-sm" onclick="switchSection('alerts')">Manage &rarr;</button>
      </div>
    </div>
  `).join('');
}

function renderEmergencyBanner(emergencies) {
  const banner = document.getElementById('dashboard-emergency-banner');
  if (!banner) return;

  if (emergencies.length === 0) {
    banner.style.display = 'none';
    return;
  }

  const emg = emergencies[0];
  banner.style.display = 'block';
  banner.innerHTML = `
    <div class="emergency-corridor-box">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🚨</span>
          <div>
            <strong style="color: #fff; font-size: 0.95rem;">ACTIVE EMERGENCY PRIORITY DISPATCH (${escapeHtml(emg.vehicleType)})</strong>
            <div style="font-size: 0.8rem; color: #00f0ff; font-family: monospace;">ID: ${escapeHtml(emg.requestId)} | Vehicle: ${escapeHtml(emg.vehicleId)}</div>
          </div>
        </div>
        <button class="btn btn-primary btn-sm glow-btn" onclick="switchSection('emergency')">Open Corridor Controller &rarr;</button>
      </div>
      <div class="corridor-path">
        <span>${escapeHtml(emg.origin)}</span>
        <span>&rarr;</span>
        <span>${escapeHtml(emg.destination)}</span>
      </div>
    </div>
  `;
}

window.initDashboard = initDashboard;
window.loadDashboardData = loadDashboardData;
