const test = require('node:test');
const assert = require('node:assert/strict');
const congestionService = require('../services/congestionService');

test('Congestion Classification Engine Test Suite', async (t) => {
  await t.test('should classify normal traffic (<20 vehicles, >40 km/h) as NORMAL', () => {
    const result = congestionService.classifyCongestion(15, 48);
    assert.strictEqual(result, 'NORMAL');
  });

  await t.test('should classify moderate traffic (20-39 vehicles or 25-40 km/h) as MODERATE', () => {
    const result1 = congestionService.classifyCongestion(28, 35);
    assert.strictEqual(result1, 'MODERATE');

    const result2 = congestionService.classifyCongestion(10, 30);
    assert.strictEqual(result2, 'MODERATE');
  });

  await t.test('should classify heavy traffic (40-59 vehicles or 15-25 km/h) as HEAVY', () => {
    const result1 = congestionService.classifyCongestion(45, 22);
    assert.strictEqual(result1, 'HEAVY');

    const result2 = congestionService.classifyCongestion(55, 30);
    assert.strictEqual(result2, 'HEAVY');
  });

  await t.test('should classify severe congestion (>=60 vehicles or <15 km/h) as SEVERE', () => {
    const result1 = congestionService.classifyCongestion(68, 12);
    assert.strictEqual(result1, 'SEVERE');

    const result2 = congestionService.classifyCongestion(85, 20);
    assert.strictEqual(result2, 'SEVERE');
  });

  await t.test('should classify stopped traffic / gridlock (speed == 0) as SEVERE', () => {
    const result = congestionService.classifyCongestion(12, 0);
    assert.strictEqual(result, 'SEVERE');
  });

  await t.test('should support dynamic threshold updates', () => {
    const original = congestionService.getThresholds();
    congestionService.updateThresholds({ normalMaxVehicles: 10 });
    
    // Now 15 vehicles should be MODERATE instead of NORMAL
    const result = congestionService.classifyCongestion(15, 45);
    assert.strictEqual(result, 'MODERATE');

    // Restore original
    congestionService.updateThresholds(original);
  });
});
