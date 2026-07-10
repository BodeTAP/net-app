const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  getBillingPeriod,
  getDueDate
} = require('../src/services/billingService');

test('billing period and due date use local calendar values', () => {
  const date = new Date(2026, 6, 10, 1, 30, 0);

  assert.equal(getBillingPeriod(date), '202607');
  assert.equal(getDueDate(5, date), '2026-07-05');
  assert.equal(getDueDate(31, date), '2026-07-28');
});

test('invoice generation service has no MikroTik dependency or isolation call', () => {
  const servicePath = path.join(__dirname, '..', 'src', 'services', 'billingService.js');
  const source = fs.readFileSync(servicePath, 'utf8');

  assert.equal(source.includes("services/mikrotik"), false);
  assert.equal(source.includes('addToIsolir'), false);
  assert.equal(source.includes('removeFromIsolir'), false);
});
