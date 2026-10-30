/**
 * STMS - Alerts and Incident Notification Center
 */

async function initAlerts() {
  await loadAlerts();
}

async function loadAlerts() {
  const container = document.getElementById('alerts-full-list');
  if (!container) return;

  const priority = document.getElementById('alert-filter-priority')?.value || 'ALL';
  const status = document.getElementById('alert-filter-status')?.value || 'ALL';
  const type = document.getElementById('alert-filter-type')?.value || 'ALL';

  let url = '/alerts?limit=50';
  if (priority !== 'ALL') url += `&priority=${priority}`;
  if (status !== 'ALL') url += `&status=${status}`;
  if (type !== 'ALL') url += `&type=${type}`;

  try {
    const res = await api.get(url);
    const alerts = res.data || [];

    // Keep sidebar alert badge synchronized
    updateNavAlertBadge(alerts);

    if (alerts.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 30px; text-align: center;">No alerts matching the selected filters.</div>';
      return;
    }

    container.innerHTML = alerts.map(a => {
      const isNew = a.status === 'NEW';
      const isAck = a.status === 'ACKNOWLEDGED';
      const isResolved = a.status === 'RESOLVED';

      return `
        <div class="card" style="margin-bottom: 12px; border-left: 4px solid ${
          a.priority === 'CRITICAL' ? 'var(--status-severe)'
          : a.priority === 'HIGH' ? 'var(--status-heavy)'
          : a.priority === 'MEDIUM' ? 'var(--status-moderate)'
          : 'var(--primary)'
        };">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge ${
                a.priority === 'CRITICAL' ? 'badge-severe'
                : a.priority === 'HIGH' ? 'badge-heavy'
                : 'badge-moderate'
              }">${a.priority}</span>
              <span class="badge badge-secondary">${a.type}</span>
              <strong style="font-size: 0.95rem;">${escapeHtml(a.location)}</strong>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge ${isNew ? 'badge-severe' : isAck ? 'badge-moderate' : 'badge-normal'}">${a.status}</span>
              <span style="font-size: 0.775rem; color: var(--text-muted);">${new Date(a.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div style="margin: 10px 0; font-size: 0.9rem; color: var(--text-primary);">
            ${escapeHtml(a.message)}
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.775rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 8px;">
            <div>Alert ID: <code>${a.alertId}</code> ${a.acknowledgedBy ? ` | Ack by: <strong>${escapeHtml(a.acknowledgedBy)}</strong>` : ''}</div>
            
            <div style="display: flex; gap: 8px;">
              ${!isResolved ? `
                ${isNew ? `
                  <button class="btn btn-secondary btn-sm" onclick="handleAcknowledgeAlert('${a.alertId}')">Acknowledge</button>
                ` : ''}
                <button class="btn btn-success btn-sm" onclick="handleResolveAlert('${a.alertId}')">Resolve Incident</button>
              ` : `
                <span style="color: var(--status-normal);">Resolved at ${new Date(a.resolvedAt).toLocaleTimeString()}</span>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--status-severe); padding: 20px;">Failed to load alerts: ${err.message}</div>`;
  }
}

async function handleAcknowledgeAlert(alertId) {
  try {
    await api.put(`/alerts/${alertId}/acknowledge`);
    showToast(`Alert ${alertId} acknowledged.`, 'info');
    loadAlerts();
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

async function handleResolveAlert(alertId) {
  try {
    await api.put(`/alerts/${alertId}/resolve`);
    showToast(`Alert ${alertId} resolved.`, 'success');
    loadAlerts();
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

function updateNavAlertBadge(alerts) {
  const badge = document.getElementById('nav-alert-badge');
  if (!badge) return;
  const unreadAlerts = alerts.filter(a => a.status === 'NEW').length;
  badge.textContent = unreadAlerts > 0 ? unreadAlerts : (alerts.length > 0 ? alerts.length : 0);
  badge.style.display = unreadAlerts > 0 || alerts.length > 0 ? 'inline-flex' : 'none';
}

