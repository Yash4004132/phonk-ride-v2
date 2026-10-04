(function (global) {
  function formatUsdt(value) {
    const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
    return `${amount.toFixed(2)} USDT`;
  }

  function calculatePayoutEstimate(credits, rate = 1) {
    const normalizedCredits = Math.max(0, Number(credits) || 0);
    const normalizedRate = Number(rate) || 1;
    const usdtValue = (normalizedCredits / 50) * normalizedRate;
    return formatUsdt(usdtValue);
  }

  const api = { calculatePayoutEstimate, formatUsdt };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.calculatePayoutEstimate = calculatePayoutEstimate;
  global.formatUsdt = formatUsdt;
})(typeof globalThis !== 'undefined' ? globalThis : this);
