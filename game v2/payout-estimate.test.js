const test = require('node:test');
const assert = require('node:assert/strict');

const { calculatePayoutEstimate } = require('./payout-estimate.js');

test('calculatePayoutEstimate returns the live USDT preview for entered credits', () => {
  assert.equal(calculatePayoutEstimate(10000), '200.00 USDT');
  assert.equal(calculatePayoutEstimate(25000), '500.00 USDT');
  assert.equal(calculatePayoutEstimate(0), '0.00 USDT');
});
