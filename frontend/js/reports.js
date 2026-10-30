/**
 * STMS - Reports & Historical Traffic Analytics Module
 */

async function initReports() {
  await loadReportSummary();
}

async function loadReportSummary() {
  const container = document.getElementById('report-summary-container');
  if (!container) return;

  const startDate = document.getElementById('report-start-date')?.value || '';
  const endDate = document.getElementById('report-end-date')?.value || '';
  const location = document.getElementById('report-filter-location')?.value || 'ALL';
  const congestion = document.getElementById('report-filter-congestion')?.value || 'ALL';

  let url = '/reports/summary?';
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (location !== 'ALL') url += `&location=${encodeURIComponent(location)}`;
  if (congestion !== 'ALL') url += `&congestion=${encodeURIComponent(congestion)}`;

  try {
    const res = await api.get(url);
    const data = res.data || {};
    const sum = data.summary || {};
    const locations = data.locationStats || [];

    // Render Metric Cards
    setElText('rep-total-records', sum.totalRecordsAnalyzed || 0);
    setElText('rep-total-vehicles', sum.totalVehiclesRecorded || 0);
    setElText('rep-avg-speed', (sum.overallAverageSpeed || 0) + ' km/h');
    setElText('rep-severe-incidents', sum.severeCongestionEvents || 0);
    setElText('rep-active-signals', sum.activeSignalsCount || 0);
    setElText('rep-total-alerts', sum.totalAlertsRecorded || 0);

    // Render Location Breakdown Table
    const tbody = document.getElementById('report-locations-table-body');
    if (tbody) {
      if (locations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px;">No records found for specified date range.</td></tr>';
      } else {
        tbody.innerHTML = locations.map(loc => `
          <tr>
            <td><strong>${escapeHtml(loc.location)}</strong></td>
            <td><span style="font-family: monospace;">${loc.totalVehicles}</span></td>
            <td><span style="font-family: monospace;">${loc.avgVehicles}</span></td>
            <td><span style="font-family: monospace;">${loc.avgSpeed} km/h</span></td>
            <td><span class="badge ${loc.severeIncidents > 0 ? 'badge-severe' : 'badge-normal'}">${loc.severeIncidents} Incidents</span></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load report analytics:', err);
  }
}

function exportReportCSV() {
  const startDate = document.getElementById('report-start-date')?.value || '';
  const endDate = document.getElementById('report-end-date')?.value || '';
  const location = document.getElementById('report-filter-location')?.value || 'ALL';
  const congestion = document.getElementById('report-filter-congestion')?.value || 'ALL';

  let url = `${API_BASE}/reports/export?`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (location !== 'ALL') url += `&location=${encodeURIComponent(location)}`;
  if (congestion !== 'ALL') url += `&congestion=${encodeURIComponent(congestion)}`;

  const token = api.getToken();
  if (token) url += `&token=${encodeURIComponent(token)}`;

  // Download via direct link
  const a = document.createElement('a');
  a.href = url;
  a.download = `stms_traffic_report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Downloading CSV report...', 'info');
}

function printReport() {
  window.print();
}
