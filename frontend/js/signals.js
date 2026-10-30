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

    return `
      <div class="signal-card">
        <!-- Animated 3-Lens Traffic Light Housing -->
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
            <div>Signal ID: <code style="color: var(--text-accent);">${s.signalId}</code></div>
            <div>Phase: <strong style="color: ${isRed ? '#ef4444' : isYellow ? '#f59e0b' : '#10b981'};">${s.status}</strong> (${s.duration}s timer)</div>
            <div>Last Switched: ${new Date(s.lastUpdated).toLocaleTimeString()}</div>
          </div>

          <!-- Controls for Manual / Mode Switch -->
          <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
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
  try {
    await api.put(`/signals/${id}`, { mode: newMode });
    showToast(`Signal operating mode switched to ${newMode}.`, 'info');
    loadSignals();
  } catch (err) {
    showToast(err.message || 'Failed to toggle mode', 'error');
  }
}

async function promptChangeSignalState(id, location, newStatus) {
  if (confirm(`SIMULATION CONFIRMATION:\nAre you sure you want to manually command the signal at "${location}" to ${newStatus}?`)) {
    try {
      await api.put(`/signals/${id}`, { status: newStatus, mode: 'MANUAL' });
      showToast(`Signal at ${location} set to ${newStatus} (Switched to MANUAL mode).`, 'success');
      loadSignals();
    } catch (err) {
      showToast(err.message || 'Command rejected', 'error');
    }
  }
}

async function openSignalHistory(id) {
  const signal = currentSignals.find(s => s._id === id);
  if (!signal) return;

  const historyList = signal.stateHistory || [];
  let html = `
    <h3 style="margin-bottom: 12px;">Signal Phase Change History</h3>
    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 14px;">Signal: ${escapeHtml(signal.location)} (${signal.signalId})</div>
    <div class="table-responsive" style="max-height: 320px; overflow-y: auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Previous</th>
            <th>New State</th>
            <th>Mode</th>
            <th>Operator</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (historyList.length === 0) {
    html += `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No manual state transitions recorded yet.</td></tr>`;
  } else {
    historyList.slice().reverse().forEach(h => {
      html += `
        <tr>
          <td>${new Date(h.timestamp).toLocaleTimeString()}</td>
          <td>${h.previousStatus || '-'}</td>
          <td><strong>${h.newStatus}</strong></td>
          <td>${h.mode || 'MANUAL'}</td>
          <td>${h.changedBy || 'System'}</td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div>`;

  showGenericModal('Signal Transition Audit Log', html);
}

function showGenericModal(title, bodyHtml) {
  let modal = document.getElementById('modal-generic');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-generic';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="modal-generic-title" style="font-size: 1.1rem;"></h3>
          <button class="modal-close" onclick="document.getElementById('modal-generic').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body" id="modal-generic-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('modal-generic-title').textContent = title;
  document.getElementById('modal-generic-body').innerHTML = bodyHtml;
  modal.classList.add('active');
}
