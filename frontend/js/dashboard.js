/**
 * STMS - Dashboard Controller & Interactive Chart.js Visualizations
 */

let chartVehicles = null;
let chartCongestion = null;
let chartSpeed = null;
let chartSignals = null;
let dashboardRefreshTimer = null;

async function initDashboard() {
  await loadDashboardData();

  // Clear existing timer if any
  if (dashboardRefreshTimer) clearInterval(dashboardRefreshTimer);
  dashboardRefreshTimer = setInterval(loadDashboardData, 8000);
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

    // 1. Update KPI Summary Cards
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

    // Update alert count badge in topbar
    const unreadAlerts = alerts.filter(a => a.status === 'NEW').length;
    const badge = document.getElementById('nav-alert-badge');
    if (badge) {
      badge.textContent = unreadAlerts > 0 ? unreadAlerts : alerts.length;
      badge.style.display = alerts.length > 0 ? 'inline-flex' : 'none';
    }

    // Update Last Refreshed Time
    setElText('last-refresh-time', new Date().toLocaleTimeString());

    // 2. Render Charts
    renderCharts(junctions, summary.distribution || {}, signals);

    // 3. Render Dashboard Recent Alerts List
    renderRecentAlerts(alerts);

    // 4. Render Active Emergency Corridor Banner
    renderEmergencyBanner(pendingEmergencies);

  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
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

  const labels = junctions.map(j => j.location.split(' ')[0] + ' ' + (j.location.split(' ')[1] || ''));
  const vehicleCounts = junctions.map(j => j.vehicleCount);
  const speeds = junctions.map(j => j.avgSpeed);

  // 1. Vehicle Count by Location Bar Chart
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
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });
  }

  // 2. Congestion Distribution Doughnut
  const ctxCongestion = document.getElementById('chart-congestion');
  if (ctxCongestion) {
    if (chartCongestion) chartCongestion.destroy();
    chartCongestion = new Chart(ctxCongestion, {
      type: 'doughnut',
      data: {
        labels: ['Normal', 'Moderate', 'Heavy', 'Severe'],
        datasets: [{
          data: [
            distribution.NORMAL || 0,
            distribution.MODERATE || 0,
            distribution.HEAVY || 0,
            distribution.SEVERE || 0
          ],
          backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 14 } }
        }
      }
    });
  }

  // 3. Average Speed Comparison Bar Chart
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
          backgroundColor: '#06b6d4',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });
  }

  // 4. Traffic Signal Status Pie Chart
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
          data: [green, yellow, red],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12 } }
        }
      }
    });
  }
}

function renderRecentAlerts(alerts) {
  const container = document.getElementById('dashboard-alerts-list');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">No active alerts at this time. Flow is nominal.</div>';
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="alert-item priority-${a.priority}">
      <div class="alert-content">
        <div class="alert-header">
          <span class="badge badge-${a.priority === 'CRITICAL' ? 'severe' : a.priority === 'HIGH' ? 'heavy' : 'moderate'}">${a.priority}</span>
          <span style="font-weight: 600; font-size: 0.85rem;">${a.location}</span>
          <span class="alert-time">${new Date(a.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="alert-msg">${a.message}</div>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" onclick="quickAcknowledge('${a.alertId}')">Acknowledge</button>
      </div>
    </div>
  `).join('');
}

async function quickAcknowledge(alertId) {
  try {
    await api.put(`/alerts/${alertId}/acknowledge`);
    showToast(`Alert ${alertId} acknowledged.`, 'success');
    loadDashboardData();
  } catch (err) {
    showToast(err.message || 'Failed to acknowledge alert', 'error');
  }
}

function renderEmergencyBanner(pendingEmergencies) {
  const container = document.getElementById('dashboard-emergency-banner');
  if (!container) return;

  if (pendingEmergencies.length === 0) {
    container.style.display = 'none';
    return;
  }

  const req = pendingEmergencies[0];
  container.style.display = 'block';
  container.innerHTML = `
    <div style="background: rgba(6, 182, 212, 0.15); border: 1px solid var(--status-emergency); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">🚨</span>
        <div>
          <div style="font-weight: 700; color: #38bdf8;">ACTIVE EMERGENCY PRIORITY: ${req.vehicleType} (${req.vehicleId})</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${req.origin} &rarr; ${req.destination} | Route: [${req.affectedJunctions.join(' &rarr; ')}]</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" onclick="switchSection('emergency')">View Corridor Dispatch</button>
      </div>
    </div>
  `;
}
