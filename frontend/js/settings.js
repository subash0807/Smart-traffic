/**
 * STMS - Settings, Thresholds & System Health Diagnostics Module
 */

async function initSettings() {
  await loadSystemHealth();
  await loadThresholdSettings();
  await loadAuditLogs();
}

async function loadSystemHealth() {
  try {
    const res = await api.get('/health');
    setElText('health-system-name', res.system || 'STMS');
    setElText('health-version', res.version || '1.0.0');
    setElText('health-status', res.status || 'HEALTHY');
    setElText('health-uptime', `${res.uptimeSeconds}s`);
    setElText('health-db-status', res.database?.status || 'Unknown');
    setElText('health-db-type', res.database?.type || 'In-Memory/Local');
    setElText('health-db-name', res.database?.name || 'smart_traffic');

    // Update topbar status dot
    const statusDot = document.getElementById('topbar-health-dot');
    if (statusDot) {
      statusDot.className = `status-dot ${res.status === 'HEALTHY' ? 'dot-normal' : 'dot-severe'} dot-pulse`;
    }
  } catch (err) {
    setElText('health-status', 'OFFLINE');
    setElText('health-db-status', 'UNREACHABLE');
  }
}

async function loadThresholdSettings() {
  try {
    const res = await api.get('/congestion/thresholds');
    const t = res.data || {};

    const elNormalCount = document.getElementById('th-normal-count');
    const elNormalSpeed = document.getElementById('th-normal-speed');
    const elModerateCount = document.getElementById('th-moderate-count');
    const elModerateSpeed = document.getElementById('th-moderate-speed');
    const elHeavyCount = document.getElementById('th-heavy-count');
    const elHeavySpeed = document.getElementById('th-heavy-speed');
    const elSevereCount = document.getElementById('th-severe-count');

    if (elNormalCount) elNormalCount.value = t.normalMaxVehicles || 20;
    if (elNormalSpeed) elNormalSpeed.value = t.normalMinSpeed || 40;
    if (elModerateCount) elModerateCount.value = t.moderateMaxVehicles || 39;
    if (elModerateSpeed) elModerateSpeed.value = t.moderateMinSpeed || 25;
    if (elHeavyCount) elHeavyCount.value = t.heavyMaxVehicles || 59;
    if (elHeavySpeed) elHeavySpeed.value = t.heavyMinSpeed || 15;
    if (elSevereCount) elSevereCount.value = t.severeMinVehicles || 60;
  } catch (err) {
    console.error('Failed to load thresholds:', err);
  }
}

async function handleSaveThresholds(e) {
  e.preventDefault();
  const payload = {
    normalMaxVehicles: parseInt(document.getElementById('th-normal-count').value, 10),
    normalMinSpeed: parseInt(document.getElementById('th-normal-speed').value, 10),
    moderateMaxVehicles: parseInt(document.getElementById('th-moderate-count').value, 10),
    moderateMinSpeed: parseInt(document.getElementById('th-moderate-speed').value, 10),
    heavyMaxVehicles: parseInt(document.getElementById('th-heavy-count').value, 10),
    heavyMinSpeed: parseInt(document.getElementById('th-heavy-speed').value, 10),
    severeMinVehicles: parseInt(document.getElementById('th-severe-count').value, 10)
  };

  try {
    await api.put('/congestion/thresholds', payload);
    showToast('Congestion rule thresholds updated successfully.', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to update thresholds', 'error');
  }
}

async function loadAuditLogs() {
  const container = document.getElementById('audit-logs-table-body');
  if (!container) return;

  try {
    const res = await api.get('/audit-logs?limit=25');
    const logs = res.data || [];

    if (logs.length === 0) {
      container.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No audit records found.</td></tr>';
      return;
    }

    container.innerHTML = logs.map(l => `
      <tr>
        <td style="font-size: 0.775rem; color: var(--text-muted);">${new Date(l.timestamp).toLocaleString()}</td>
        <td><strong>${escapeHtml(l.userName)}</strong></td>
        <td><code>${l.action}</code></td>
        <td><span class="badge badge-secondary">${l.resourceType}</span></td>
        <td style="font-size: 0.775rem;"><code>${l.resourceId || '-'}</code></td>
      </tr>
    `).join('');
  } catch (err) {
    container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--status-severe); padding: 16px;">Failed to load audit logs: ${err.message}</td></tr>`;
  }
}

async function handleResetDatabase() {
  if (confirm('CAUTION: Are you sure you want to reset the demonstration database?\nThis will reinitialize all sample records and demo users to default state.')) {
    try {
      showToast('Re-seeding database in progress...', 'info');
      const res = await api.post('/seed', {});
      showToast('Database reset complete with clean demo data!', 'success', 3500);
      loadSystemHealth();
      loadAuditLogs();
    } catch (err) {
      showToast(err.message || 'Failed to re-seed database', 'error');
    }
  }
}
