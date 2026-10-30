/**
 * STMS - Live Traffic Monitoring & Management Module
 */

let trafficCurrentPage = 1;
let trafficTotalPages = 1;

async function initTraffic() {
  await loadTrafficTable();
}

async function loadTrafficTable(page = 1) {
  trafficCurrentPage = page;
  const search = document.getElementById('traffic-search')?.value.trim() || '';
  const congestionFilter = document.getElementById('traffic-filter-congestion')?.value || 'ALL';

  const tbody = document.getElementById('traffic-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading simulated traffic records...</td></tr>';
  }

  try {
    let url = `/traffic?page=${page}&limit=10&sortBy=timestamp&sortOrder=desc`;
    if (search) url += `&location=${encodeURIComponent(search)}`;
    if (congestionFilter !== 'ALL') url += `&congestion=${encodeURIComponent(congestionFilter)}`;

    const res = await api.get(url);
    const records = res.data || [];
    const pagination = res.pagination || { page: 1, pages: 1, total: 0 };
    trafficTotalPages = pagination.pages;

    renderTrafficRows(records);
    renderTrafficPagination(pagination);
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--status-severe); padding: 20px;">Failed to load traffic records: ${err.message}</td></tr>`;
    }
  }
}

function renderTrafficRows(records) {
  const tbody = document.getElementById('traffic-table-body');
  if (!tbody) return;

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 28px; color: var(--text-muted);">No traffic records match current criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => {
    const badgeClass = r.congestion === 'NORMAL' ? 'badge-normal'
      : r.congestion === 'MODERATE' ? 'badge-moderate'
      : r.congestion === 'HEAVY' ? 'badge-heavy'
      : 'badge-severe';

    return `
      <tr>
        <td>
          <div style="font-weight: 600;">${escapeHtml(r.location)}</div>
          <div style="font-size: 0.725rem; color: var(--text-muted);">${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</div>
        </td>
        <td><span style="font-family: monospace; font-size: 0.95rem; font-weight: 600;">${r.vehicleCount}</span></td>
        <td><span style="font-family: monospace; font-size: 0.95rem;">${r.avgSpeed} km/h</span></td>
        <td><span class="badge ${badgeClass}">${r.congestion}</span></td>
        <td><span style="font-family: monospace; font-size: 0.8rem; color: var(--text-secondary);">${r.sensorId || 'N/A'}</span></td>
        <td><span class="badge badge-secondary">${r.dataSource}</span></td>
        <td style="font-size: 0.775rem; color: var(--text-muted);">${new Date(r.timestamp).toLocaleTimeString()}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm" onclick="openEditTrafficModal('${r._id}', '${escapeHtml(r.location)}', ${r.latitude}, ${r.longitude}, ${r.vehicleCount}, ${r.avgSpeed}, '${r.sensorId}')">Edit</button>
            <button class="btn btn-danger btn-sm role-traffic-admin" onclick="confirmDeleteTraffic('${r._id}', '${escapeHtml(r.location)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTrafficPagination(pagination) {
  const container = document.getElementById('traffic-pagination');
  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 0.825rem; color: var(--text-muted);">
      <div>Total Records: ${pagination.total} (Page ${pagination.page} of ${pagination.pages})</div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" ${pagination.page <= 1 ? 'disabled' : ''} onclick="loadTrafficTable(${pagination.page - 1})">Previous</button>
        <button class="btn btn-secondary btn-sm" ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="loadTrafficTable(${pagination.page + 1})">Next</button>
      </div>
    </div>
  `;
}

function openAddTrafficModal() {
  document.getElementById('modal-traffic-title').textContent = 'Register Traffic Measurement';
  document.getElementById('form-traffic-id').value = '';
  document.getElementById('form-traffic-location').value = '';
  document.getElementById('form-traffic-lat').value = '13.0418';
  document.getElementById('form-traffic-lng').value = '80.2341';
  document.getElementById('form-traffic-count').value = '30';
  document.getElementById('form-traffic-speed').value = '35';
  document.getElementById('form-traffic-sensor').value = 'SEN-MANUAL-01';

  document.getElementById('modal-traffic').classList.add('active');
}

function openEditTrafficModal(id, location, lat, lng, count, speed, sensorId) {
  document.getElementById('modal-traffic-title').textContent = 'Edit Traffic Measurement';
  document.getElementById('form-traffic-id').value = id;
  document.getElementById('form-traffic-location').value = location;
  document.getElementById('form-traffic-lat').value = lat;
  document.getElementById('form-traffic-lng').value = lng;
  document.getElementById('form-traffic-count').value = count;
  document.getElementById('form-traffic-speed').value = speed;
  document.getElementById('form-traffic-sensor').value = sensorId;

  document.getElementById('modal-traffic').classList.add('active');
}

function closeTrafficModal() {
  document.getElementById('modal-traffic').classList.remove('active');
}

async function handleSaveTraffic(e) {
  e.preventDefault();
  const id = document.getElementById('form-traffic-id').value;
  const payload = {
    location: document.getElementById('form-traffic-location').value.trim(),
    latitude: parseFloat(document.getElementById('form-traffic-lat').value),
    longitude: parseFloat(document.getElementById('form-traffic-lng').value),
    vehicleCount: parseInt(document.getElementById('form-traffic-count').value, 10),
    avgSpeed: parseFloat(document.getElementById('form-traffic-speed').value),
    sensorId: document.getElementById('form-traffic-sensor').value.trim(),
    dataSource: 'MANUAL'
  };

  try {
    if (id) {
      await api.put(`/traffic/${id}`, payload);
      showToast('Traffic record updated successfully.', 'success');
    } else {
      await api.post('/traffic', payload);
      showToast('New traffic record created & classified.', 'success');
    }
    closeTrafficModal();
    loadTrafficTable(trafficCurrentPage);
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
  }
}

async function confirmDeleteTraffic(id, location) {
  if (confirm(`Confirm deletion of traffic measurement for ${location}?`)) {
    try {
      await api.delete(`/traffic/${id}`);
      showToast(`Record for ${location} removed.`, 'success');
      loadTrafficTable(trafficCurrentPage);
    } catch (err) {
      showToast(err.message || 'Failed to delete record', 'error');
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
