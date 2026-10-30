const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { app } = require('../server');
const db = require('../config/db');
const seedModule = require('../scripts/seed');

let server;
let baseUrl;
let adminToken = '';
let officerToken = '';

test.before(async () => {
  // Connect DB and seed clean demo data
  await db.connectDB();
  await seedModule.seedAllData();

  // Start HTTP server on random ephemeral port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await db.disconnectDB();
});

test('STMS REST API Comprehensive Test Suite', async (t) => {
  // 1. Health Endpoint
  await t.test('GET /api/health should report system status and database state', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.system, 'Smart Traffic Management System (STMS)');
    assert.ok(body.database.connected);
  });

  // 2. Authentication Tests
  await t.test('POST /api/auth/login with valid admin credentials should return JWT and user profile', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@stms.gov.in', password: 'Password123!' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.role, 'admin');
    adminToken = body.token;
  });

  await t.test('POST /api/auth/login with officer credentials should authenticate', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@stms.gov.in', password: 'Password123!' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.user.role, 'officer');
    officerToken = body.token;
  });

  await t.test('POST /api/auth/login with invalid password should be rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@stms.gov.in', password: 'WrongPassword' })
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/auth/register should create a new account and return token', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Officer Kumar',
        email: 'kumar@stms.gov.in',
        password: 'Password123!',
        role: 'officer'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.token);
    assert.strictEqual(body.user.email, 'kumar@stms.gov.in');
  });

  await t.test('POST /api/auth/register with duplicate email should be rejected with 409', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Kumar',
        email: 'kumar@stms.gov.in',
        password: 'Password123!',
        role: 'officer'
      })
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  await t.test('POST /api/auth/register with short password should be rejected with 400', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Short Password User',
        email: 'short@stms.gov.in',
        password: '123',
        role: 'officer'
      })
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  // 3. RBAC Enforcement Tests
  await t.test('GET /api/users should forbid non-admin (officer) access with 403', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert.strictEqual(res.status, 403);
  });

  await t.test('GET /api/users should permit system admin access with 200', async () => {
    const res = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3);
  });

  // 4. Traffic Records & Validation
  let createdTrafficId = '';

  await t.test('POST /api/traffic should reject invalid input (negative count)', async () => {
    const res = await fetch(`${baseUrl}/traffic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        location: 'Test Location',
        latitude: 13.0,
        longitude: 80.0,
        vehicleCount: -5,
        avgSpeed: 40
      })
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('POST /api/traffic should create new measurement and classify congestion', async () => {
    const res = await fetch(`${baseUrl}/traffic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        location: 'Koyambedu Roundabout',
        latitude: 13.0694,
        longitude: 80.1948,
        vehicleCount: 65,
        avgSpeed: 10,
        sensorId: 'SEN-TEST-01'
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.congestion, 'SEVERE');
    createdTrafficId = body.data._id;
  });

  await t.test('GET /api/traffic should retrieve paginated records', async () => {
    const res = await fetch(`${baseUrl}/traffic?limit=5`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length > 0);
    assert.ok(body.pagination.total > 0);
  });

  // 5. Signal State Updates
  await t.test('GET /api/signals should list all simulated signals', async () => {
    const res = await fetch(`${baseUrl}/signals`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length > 0);
  });

  await t.test('PUT /api/signals/:id should update signal phase in manual mode', async () => {
    const signalsRes = await fetch(`${baseUrl}/signals`);
    const signals = (await signalsRes.json()).data;
    const targetSignal = signals[0];

    const updateRes = await fetch(`${baseUrl}/signals/${targetSignal._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'RED', mode: 'MANUAL', duration: 60 })
    });
    assert.strictEqual(updateRes.status, 200);
    const updated = (await updateRes.json()).data;
    assert.strictEqual(updated.status, 'RED');
    assert.strictEqual(updated.mode, 'MANUAL');
  });

  // 6. Emergency Priority Corridor Dispatch
  let emergencyId = '';
  await t.test('POST /api/emergency-requests should create a corridor request', async () => {
    const res = await fetch(`${baseUrl}/emergency-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        vehicleId: 'AMB-TEST-99',
        vehicleType: 'AMBULANCE',
        origin: 'Anna Salai Junction',
        destination: 'Guindy Kathipara Junction',
        affectedJunctions: ['Anna Salai Junction', 'Guindy Kathipara Junction']
      })
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'PENDING');
    assert.ok(body.data.recommendedPlan.includes('Green Corridor'));
    emergencyId = body.data._id;
  });

  await t.test('PUT /api/emergency-requests/:id should approve corridor and preempt signals', async () => {
    const res = await fetch(`${baseUrl}/emergency-requests/${emergencyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'APPROVED' })
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'APPROVED');
  });

  // 7. Alerts Workflow
  await t.test('GET /api/alerts and acknowledge/resolve alert', async () => {
    const res = await fetch(`${baseUrl}/alerts`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.length > 0);

    const alertId = body.data[0].alertId;
    const ackRes = await fetch(`${baseUrl}/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert.strictEqual(ackRes.status, 200);
    const ackBody = await ackRes.json();
    assert.strictEqual(ackBody.data.status, 'ACKNOWLEDGED');
  });

  // 8. Reports & CSV Export
  await t.test('GET /api/reports/summary should return aggregated analytics', async () => {
    const res = await fetch(`${baseUrl}/reports/summary`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.summary.totalRecordsAnalyzed > 0);
  });

  await t.test('GET /api/reports/export should stream valid CSV data', async () => {
    const res = await fetch(`${baseUrl}/reports/export`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const text = await res.text();
    assert.ok(text.includes('RecordID,Timestamp,Location'));
  });
});
