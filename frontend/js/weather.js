/**
 * STMS - Dynamic Weather & Environmental Impact Simulator
 * Models Chennai monsoon downpours, visibility fog, and highway collision incidents
 */

const weatherSimulator = {
  currentCondition: 'CLEAR',

  setCondition(cond) {
    this.currentCondition = cond;
    if (window.soundFx) window.soundFx.playClick();

    const descMap = {
      CLEAR: '☀️ Nominal Weather: Optimal road traction & dry pavement velocity.',
      MONSOON: '🌧️ Heavy Chennai Monsoon: Surface waterlogging. Highway speed reduced by 35%, stopping distance doubled.',
      FOG: '🌫️ Dense Smog / Coastal Fog: Visibility under 100m. Arterial speed advisory capped at 30 km/h.',
      ACCIDENT: '💥 Highway Collision: Multi-vehicle pileup reported. Emergency corridor dispatch recommended.'
    };

    showToast(descMap[cond] || `Weather updated to ${cond}`, cond === 'CLEAR' ? 'info' : 'warning', 4500);

    // Update active button state in UI
    document.querySelectorAll('.weather-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weather === cond);
    });

    // Apply immediate impact to traffic simulation
    this.applyWeatherToSimulation();
  },

  async applyWeatherToSimulation() {
    try {
      const trafficRes = await api.get('/traffic/latest/junctions');
      const junctions = trafficRes.data || [];

      for (const j of junctions) {
        let newCount = j.vehicleCount;
        let newSpeed = j.avgSpeed;

        if (this.currentCondition === 'MONSOON') {
          newSpeed = Math.max(12, Math.round(j.avgSpeed * 0.65));
          newCount = Math.round(j.vehicleCount * 1.3);
        } else if (this.currentCondition === 'FOG') {
          newSpeed = Math.min(28, j.avgSpeed);
        } else if (this.currentCondition === 'ACCIDENT') {
          if (j.location.includes('Guindy') || j.location.includes('Anna')) {
            newCount = Math.max(75, j.vehicleCount + 30);
            newSpeed = 8;
          }
        }

        // Send update
        await api.post('/traffic', {
          location: j.location,
          latitude: j.latitude,
          longitude: j.longitude,
          vehicleCount: newCount,
          avgSpeed: newSpeed,
          sensorId: j.sensorId,
          dataSource: 'SIMULATED'
        }).catch(() => null);
      }

      if (typeof loadDashboardData === 'function') loadDashboardData();
      if (typeof loadMapJunctions === 'function') loadMapJunctions();
    } catch {}
  }
};

window.weatherSimulator = weatherSimulator;

