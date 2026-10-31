/**
 * STMS - Traffic Signal Simulation & Control Module
 */

let currentSignals = [];

async function initSignals() {
  await loadSignals();
}

async function loadSignals() {
  const container = document.getElementById('signals-grid-container');
  if (!container) return;

  try {
    const res = await api.get('/signals');
    currentSignals = res.data || [];
    renderSignalsList(currentSignals);
  } catch (err) {
    container.innerHTML = `<div style="color: var(--status-severe); padding: 20px;">Failed to load signals: ${err.message}</div>`;
  }
}

function renderSignalsList(signals) {
  const container = document.getElementById('signals-grid-container');
  if (!container) return;

  if (signals.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">No traffic signals registered.</div>';
    return;
  }

  container.innerHTML = signals.map(s => {
    const isAuto = s.mode === 'AUTOMATIC';
    const isRed = s.status === 'RED';
    const isYellow = s.status === 'YELLOW';
    const isGreen = s.status === 'GREEN';
    const activeColor = isRed ? '#ff3366' : isYellow ? '#ffb800' : '#00ff88';

    return `
      <div class="signal-card">
        <!-- 3D Physical Traffic Light Housing with Glow -->
        <div class="signal-housing">
          <div class="signal-lens red ${isRed ? 'active' : ''}"></div>
          <div class="signal-lens yellow ${isYellow ? 'active' : ''}"></div>
          <div class="signal-lens green ${isGreen ? 'active' : ''}"></div>
        </div>

        <!-- Signal Information & Controls -->
        <div class="signal-info">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div class="signal-title">${escapeHtml(s.location)}</div>
            <span class="badge ${isAuto ? 'badge-secondary' : 'badge-moderate'}">${s.mode}</span>
          </div>

          <div class="signal-meta">
            <div>Signal ID: <code style="color: #00f0ff;">${s.signalId}</code></div>
            <div>Phase: <strong style="color: ${activeColor}; font-size: 0.9rem;">${s.status}</strong> (${s.duration}s timer)</div>
            <div>Last State Switch: ${new Date(s.lastUpdated).toLocaleTimeString()}</div>
          </div>

          <!-- Controls for Manual / Mode Switch -->
          <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
            <button class="btn btn-outline btn-sm" onclick="cctvViewer.open('${escapeHtml(s.location)}')">
              📹 View CCTV
            </button>
            <button class="btn btn-outline btn-sm" onclick="toggleSignalMode('${s._id}', '${s.mode}')">
              Set ${isAuto ? 'MANUAL' : 'AUTO'}
            </button>
            <button class="btn btn-danger btn-sm" ${isRed ? 'disabled' : ''} onclick="promptChangeSignalState('${s._id}', '${escapeHtml(s.location)}', 'RED')">
              Force RED
            </button>
            <button class="btn btn-warning btn-sm" ${isYellow ? 'disabled' : ''} onclick="promptChangeSignalState('${s._id}', '${escapeHtml(s.location)}', 'YELLOW')">
              YELLOW
            </button>
            <button class="btn btn-success btn-sm" ${isGreen ? 'disabled' : ''} onclick="promptChangeSignalState('${s._id}', '${escapeHtml(s.location)}', 'GREEN')">
              Force GREEN
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openSignalHistory('${s._id}')" title="View Transition Audit Log">
              History
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleSignalMode(id, currentMode) {
  const newMode = currentMode === 'AUTOMATIC' ? 'MANUAL' : 'AUTOMATIC';
  if (window.soundFx) window.soundFx.playClick();
  try {
    await api.put(`/signals/${id}`, { mode: newMode });
    showToast(`Signal operating mode switched to ${newMode}.`, 'info');
    loadSignals();
  } catch (err) {
    showToast(err.message || 'Failed to toggle mode', 'error');
  }
}

async function promptChangeSignalState(id, location, newStatus) {
  if (confirm(`SIMULATION COMMAND:\nCommand the signal at "${location}" to force ${newStatus}?`)) {
    if (window.soundFx) window.soundFx.playSuccess();
    try {
      await api.put(`/signals/${id}`, { status: newStatus, mode: 'MANUAL' });
      showToast(`Signal at ${location} commanded to ${newStatus}.`, 'success');
      loadSignals();
      if (typeof loadDashboardData === 'function') loadDashboardData();
    } catch (err) {
      showToast(err.message || 'Failed to command signal', 'error');
    }
  }
}

async function openSignalHistory(id) {
  try {
    const res = await api.get(`/signals/${id}`);
    const signal = res.data;
    if (!signal) return;

    const history = signal.stateHistory || [];
    let historyHtml = '<div style="max-height: 350px; overflow-y: auto;">';

    if (history.length === 0) {
      historyHtml += '<p style="color: var(--text-muted); padding: 12px 0;">No manual transition overrides logged yet. Signal is in nominal autonomous cycle.</p>';
    } else {
      historyHtml += `
        <table class="table" style="font-size: 0.8rem; margin-top: 8px;">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Transition</th>
              <th>Mode</th>
              <th>Commanded By</th>
            </tr>
          </thead>
          <tbody>
            ${history.slice().reverse().map(h => `
              <tr>
                <td>${new Date(h.timestamp).toLocaleTimeString()}</td>
                <td>
                  <span class="badge ${h.previousStatus === 'GREEN' ? 'badge-normal' : h.previousStatus === 'RED' ? 'badge-severe' : 'badge-moderate'}">${h.previousStatus}</span>
                  &rarr;
                  <span class="badge ${h.newStatus === 'GREEN' ? 'badge-normal' : h.newStatus === 'RED' ? 'badge-severe' : 'badge-moderate'}">${h.newStatus}</span>
                </td>
                <td><span class="badge badge-secondary">${h.mode}</span></td>
                <td><code>${escapeHtml(h.changedBy || 'System')}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    historyHtml += '</div>';

    // Show in modal
    let modal = document.getElementById('modal-signal-history');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-signal-history';
      modal.className = 'modal-overlay active';
      document.body.appendChild(modal);
    } else {
      modal.className = 'modal-overlay active';
    }

    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title"><span>🚥</span> State Transition Log: ${escapeHtml(signal.location)}</h3>
          <button class="modal-close" onclick="document.getElementById('modal-signal-history').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
          ${historyHtml}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-signal-history').classList.remove('active')">Close</button>
        </div>
      </div>
    `;
  } catch (err) {
    showToast(err.message || 'Failed to load signal audit history', 'error');
  }
}

window.initSignals = initSignals;
window.loadSignals = loadSignals;
window.toggleSignalMode = toggleSignalMode;
window.promptChangeSignalState = promptChangeSignalState;
window.openSignalHistory = openSignalHistory;
