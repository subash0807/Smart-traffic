/**
 * STMS - Sensor Management & Health Telemetry Module
 */

async function initSensors() {
  await loadSensorsList();
}

async function loadSensorsList() {
  const container = document.getElementById('sensors-grid-container');
  if (!container) return;

  try {
    const res = await api.get('/sensors');
    const sensors = res.data || [];

    if (sensors.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">No road sensors registered in fleet.</div>';
      return;
    }

    container.innerHTML = sensors.map(s => {
      const isOnline = s.status === 'ONLINE';
      const isMaintenance = s.status === 'MAINTENANCE';

      const statusBadge = isOnline ? 'badge-normal' : isMaintenance ? 'badge-moderate' : 'badge-severe';

      return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div style="font-weight: 700; font-size: 1.05rem;">${escapeHtml(s.location)}</div>
              <span class="badge ${statusBadge}">${s.status}</span>
            </div>

            <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
              <div>Sensor ID: <code>${s.sensorId}</code></div>
              <div>Type: <strong style="color: var(--text-primary);">${s.type}</strong></div>
              <div>Heartbeat: <span style="color: var(--text-muted); font-size: 0.8rem;">${new Date(s.lastReceivedAt).toLocaleTimeString()}</span></div>
              
              ${s.latestReading ? `
                <div style="margin-top: 8px; padding: 8px; background: var(--bg-surface); border-radius: var(--radius-sm); font-size: 0.775rem;">
                  <span style="color: var(--text-muted);">Latest Telemetry:</span><br>
                  Queue: <strong>${s.latestReading.vehicleCount} veh</strong> | Speed: <strong>${s.latestReading.avgSpeed} km/h</strong>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Simulation Actions -->
          <div style="display: flex; gap: 8px; margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 12px; flex-wrap: wrap;">
            ${isOnline ? `
              <button class="btn btn-danger btn-sm" onclick="setSensorStatus('${s._id}', 'OFFLINE')">
                Simulate Failure
              </button>
              <button class="btn btn-warning btn-sm" onclick="setSensorStatus('${s._id}', 'MAINTENANCE')">
                Maintenance
              </button>
            ` : `
              <button class="btn btn-success btn-sm" onclick="setSensorStatus('${s._id}', 'ONLINE')">
                Restore Online
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color: var(--status-severe); padding: 20px;">Failed to load sensors: ${err.message}</div>`;
  }
}

async function setSensorStatus(id, newStatus) {
  try {
    await api.put(`/sensors/${id}`, { status: newStatus });
    showToast(`Sensor telemetry status changed to ${newStatus}.`, newStatus === 'ONLINE' ? 'success' : 'warning');
    loadSensorsList();
  } catch (err) {
    showToast(err.message || 'Status update failed', 'error');
  }
}

function openAddSensorModal() {
  document.getElementById('modal-sensor').classList.add('active');
}

function closeAddSensorModal() {
  document.getElementById('modal-sensor').classList.remove('active');
}

async function handleCreateSensor(e) {
  e.preventDefault();
  const sensorId = document.getElementById('sensor-id').value.trim();
  const location = document.getElementById('sensor-location').value.trim();
  const type = document.getElementById('sensor-type').value;

  try {
    await api.post('/sensors', { sensorId, location, type, status: 'ONLINE' });
    showToast(`Sensor ${sensorId} registered successfully.`, 'success');
    closeAddSensorModal();
    loadSensorsList();
  } catch (err) {
    showToast(err.message || 'Failed to register sensor', 'error');
  }
}
