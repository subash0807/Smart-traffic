/**
 * STMS - Emergency Vehicle Priority & Green Corridor Simulation Module
 */

async function initEmergency() {
  await loadEmergencyRequests();
  await loadEmergencyVehicles();
}

async function loadEmergencyRequests() {
  const container = document.getElementById('emergency-requests-list');
  if (!container) return;

  try {
    const res = await api.get('/emergency-requests');
    const requests = res.data || [];

    if (requests.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 18px 0;">No active or past emergency priority dispatches.</div>';
      return;
    }

    container.innerHTML = requests.map(req => {
      const isPending = req.status === 'PENDING';
      const isApproved = req.status === 'APPROVED';

      const statusBadge = isPending ? 'badge-moderate'
        : isApproved ? 'badge-emergency'
        : req.status === 'COMPLETED' ? 'badge-normal'
        : 'badge-secondary';

      return `
        <div class="card" style="margin-bottom: 14px; border-left: 4px solid ${isApproved ? 'var(--status-emergency)' : isPending ? 'var(--status-moderate)' : 'var(--border-subtle)'};">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">${req.vehicleType === 'FIRE_ENGINE' ? '🚒' : req.vehicleType === 'POLICE' ? '🚓' : '🚑'}</span>
              <div>
                <strong style="font-size: 1rem;">${req.vehicleType} (${req.vehicleId})</strong>
                <span class="badge ${statusBadge}" style="margin-left: 8px;">${req.status}</span>
              </div>
            </div>
            <div style="font-size: 0.775rem; color: var(--text-muted);">
              Requested: ${new Date(req.requestedAt).toLocaleTimeString()}
            </div>
          </div>

          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
            <div><strong>Origin:</strong> ${escapeHtml(req.origin)} &rarr; <strong>Destination:</strong> ${escapeHtml(req.destination)}</div>
            <div style="margin-top: 4px;"><strong>Recommended Plan:</strong> ${escapeHtml(req.recommendedPlan)}</div>
          </div>

          <!-- Affected Junctions Corridor Path -->
          <div class="emergency-corridor-box" style="margin-bottom: 12px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Affected Priority Junctions:</div>
            <div class="corridor-path">
              ${req.affectedJunctions.map((j, idx) => `
                <span>${escapeHtml(j)}</span>
                ${idx < req.affectedJunctions.length - 1 ? '<span style="color: var(--text-muted);">&rarr;</span>' : ''}
              `).join('')}
            </div>
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            ${isPending ? `
              <button class="btn btn-primary btn-sm role-traffic-admin" onclick="updateEmergencyStatus('${req._id}', 'APPROVED')">
                Approve Green Corridor
              </button>
              <button class="btn btn-secondary btn-sm role-traffic-admin" onclick="updateEmergencyStatus('${req._id}', 'REJECTED')">
                Reject
              </button>
            ` : ''}

            ${isApproved ? `
              <button class="btn btn-success btn-sm role-traffic-admin" onclick="updateEmergencyStatus('${req._id}', 'COMPLETED')">
                Mark Passage Completed
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--status-severe); padding: 18px;">Failed to load emergency dispatches: ${err.message}</div>`;
  }
}

async function loadEmergencyVehicles() {
  const container = document.getElementById('emergency-vehicles-table');
  if (!container) return;

  try {
    const res = await api.get('/vehicles');
    const vehicles = res.data || [];

    if (vehicles.length === 0) {
      container.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">No registered vehicles found.</td></tr>';
      return;
    }

    container.innerHTML = vehicles.map(v => `
      <tr>
        <td><code>${v.vehicleId}</code></td>
        <td><strong>${v.type}</strong></td>
        <td>${escapeHtml(v.location)}</td>
        <td>${escapeHtml(v.destination)}</td>
        <td><span class="badge ${v.priority === 'EMERGENCY' ? 'badge-emergency' : v.priority === 'HIGH' ? 'badge-heavy' : 'badge-secondary'}">${v.priority}</span></td>
        <td><span class="badge ${v.status === 'EN_ROUTE' ? 'badge-emergency' : v.status === 'ACTIVE' ? 'badge-normal' : 'badge-secondary'}">${v.status}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load vehicles:', err);
  }
}

function openCreateEmergencyModal() {
  document.getElementById('modal-emergency').classList.add('active');
}

function closeCreateEmergencyModal() {
  document.getElementById('modal-emergency').classList.remove('active');
}

async function handleCreateEmergencyRequest(e) {
  e.preventDefault();
  const vehicleId = document.getElementById('emg-vehicle-id').value.trim();
  const vehicleType = document.getElementById('emg-vehicle-type').value;
  const origin = document.getElementById('emg-origin').value.trim();
  const destination = document.getElementById('emg-destination').value.trim();
  const junctionsRaw = document.getElementById('emg-corridor-junctions').value.trim();

  const affectedJunctions = junctionsRaw ? junctionsRaw.split(',').map(s => s.trim()).filter(Boolean) : [origin, destination];

  try {
    await api.post('/emergency-requests', {
      vehicleId,
      vehicleType,
      origin,
      destination,
      affectedJunctions,
      priority: 'CRITICAL'
    });
    showToast(`Emergency priority corridor requested for ${vehicleId}!`, 'emergency', 4000);
    closeCreateEmergencyModal();
    loadEmergencyRequests();
    loadEmergencyVehicles();
  } catch (err) {
    showToast(err.message || 'Failed to dispatch emergency request', 'error');
  }
}

async function updateEmergencyStatus(id, newStatus) {
  try {
    await api.put(`/emergency-requests/${id}`, { status: newStatus });
    showToast(`Emergency request marked as ${newStatus}.`, 'success');
    loadEmergencyRequests();
    loadEmergencyVehicles();
  } catch (err) {
    showToast(err.message || 'Status update failed', 'error');
  }
}
