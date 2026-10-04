const BASE_BET = 10;
const BET_TIERS = {
  5: { stake: 5, speed: 1, reactionMs: 760, moves: 5 },
  10: { stake: 10, speed: 1.35, reactionMs: 620, moves: 10 },
  20: { stake: 20, speed: 1.75, reactionMs: 500, moves: 20 },
};
const MULTIPLIERS = [1, 1.5, 2, 3, 5];
const SIGNAL_DELAY_MS = 680;
const DRIFT_ANIM_MS = 620;
const RESULT_MS = 900;

const canvas = document.querySelector('#trackCanvas');
const ctx = canvas.getContext('2d');
const gameCard = document.querySelector('.game-card');
const buttons = [...document.querySelectorAll('.lane-button')];
const readyButton = document.querySelector('#readyButton');
const balanceValue = document.querySelector('#balanceValue');
const multiplierValue = document.querySelector('#multiplierValue');
const streakValue = document.querySelector('#streakValue');
const streakMeter = document.querySelector('#streakMeter');
const promptKicker = document.querySelector('#promptKicker');
const promptTitle = document.querySelector('#promptTitle');
const timerReadout = document.querySelector('#timerReadout');
const moveCounter = document.querySelector('#moveCounter');
const resultStamp = document.querySelector('#resultStamp');
const statusText = document.querySelector('#statusText');
const runNumber = document.querySelector('#runNumber');
const soundToggle = document.querySelector('#soundToggle');
const resetButton = document.querySelector('#resetButton');
const betButtons = [...document.querySelectorAll('.bet-button')];
const betHint = document.querySelector('#betHint');
const gameView = document.querySelector('#gameView');
const paymentChoicePage = document.querySelector('#paymentChoicePage');
const paymentPage = document.querySelector('#paymentPage');
const withdrawPage = document.querySelector('#withdrawPage');
const profilePage = document.querySelector('#profilePage');
const openPaymentButton = document.querySelector('#openPaymentButton');
const openWithdrawButton = document.querySelector('#openWithdrawButton');
const backToRide = document.querySelector('#backToRide');
const backToRideFromChoice = document.querySelector('#backToRideFromChoice');
const backToRideFromWithdraw = document.querySelector('#backToRideFromWithdraw');
const openProfileButton = document.querySelector('#openProfileButton');
const backToRideFromProfile = document.querySelector('#backToRideFromProfile');
const profileAddCreditsButton = document.querySelector('#profileAddCreditsButton');
const profileWithdrawButton = document.querySelector('#profileWithdrawButton');
const profileNameInput = document.querySelector('#profileNameInput');
const saveProfileButton = document.querySelector('#saveProfileButton');
const profileSaveStatus = document.querySelector('#profileSaveStatus');
const profileNameDisplay = document.querySelector('#profileNameDisplay');
const profilePhoneDisplay = document.querySelector('#profilePhoneDisplay');
const profilePhoneInput = document.querySelector('#profilePhoneInput');
const profileAvatar = document.querySelector('#profileAvatar');
const profileStatus = document.querySelector('#profileStatus');
const profileBalanceValue = document.querySelector('#profileBalanceValue');
const profileRunsValue = document.querySelector('#profileRunsValue');
const profileWinsValue = document.querySelector('#profileWinsValue');
const profileStreakValue = document.querySelector('#profileStreakValue');
const profileTierLabel = document.querySelector('#profileTierLabel');
const profileRiskValue = document.querySelector('#profileRiskValue');
const profileSpeedValue = document.querySelector('#profileSpeedValue');
const profileMovesValue = document.querySelector('#profileMovesValue');
const profileWinRate = document.querySelector('#profileWinRate');
const profileMiniAvatar = document.querySelector('.profile-mini-avatar');
const profileRiderId = document.querySelector('#profileRiderId');
const logoutButton = document.querySelector('#logoutButton');
const authPage = document.querySelector('#authPage');
const authForm = document.querySelector('#authForm');
const signInModeButton = document.querySelector('#signInModeButton');
const registerModeButton = document.querySelector('#registerModeButton');
const authNameField = document.querySelector('#authNameField');
const authPhoneField = document.querySelector('#authPhoneField');
const authRiderIdInput = document.querySelector('#authRiderIdInput');
const authNameInput = document.querySelector('#authNameInput');
const authPhoneInput = document.querySelector('#authPhoneInput');
const authPasswordInput = document.querySelector('#authPasswordInput');
const authSubmitButton = document.querySelector('#authSubmitButton');
const authStatus = document.querySelector('#authStatus');
const paymentBalanceValue = document.querySelector('#paymentBalanceValue');
const paymentChoiceIndianButton = document.querySelector('#paymentChoiceIndianButton');
const paymentChoiceForeignButton = document.querySelector('#paymentChoiceForeignButton');
const creditPacks = [...document.querySelectorAll('.credit-pack')];
const indianPaymentButton = document.querySelector('#indianPaymentButton');
const foreignPaymentButton = document.querySelector('#foreignPaymentButton');
const indianPaymentPanel = document.querySelector('#indianPaymentPanel');
const foreignPaymentPanel = document.querySelector('#foreignPaymentPanel');
const priceModeLabel = document.querySelector('#priceModeLabel');
const rateStatus = document.querySelector('#rateStatus');
const summaryCredits = document.querySelector('#summaryCredits');
const summaryPrice = document.querySelector('#summaryPrice');
const payButton = document.querySelector('#payButton');
const paymentStatus = document.querySelector('#paymentStatus');
const withdrawBalanceValue = document.querySelector('#withdrawBalanceValue');
const withdrawAmountInput = document.querySelector('#withdrawAmountInput');
const withdrawUpiInput = document.querySelector('#withdrawUpiInput');
const withdrawWalletInput = document.querySelector('#withdrawWalletInput');
const withdrawSummaryCredits = document.querySelector('#withdrawSummaryCredits');
const withdrawEstimatedValue = document.querySelector('#withdrawEstimatedValue');
const withdrawSubmitButton = document.querySelector('#withdrawSubmitButton');
const withdrawStatus = document.querySelector('#withdrawStatus');
const indianPayoutButton = document.querySelector('#indianPayoutButton');
const foreignPayoutButton = document.querySelector('#foreignPayoutButton');
const indianPayoutField = document.querySelector('#indianPayoutField');
const foreignPayoutField = document.querySelector('#foreignPayoutField');
const walletAddress = document.querySelector('#walletAddress');
const copyWalletButton = document.querySelector('#copyWalletButton');
const scanQrButton = document.querySelector('#scanQrButton');
const qrFileInput = document.querySelector('#qrFileInput');
const scanStatus = document.querySelector('#scanStatus');
const utrInput = document.querySelector('#utrInput');

const state = {
  phase: 'ready',
  running: false,
  balance: 200,
  streak: 0,
  runs: 0,
  betTier: 5,
  moveCount: 0,
  carLane: null,
  shiftFrom: null,
  shiftTo: null,
  pendingWin: false,
  selectedLane: null,
  signalLane: null,
  signalShownAt: 0,
  signalDeadline: 0,
  outcome: null,
  wins: 0,
  losses: 0,
  bestStreak: 0,
  riderName: 'NIGHT RIDER',
  phone: '',
  riderId: null,
  startedAt: performance.now(),
  phaseStartedAt: performance.now(),
  soundOn: true,
  paymentMethod: 'indian',
  withdrawMethod: 'indian',
};

try {
  const storedProfileName = localStorage.getItem('phonkRideProfileName');
  const storedProfilePhone = localStorage.getItem('phonkRideProfilePhone');
  if (storedProfileName && !/^\+?[0-9\s().-]{7,20}$/.test(storedProfileName)) state.riderName = storedProfileName;
  state.phone = storedProfilePhone || (storedProfileName && /^\+?[0-9\s().-]{7,20}$/.test(storedProfileName) ? storedProfileName : '');
  state.riderId = localStorage.getItem('phonkRideProfileId') || null;
} catch { /* Profile still works when storage is unavailable. */ }

let audioContext;
let beatTimer;
let beatStep = 0;
let currencyMode = 'INR';
let usdtUsdRate = 1;
let selectedPack = { packId: 'basic', credits: 200, inrCredits: 200, usdCredits: 250, inr: 200, usd: 5 };
let activeOrder = null;
let orderRequestId = 0;
let profileSyncRequestId = 0;
let authMode = 'login';

function getBetConfig() { return BET_TIERS[state.betTier]; }

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function ensureAudio() {
  if (!state.soundOn) return false;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return false;
  try {
    audioContext ||= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
    return true;
  } catch {
    state.soundOn = false;
    soundToggle.setAttribute('aria-pressed', 'false');
    soundToggle.setAttribute('aria-label', 'Turn sound on');
    return false;
  }
}

function tone(frequency, duration = 0.08, type = 'sine', volume = 0.03, delay = 0) {
  if (!state.soundOn) return;
  if (!ensureAudio()) return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function noiseBurst(duration = 0.05, volume = 0.012, delay = 0) {
  if (!state.soundOn || !ensureAudio()) return;
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime + delay;
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  source.connect(gain).connect(audioContext.destination);
  source.start(now);
}

function phonkTick(step) {
  const accent = step % 4;
  if (accent === 0 || step === 5) {
    tone(58, 0.16, 'sine', 0.052);
    tone(112, 0.06, 'triangle', 0.016);
  }
  if (step === 0 || step === 3 || step === 6) tone(step === 6 ? 72 : 62, 0.22, 'sawtooth', 0.022);
  if (step === 2 || step === 6) {
    tone(760, 0.07, 'square', 0.018);
    tone(1120, 0.06, 'square', 0.012, 0.055);
  }
  if (step % 2 === 1) noiseBurst(0.045, 0.009);
}

function startBeat() {
  clearInterval(beatTimer);
  if (!state.soundOn) return;
  if (!ensureAudio()) return;
  beatStep = 0;
  phonkTick(beatStep);
  beatTimer = setInterval(() => {
    beatStep = (beatStep + 1) % 8;
    phonkTick(beatStep);
  }, 250);
}

function formatCredits(value) { return Math.max(0, Math.round(value)).toLocaleString('en-US'); }
function formatUsd(value) { return Number(value).toFixed(2); }
function normalizeSolanaWallet(value) {
  const wallet = String(value || '').trim();
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet) ? wallet : null;
}
function normalizeUpiId(value) {
  const upi = String(value || '').trim();
  return /^[A-Za-z0-9._-]{3,50}@[A-Za-z0-9.-]{2,32}$/.test(upi) ? upi : null;
}

function setWithdrawMethod(method) {
  const payoutMethod = method === 'foreign' ? 'foreign' : 'indian';
  state.withdrawMethod = payoutMethod;
  indianPayoutButton.classList.toggle('is-selected', payoutMethod === 'indian');
  foreignPayoutButton.classList.toggle('is-selected', payoutMethod === 'foreign');
  indianPayoutButton.setAttribute('aria-pressed', String(payoutMethod === 'indian'));
  foreignPayoutButton.setAttribute('aria-pressed', String(payoutMethod === 'foreign'));
  indianPayoutField.hidden = payoutMethod !== 'indian';
  foreignPayoutField.hidden = payoutMethod !== 'foreign';
  if (payoutMethod === 'indian') {
    withdrawUpiInput.focus();
  } else {
    withdrawWalletInput.focus();
  }
}

function getAvatarLetters(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'NR';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function rememberProfile(profile) {
  if (!profile) return;
  state.riderId = profile.profileId || state.riderId;
  const savedName = profile.name || profile.callsign || state.riderName;
  state.riderName = /^\+?[0-9\s().-]{7,20}$/.test(savedName) ? 'NIGHT RIDER' : savedName;
  state.phone = profile.phone || state.phone;
  state.balance = Number.isFinite(Number(profile.balance)) ? Math.max(0, Number(profile.balance)) : 200;
  state.streak = Number.isFinite(Number(profile.streak)) ? Number(profile.streak) : state.streak;
  state.runs = Number.isFinite(Number(profile.runs)) ? Number(profile.runs) : state.runs;
  state.wins = Number.isFinite(Number(profile.wins)) ? Number(profile.wins) : state.wins;
  state.losses = Number.isFinite(Number(profile.losses)) ? Number(profile.losses) : state.losses;
  state.bestStreak = Number.isFinite(Number(profile.bestStreak)) ? Number(profile.bestStreak) : state.bestStreak;
  profileRiderId.textContent = `RIDER ID // ${profile.riderId || state.riderId || 'OFFLINE'}`;
  profilePhoneDisplay.textContent = `PHONE // ${state.phone || 'NOT SET'}`;
  try {
    localStorage.setItem('phonkRideProfileId', state.riderId);
    localStorage.setItem('phonkRideProfileName', state.riderName);
    localStorage.setItem('phonkRideProfilePhone', state.phone);
  } catch { /* Keep the server profile in memory when storage is unavailable. */ }
}

function openAuthenticatedGame(profile) {
  rememberProfile(profile);
  authPage.hidden = true;
  gameView.hidden = false;
  paymentPage.hidden = true;
  withdrawPage.hidden = true;
  profilePage.hidden = true;
  state.phase = 'ready';
  state.running = false;
  state.moveCount = 0;
  state.carLane = null;
  state.signalLane = null;
  state.outcome = null;
  setReadyUi();
  resizeCanvas();
  updateHud();
}

function showAuthPage(message = 'ACCOUNT REQUIRED // YOUR DATA WILL BE RESTORED ON LOGIN', isError = false) {
  clearInterval(beatTimer);
  authPage.hidden = false;
  gameView.hidden = true;
  paymentPage.hidden = true;
  withdrawPage.hidden = true;
  profilePage.hidden = true;
  authStatus.textContent = message;
  authStatus.classList.toggle('is-error', isError);
  authStatus.classList.remove('is-success');
}

async function restoreLogin() {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'login required');
    openAuthenticatedGame(payload.profile);
  } catch {
    showAuthPage('LOGIN REQUIRED // SIGN IN TO RESTORE YOUR PROFILE');
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === 'register';
  signInModeButton.classList.toggle('is-selected', !isRegister);
  registerModeButton.classList.toggle('is-selected', isRegister);
  signInModeButton.setAttribute('aria-pressed', String(!isRegister));
  registerModeButton.setAttribute('aria-pressed', String(isRegister));
  authNameField.hidden = !isRegister;
  authPhoneField.hidden = !isRegister;
  authNameInput.required = isRegister;
  authPhoneInput.required = isRegister;
  authPasswordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
  authSubmitButton.innerHTML = isRegister ? 'CREATE RIDER ID <span aria-hidden="true">↗</span>' : 'SIGN IN <span aria-hidden="true">↗</span>';
  authStatus.textContent = isRegister ? 'CREATE ID // NAME AND PHONE WILL FOLLOW THIS LOGIN' : 'ACCOUNT REQUIRED // YOUR DATA WILL BE RESTORED ON LOGIN';
  authStatus.classList.remove('is-error', 'is-success');
}

async function submitAuth() {
  const riderId = authRiderIdInput.value.trim().toLowerCase();
  const password = authPasswordInput.value;
  const name = authNameInput.value.trim();
  const phone = authPhoneInput.value.trim();
  if (!riderId || !password || (authMode === 'register' && (!name || !phone))) {
    authStatus.textContent = 'RIDER ID, NAME, PHONE NO. AND ACCESS CODE REQUIRED';
    authStatus.classList.add('is-error');
    return;
  }
  authSubmitButton.disabled = true;
  authStatus.textContent = authMode === 'register' ? 'CREATING RIDER ID // PLEASE WAIT' : 'CHECKING RIDER ID // PLEASE WAIT';
  authStatus.classList.remove('is-error', 'is-success');
  try {
    const response = await fetch(`/api/auth/${authMode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderId, password, name, phone, profileId: state.riderId }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'account service unavailable');
    authPasswordInput.value = '';
    authStatus.textContent = 'LOGIN ACTIVE // PROFILE RESTORED';
    authStatus.classList.add('is-success');
    openAuthenticatedGame(payload.profile);
  } catch (error) {
    authStatus.textContent = error.message || 'ACCOUNT SERVICE OFFLINE // TRY AGAIN';
    authStatus.classList.add('is-error');
  } finally {
    authSubmitButton.disabled = false;
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.running = false;
  state.riderId = null;
  try {
    localStorage.removeItem('phonkRideProfileId');
    localStorage.removeItem('phonkRideProfileName');
    localStorage.removeItem('phonkRideProfilePhone');
  } catch { /* The server session is still cleared when storage is unavailable. */ }
  showAuthPage('SIGNED OUT // SIGN IN TO RESTORE YOUR PROFILE');
  authRiderIdInput.value = '';
  authPasswordInput.value = '';
  authNameInput.value = '';
  setAuthMode('login');
  authRiderIdInput.focus();
}

function syncProfile() {
  if (!state.riderId) return;
  const requestId = ++profileSyncRequestId;
  fetch(`/api/profile/${encodeURIComponent(state.riderId)}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      streak: state.streak,
      runs: state.runs,
      wins: state.wins,
      losses: state.losses,
      bestStreak: state.bestStreak,
    }),
  }).then(() => {
    if (requestId === profileSyncRequestId) updateProfile();
  }).catch(() => {});
}

function updateProfile() {
  const config = getBetConfig();
  const completedRuns = state.wins + state.losses;
  const winRate = completedRuns ? Math.round((state.wins / completedRuns) * 100) : 0;
  const name = state.riderName || 'NIGHT RIDER';
  profileNameDisplay.textContent = name;
  profilePhoneDisplay.textContent = `PHONE // ${state.phone || 'NOT SET'}`;
  profileAvatar.textContent = getAvatarLetters(name);
  profileMiniAvatar.textContent = getAvatarLetters(name);
  profileBalanceValue.textContent = formatCredits(state.balance);
  profileRunsValue.textContent = String(state.runs).padStart(3, '0');
  profileWinsValue.textContent = String(state.wins).padStart(3, '0');
  profileStreakValue.textContent = String(state.bestStreak).padStart(2, '0');
  profileTierLabel.textContent = `${state.betTier}X TIER`;
  profileRiskValue.textContent = `${state.betTier}X`;
  profileSpeedValue.textContent = `${config.speed.toFixed(1)}X`;
  profileMovesValue.textContent = `${config.moves} MOVES`;
  profileWinRate.textContent = `WIN RATE // ${winRate}%`;
  profileStatus.textContent = state.running ? `ONLINE // RUN ${String(state.runs).padStart(3, '0')} IN PROGRESS` : 'ONLINE // READY FOR THE NEXT RUN';
  if (document.activeElement !== profileNameInput) profileNameInput.value = name;
  if (document.activeElement !== profilePhoneInput) profilePhoneInput.value = state.phone;
}

function setPaymentMethod(method) {
  const payoutMethod = method === 'foreign' ? 'foreign' : 'indian';
  state.paymentMethod = payoutMethod;
  currencyMode = payoutMethod === 'indian' ? 'INR' : 'USD';

  if (indianPaymentButton && foreignPaymentButton) {
    indianPaymentButton.classList.toggle('is-selected', payoutMethod === 'indian');
    foreignPaymentButton.classList.toggle('is-selected', payoutMethod === 'foreign');
    indianPaymentButton.setAttribute('aria-pressed', String(payoutMethod === 'indian'));
    foreignPaymentButton.setAttribute('aria-pressed', String(payoutMethod === 'foreign'));
  }

  indianPaymentPanel.hidden = payoutMethod !== 'indian';
  foreignPaymentPanel.hidden = payoutMethod !== 'foreign';
  updatePaymentSummary();
  if (currencyMode === 'USD') refreshUsdtRate();
  createPaymentOrder();
}

function updatePaymentSummary() {
  selectedPack.credits = currencyMode === 'USD' ? selectedPack.usdCredits : selectedPack.inrCredits;
  paymentBalanceValue.textContent = formatCredits(state.balance);
  const quotedUsdt = activeOrder?.credits === selectedPack.credits
    ? activeOrder.usdtAmount
    : selectedPack.usd / usdtUsdRate;
  const selectedPrice = currencyMode === 'USD'
    ? `${formatUsd(quotedUsdt)} USDT`
    : `INR ${selectedPack.inr}`;
  summaryCredits.textContent = `${formatCredits(selectedPack.credits)} CREDITS`;
  summaryPrice.textContent = selectedPrice;
  priceModeLabel.textContent = currencyMode === 'USD' ? 'FOREIGN // USDT' : 'INDIAN // INR';
  rateStatus.textContent = currencyMode === 'USD'
    ? `LIVE USDT // 1 USD = ${formatUsd(usdtUsdRate)} USDT`
    : `LOCAL PRICE // PAY ${formatUsd(quotedUsdt)} USDT`;
  creditPacks.forEach((button) => {
    const credits = currencyMode === 'USD' ? button.dataset.usdCredits : button.dataset.inrCredits;
    const price = currencyMode === 'USD' ? `$${formatUsd(button.dataset.usd)}` : `INR ${button.dataset.inr}`;
    button.querySelector('.pack-credits').textContent = formatCredits(credits);
    button.querySelector('.pack-price').textContent = price;
  });
}

async function createPaymentOrder() {
  const requestId = ++orderRequestId;
  activeOrder = null;
  payButton.disabled = true;
  paymentStatus.textContent = 'CREATING USDT QUOTE // PLEASE WAIT';
  try {
    const response = await fetch('/api/payment/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: selectedPack.packId, currency: currencyMode, profileId: state.riderId }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.message || 'payment service unavailable');
    if (requestId !== orderRequestId) return;
    activeOrder = payload;
    usdtUsdRate = payload.rate;
    payButton.disabled = false;
    paymentStatus.textContent = 'VERIFY THE WALLET BEFORE SENDING';
    updatePaymentSummary();
  } catch {
    if (requestId !== orderRequestId) return;
    paymentStatus.textContent = 'PAYMENT SERVICE OFFLINE // TRY AGAIN LATER';
    updatePaymentSummary();
  }
}

async function refreshUsdtRate() {
  rateStatus.textContent = 'LIVE RATE // SYNCING';
  let rateUnavailable = false;
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd', { cache: 'no-store' });
    if (!response.ok) throw new Error('rate request failed');
    const payload = await response.json();
    const liveRate = Number(payload?.tether?.usd);
    if (!Number.isFinite(liveRate) || liveRate <= 0) throw new Error('invalid rate');
    usdtUsdRate = liveRate;
  } catch {
    usdtUsdRate = 1;
    rateUnavailable = true;
  }
  updatePaymentSummary();
  if (rateUnavailable) rateStatus.textContent = 'LIVE RATE UNAVAILABLE // 1 USD ~ 1 USDT';
}

function openPaymentPage() {
  if (!state.riderId) {
    showAuthPage('LOGIN REQUIRED // SIGN IN TO ADD CREDITS');
    return;
  }
  gameView.hidden = true;
  withdrawPage.hidden = true;
  profilePage.hidden = true;
  paymentChoicePage.hidden = false;
  paymentPage.hidden = true;
}

function openSelectedPaymentPage(method) {
  paymentChoicePage.hidden = true;
  paymentPage.hidden = false;
  setPaymentMethod(method);
  paymentStatus.textContent = 'VERIFY THE WALLET BEFORE SENDING';
  paymentStatus.classList.remove('is-success');
  payButton.innerHTML = 'I HAVE SENT THE PAYMENT <span aria-hidden="true">↗</span>';
  updatePaymentSummary();
}

function closePaymentPage() {
  paymentChoicePage.hidden = true;
  paymentPage.hidden = true;
  gameView.hidden = false;
}

function updateWithdrawSummary() {
  const amount = Math.max(0, Math.floor(Number(withdrawAmountInput.value) || 0));
  withdrawSummaryCredits.textContent = `${formatCredits(amount)} CREDITS`;
  withdrawEstimatedValue.textContent = calculatePayoutEstimate(amount);
  withdrawBalanceValue.textContent = formatCredits(state.balance);
}

function openWithdrawPage() {
  if (!state.riderId) {
    showAuthPage('LOGIN REQUIRED // SIGN IN TO WITHDRAW CREDITS');
    return;
  }
  gameView.hidden = true;
  paymentPage.hidden = true;
  profilePage.hidden = true;
  withdrawPage.hidden = false;
  withdrawAmountInput.value = '';
  withdrawUpiInput.value = '';
  withdrawWalletInput.value = '';
  setWithdrawMethod('indian');
  withdrawSubmitButton.disabled = false;
  withdrawStatus.textContent = 'REQUEST // MANUAL REVIEW // NO AUTO TRANSFER';
  withdrawStatus.classList.remove('is-success');
  updateWithdrawSummary();
  withdrawAmountInput.focus();
}

function closeWithdrawPage() {
  withdrawPage.hidden = true;
  gameView.hidden = false;
}

function submitWithdrawalRequest() {
  const credits = Math.floor(Number(withdrawAmountInput.value));
  const payoutMethod = state.withdrawMethod === 'foreign' ? 'foreign' : 'indian';
  const rawWallet = payoutMethod === 'foreign' ? withdrawWalletInput.value.trim() : withdrawUpiInput.value.trim();
  const wallet = payoutMethod === 'foreign' ? normalizeSolanaWallet(rawWallet) : normalizeUpiId(rawWallet);
  if (!Number.isInteger(credits) || credits < 10000) {
    withdrawStatus.textContent = 'MINIMUM WITHDRAWAL // 10,000 CREDITS';
    withdrawStatus.classList.remove('is-success');
    withdrawAmountInput.focus();
    return;
  }
  if (credits > state.balance) {
    withdrawStatus.textContent = 'INSUFFICIENT CREDITS // CHECK YOUR BALANCE';
    withdrawStatus.classList.remove('is-success');
    withdrawAmountInput.focus();
    return;
  }
  if (!wallet) {
    withdrawStatus.textContent = payoutMethod === 'foreign' ? 'ENTER A VALID SOLANA WALLET' : 'ENTER A VALID UPI ID';
    withdrawStatus.classList.remove('is-success');
    if (payoutMethod === 'foreign') withdrawWalletInput.focus();
    else withdrawUpiInput.focus();
    return;
  }
  withdrawSubmitButton.disabled = true;
  withdrawSubmitButton.innerHTML = 'SUBMITTING REQUEST <span aria-hidden="true">…</span>';
  withdrawStatus.textContent = 'SENDING REQUEST // PLEASE WAIT';
  fetch('/api/withdrawal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId: state.riderId, credits, wallet, payoutMethod }),
  })
    .then(async (response) => ({ response, payload: await response.json() }))
    .then(({ response, payload }) => {
      if (response.ok && payload.ok) {
        state.balance = Number(payload.balance);
        updateHud();
        withdrawAmountInput.value = '';
        updateWithdrawSummary();
        withdrawStatus.textContent = `REQUEST ${payload.requestId.slice(0, 8).toUpperCase()} // PENDING REVIEW`;
        withdrawStatus.classList.add('is-success');
        withdrawSubmitButton.innerHTML = 'REQUEST RECEIVED <span aria-hidden="true">✓</span>';
        return;
      }
      withdrawSubmitButton.disabled = false;
      withdrawSubmitButton.innerHTML = 'REQUEST WITHDRAWAL <span aria-hidden="true">↗</span>';
      withdrawStatus.textContent = payload.message || 'WITHDRAWAL REQUEST FAILED';
      withdrawStatus.classList.remove('is-success');
    })
    .catch(() => {
      withdrawSubmitButton.disabled = false;
      withdrawSubmitButton.innerHTML = 'REQUEST WITHDRAWAL <span aria-hidden="true">↗</span>';
      withdrawStatus.textContent = 'WITHDRAWAL SERVICE OFFLINE // TRY AGAIN LATER';
      withdrawStatus.classList.remove('is-success');
    });
}

function openProfilePage() {
  if (!state.riderId) {
    showAuthPage();
    return;
  }
  gameView.hidden = true;
  paymentPage.hidden = true;
  withdrawPage.hidden = true;
  profilePage.hidden = false;
  updateProfile();
  profileNameInput.focus();
}

function closeProfilePage() {
  profilePage.hidden = true;
  gameView.hidden = false;
}

function saveProfileName() {
  const name = profileNameInput.value.trim().replace(/\s+/g, ' ').slice(0, 18).toUpperCase();
  const phone = profilePhoneInput.value.trim().replace(/[^0-9+]/g, '');
  if (name.length < 2) {
    profileSaveStatus.textContent = 'RIDER NAME REQUIRED';
    return;
  }
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone)) {
    profileSaveStatus.textContent = 'VALID PHONE NO. REQUIRED';
    return;
  }
  state.riderName = name;
  state.phone = phone;
  profileNameInput.value = name;
  profilePhoneInput.value = phone;
  try {
    localStorage.setItem('phonkRideProfileName', name);
    localStorage.setItem('phonkRideProfilePhone', phone);
  } catch { /* Keep the server profile in memory when storage is unavailable. */ }
  if (state.riderId) {
    fetch(`/api/profile/${encodeURIComponent(state.riderId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    }).then(async (response) => {
      const payload = await response.json();
      if (response.ok && payload.ok) rememberProfile(payload.profile);
    }).catch(() => {});
  }
  profileSaveStatus.textContent = 'PROFILE SAVED // READY';
  updateProfile();
  tone(520, 0.08, 'square', 0.018);
  window.setTimeout(() => { profileSaveStatus.textContent = 'LOCAL PROFILE // READY'; }, 1800);
}

function selectPack(packButton) {
  selectedPack = {
    packId: packButton.dataset.pack,
    credits: currencyMode === 'USD' ? Number(packButton.dataset.usdCredits) : Number(packButton.dataset.inrCredits),
    inrCredits: Number(packButton.dataset.inrCredits),
    usdCredits: Number(packButton.dataset.usdCredits),
    inr: Number(packButton.dataset.inr),
    usd: Number(packButton.dataset.usd),
  };
  creditPacks.forEach((button) => {
    const active = button === packButton;
    button.classList.toggle('is-selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  paymentStatus.textContent = 'VERIFY THE WALLET BEFORE SENDING';
  paymentStatus.classList.remove('is-success');
  payButton.innerHTML = 'I HAVE SENT THE PAYMENT <span aria-hidden="true">↗</span>';
  updatePaymentSummary();
  createPaymentOrder();
}

async function copyWalletAddress() {
  try {
    await navigator.clipboard.writeText(walletAddress.textContent);
    copyWalletButton.textContent = 'COPIED';
    scanStatus.textContent = 'WALLET COPIED // VERIFY BEFORE SENDING';
  } catch {
    copyWalletButton.textContent = 'SELECT';
    scanStatus.textContent = 'COPY BLOCKED // SELECT THE ADDRESS MANUALLY';
  }
  window.setTimeout(() => { copyWalletButton.textContent = 'COPY'; }, 1600);
}

async function scanQrImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  scanStatus.textContent = 'READING QR IMAGE // HOLD ON';
  if (!('BarcodeDetector' in window)) {
    scanStatus.textContent = 'QR IMAGE LOADED // VERIFY THE WALLET MANUALLY';
    return;
  }
  try {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const results = await detector.detect(await createImageBitmap(file));
    scanStatus.textContent = results[0]?.rawValue ? 'QR READ // VERIFY THE DESTINATION' : 'NO QR FOUND // TRY AGAIN';
  } catch {
    scanStatus.textContent = 'QR SCAN FAILED // VERIFY THE WALLET MANUALLY';
  }
}

function completePayment() {
  const utr = utrInput.value.trim();
  if (!utr) {
    paymentStatus.textContent = 'UTR REFERENCE ID REQUIRED // ENTER IT ABOVE';
    paymentStatus.classList.remove('is-success');
    utrInput.focus();
    return;
  }
  if (!activeOrder) {
    paymentStatus.textContent = 'PAYMENT ORDER NOT READY // TRY AGAIN';
    paymentStatus.classList.remove('is-success');
    return;
  }
  if (activeOrder.verified) return;
  payButton.disabled = true;
  payButton.innerHTML = 'VERIFYING PAYMENT <span aria-hidden="true">…</span>';
  paymentStatus.textContent = `CHECKING TX // ${utr.slice(0, 4)}...${utr.slice(-4)}`;
  fetch('/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: activeOrder.orderId, signature: utr }),
  })
    .then(async (response) => ({ response, payload: await response.json() }))
    .then(({ response, payload }) => {
      if (payload.ok && payload.verified) {
        activeOrder.verified = true;
        state.balance = Number.isFinite(Number(payload.balance)) ? Number(payload.balance) : state.balance + payload.credits;
        updateHud();
        updatePaymentSummary();
        payButton.innerHTML = 'CREDITS ADDED <span aria-hidden="true">✓</span>';
        paymentStatus.textContent = `PAYMENT VERIFIED // +${formatCredits(payload.credits)} CREDITS`;
        paymentStatus.classList.add('is-success');
        syncProfile();
        return;
      }
      payButton.disabled = false;
      payButton.innerHTML = 'I HAVE SENT THE PAYMENT <span aria-hidden="true">↗</span>';
      paymentStatus.textContent = payload.message || (response.status === 202 ? 'TX NOT FINALIZED YET' : 'PAYMENT NOT VERIFIED');
      paymentStatus.classList.remove('is-success');
    })
    .catch(() => {
      payButton.disabled = false;
      payButton.innerHTML = 'I HAVE SENT THE PAYMENT <span aria-hidden="true">↗</span>';
      paymentStatus.textContent = 'PAYMENT SERVICE OFFLINE // TRY AGAIN LATER';
      paymentStatus.classList.remove('is-success');
    });
}

function updateHud() {
  balanceValue.textContent = formatCredits(state.balance);
  const streakMultiplier = MULTIPLIERS[Math.min(state.streak, MULTIPLIERS.length - 1)];
  multiplierValue.textContent = `x${(streakMultiplier * state.betTier).toFixed(1)}`;
  streakValue.textContent = String(state.streak).padStart(2, '0');
  streakMeter.style.width = `${Math.min(state.streak / 5, 1) * 100}%`;
  const displayedRun = state.phase === 'ready' ? state.runs + 1 : Math.max(1, state.runs);
  runNumber.textContent = `RUN ${String(displayedRun).padStart(3, '0')}`;
  const config = getBetConfig();
  betHint.textContent = `BET ${state.betTier}X // ${config.stake * BASE_BET} CREDITS // SPEED ${config.speed.toFixed(1)}X // ${config.moves} MOVES`;
  if (state.phase === 'ready') moveCounter.textContent = `${config.moves} MOVES TO WIN`;
  else if (state.phase === 'result') moveCounter.textContent = state.outcome ? `${config.moves} MOVES // COMPLETE` : `MOVE ${state.moveCount} / ${config.moves}`;
  else moveCounter.textContent = `MOVE ${state.moveCount} / ${config.moves}`;
  const canPlay = state.balance > 0;
  readyButton.disabled = !canPlay || state.phase !== 'ready';
  readyButton.textContent = canPlay ? 'READY' : 'NO CREDITS';
  betButtons.forEach((button) => {
    const tier = Number(button.dataset.bet);
    const active = tier === state.betTier;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !['ready', 'arming'].includes(state.phase) || state.moveCount > 0 || state.balance < BET_TIERS[tier].stake * BASE_BET || !canPlay;
  });
  updateProfile();
  updatePaymentSummary();
}

function setButtonsDisabled(disabled) {
  buttons.forEach((button) => { button.disabled = disabled; });
}

function selectBetTier(tier) {
  if (!BET_TIERS[tier] || !['ready', 'arming'].includes(state.phase) || state.moveCount > 0) return;
  if (state.balance < BET_TIERS[tier].stake * BASE_BET) return;
  state.betTier = tier;
  updateHud();
  tone(260 + tier * 18, 0.07, 'square', 0.016);
}

function setReadyUi() {
  promptKicker.textContent = 'PRESS TO START THE RIDE';
  promptTitle.innerHTML = 'START THE<br /><em>RACE</em>';
  timerReadout.textContent = 'READY';
  statusText.textContent = state.balance <= 0 ? 'INSUFFICIENT CREDITS // TOP UP TO PLAY' : 'SYSTEM READY';
  state.signalLane = null;
  buttons.forEach((button) => button.classList.remove('signal-hot'));
  readyButton.disabled = state.balance <= 0;
  readyButton.textContent = state.balance <= 0 ? 'NO CREDITS' : 'READY';
  setButtonsDisabled(state.balance <= 0);
}

function armNextSignal() {
  state.phase = 'arming';
  state.phaseStartedAt = performance.now();
  state.selectedLane = null;
  state.signalLane = null;
  state.outcome = null;
  state.shiftFrom = state.carLane;
  state.shiftTo = null;
  buttons.forEach((button) => button.classList.remove('signal-hot', 'selected'));
  setButtonsDisabled(false);
  promptKicker.textContent = 'CONTINUOUS RACE';
  promptTitle.innerHTML = 'WATCH FOR<br /><em>THE FLASH</em>';
  statusText.textContent = 'TRACK LIVE // SIGNAL INCOMING';
  timerReadout.textContent = `SYNC ${(SIGNAL_DELAY_MS / getBetConfig().speed / 1000).toFixed(1)}`;
  readyButton.disabled = true;
  readyButton.textContent = 'LIVE';
  updateHud();
}

function showSignal() {
  if (state.phase !== 'arming') return;
  state.phase = 'signal';
  state.phaseStartedAt = performance.now();
  state.signalShownAt = state.phaseStartedAt;
  state.signalDeadline = state.signalShownAt + getBetConfig().reactionMs;
  state.signalLane = Math.random() < 0.5 ? 'left' : 'right';
  if (state.moveCount === 0) state.runs += 1;
  buttons.forEach((button) => button.classList.toggle('signal-hot', button.dataset.lane === state.signalLane));
  promptKicker.textContent = 'SIGNAL LIVE';
  promptTitle.innerHTML = state.signalLane === 'left' ? 'HIT <em>CYAN</em>' : 'HIT <em>PINK</em>';
  statusText.textContent = state.signalLane === 'left' ? `CYAN LINE // MOVE // ${state.betTier}X` : `PINK LINE // MOVE // ${state.betTier}X`;
  timerReadout.textContent = `${(getBetConfig().reactionMs / 1000).toFixed(1)} SEC`;
  tone(state.signalLane === 'left' ? 430 : 270, 0.1, 'square', 0.038);
  tone(state.signalLane === 'left' ? 860 : 540, 0.12, 'sawtooth', 0.024, 0.07);
  updateHud();
}

function chooseLane(lane) {
  ensureAudio();
  if (state.phase === 'ready') {
    state.running = true;
    startBeat();
    armNextSignal();
    return;
  }
  if (state.phase === 'arming') {
    tone(lane === 'left' ? 180 : 145, 0.06, 'square', 0.014);
    return;
  }
  if (state.phase !== 'signal') return;
  const now = performance.now();
  const isCorrect = lane === state.signalLane && now <= state.signalDeadline;
  if (!isCorrect) {
    state.selectedLane = lane;
    resolveRound(false, lane, lane === state.signalLane ? 'TOO LATE' : 'WRONG LANE');
    return;
  }
  state.moveCount += 1;
  state.shiftFrom = state.carLane;
  state.shiftTo = lane;
  state.pendingWin = state.moveCount >= getBetConfig().moves;
  state.selectedLane = lane;
  state.phase = 'shift';
  state.phaseStartedAt = now;
  buttons.forEach((button) => button.classList.remove('signal-hot'));
  setButtonsDisabled(true);
  promptKicker.textContent = state.pendingWin ? 'FINAL MOVE' : 'CLEAN SHIFT';
  promptTitle.innerHTML = state.pendingWin ? 'LINE<br /><em>COMPLETE</em>' : 'KEEP<br /><em>MOVING</em>';
  statusText.textContent = `MOVE ${state.moveCount} / ${getBetConfig().moves}`;
  timerReadout.textContent = 'SHIFT';
  tone(lane === 'left' ? 510 : 300, 0.08, 'square', 0.026);
  updateHud();
}

function startRideFromReady() {
  if (state.phase !== 'ready' || state.balance <= 0) return;
  ensureAudio();
  state.running = true;
  startBeat();
  armNextSignal();
}

function resolveRound(didWin, lane, reason) {
  state.phase = 'result';
  state.phaseStartedAt = performance.now();
  state.outcome = didWin;
  state.selectedLane = lane || state.signalLane;
  buttons.forEach((button) => button.classList.remove('signal-hot'));
  state.streak = didWin ? state.streak + 1 : 0;
  const streakMultiplier = MULTIPLIERS[Math.min(state.streak - (didWin ? 1 : 0), MULTIPLIERS.length - 1)];
  const betConfig = getBetConfig();
  const completedTier = didWin && state.moveCount >= betConfig.moves;
  if (!didWin) {
    state.running = false;
    clearInterval(beatTimer);
  }
  if (completedTier) {
    state.running = false;
    clearInterval(beatTimer);
  }
  const stake = BASE_BET * betConfig.stake;
  const payout = Math.round(stake * streakMultiplier);
  if (didWin) {
    state.wins += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else {
    state.losses += 1;
  }
  state.balance += didWin ? payout : -stake;
  updateHud();
  syncProfile();
  gameCard.classList.remove('win-flash', 'fail-shake');
  void gameCard.offsetWidth;
  gameCard.classList.add(didWin ? 'win-flash' : 'fail-shake');
  resultStamp.textContent = didWin ? (state.streak >= 3 ? 'CLEAN LINE // STREAK UP' : 'DRIFT CLEAN // +CREDITS') : `GLITCH // ${reason}`;
  resultStamp.classList.toggle('fail', !didWin);
  resultStamp.classList.remove('show');
  void resultStamp.offsetWidth;
  resultStamp.classList.add('show');
  setButtonsDisabled(true);
  readyButton.disabled = true;
  readyButton.textContent = didWin ? 'DONE' : 'MISS';
  promptKicker.textContent = completedTier ? 'RIDE COMPLETE' : (didWin ? 'LANE CONFIRMED' : 'SIGNAL LOST');
  promptTitle.innerHTML = completedTier ? `${state.betTier}X<br /><em>LOCKED</em>` : (didWin ? 'KEEP<br /><em>RHYTHM</em>' : 'RESET<br /><em>THE LINE</em>');
  statusText.textContent = completedTier ? `${betConfig.moves} MOVES COMPLETE // RIDE STOPPED` : (didWin ? `+${payout} CREDITS // ${state.betTier}X BET` : `-${stake} CREDITS // ${state.betTier}X BET`);
  timerReadout.textContent = didWin ? 'CLEAN' : 'MISS';
  if (didWin) {
    tone(660, 0.12, 'square', 0.028);
    tone(990, 0.18, 'sine', 0.022, 0.08);
  } else {
    tone(105, 0.24, 'sawtooth', 0.045);
    tone(68, 0.3, 'triangle', 0.03, 0.05);
  }
}

function resetRound() {
  state.phaseStartedAt = performance.now();
  state.selectedLane = null;
  state.signalLane = null;
  state.outcome = null;
  state.moveCount = 0;
  state.carLane = null;
  state.shiftFrom = null;
  state.shiftTo = null;
  state.pendingWin = false;
  buttons.forEach((button) => button.classList.remove('signal-hot', 'selected'));
  if (state.running) {
    armNextSignal();
  } else {
    state.phase = 'ready';
    setButtonsDisabled(false);
    setReadyUi();
    updateHud();
  }
}

function resetRun() {
  clearInterval(beatTimer);
  state.streak = 0;
  state.betTier = 5;
  state.phase = 'ready';
  state.running = false;
  state.phaseStartedAt = performance.now();
  state.selectedLane = null;
  state.signalLane = null;
  state.signalShownAt = 0;
  state.signalDeadline = 0;
  state.outcome = null;
  state.moveCount = 0;
  state.carLane = null;
  state.shiftFrom = null;
  state.shiftTo = null;
  state.pendingWin = false;
  resultStamp.classList.remove('show');
  gameCard.classList.remove('win-flash', 'fail-shake');
  buttons.forEach((button) => button.classList.remove('selected'));
  updateHud();
  syncProfile();
  setReadyUi();
  tone(330, 0.1, 'sine', 0.02);
}

function drawBackground(width, height, now) {
  ctx.fillStyle = '#080d10';
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, height * 0.48, 0, width / 2, height * 0.48, width * 0.65);
  glow.addColorStop(0, 'rgba(20, 84, 83, 0.18)');
  glow.addColorStop(0.54, 'rgba(12, 25, 29, 0.13)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
  ctx.fillStyle = 'rgba(40,243,221,0.14)';
  for (let i = 0; i < 12; i += 1) {
    const x = ((i * 97 + now * 0.012) % (width + 50)) - 25;
    const y = 30 + (i * 61) % (height * 0.62);
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawRoad(width, height, now) {
  const horizon = height * 0.42;
  const center = width / 2;
  const bottom = height + 75;
  const baseSpeed = state.running ? (state.phase === 'signal' || state.phase === 'shift' ? 0.0015 : 0.00105) : 0.00045;
  const speed = baseSpeed * getBetConfig().speed;
  const phase = (now * speed) % 1;

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(161, 245, 239, 0.17)';
  for (let i = 0; i < 13; i += 1) {
    const p = (i / 13 + phase) % 1;
    const y = horizon + Math.pow(p, 2.15) * (bottom - horizon);
    ctx.globalAlpha = 0.18 + p * 0.48;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
  const vanishing = { x: center, y: horizon };
  const trackLines = [
    { x: center - width * 0.32, color: '#28f3dd', side: 'left' },
    { x: center - width * 0.18, color: '#28f3dd', side: 'left' },
    { x: center + width * 0.18, color: '#f24ba8', side: 'right' },
    { x: center + width * 0.32, color: '#f24ba8', side: 'right' },
  ];
  trackLines.forEach(({ x, color, side }) => {
    const isHot = state.phase === 'signal' && state.signalLane === side;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isHot ? 24 : 14;
    ctx.lineWidth = isHot ? 3 : 2;
    ctx.globalAlpha = isHot ? 1 : 0.52;
    ctx.beginPath(); ctx.moveTo(vanishing.x, vanishing.y); ctx.lineTo(x, bottom); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  });
  ctx.restore();
}

function laneOffsetFor(lane, width) {
  if (lane === 'left') return -width * 0.18;
  if (lane === 'right') return width * 0.18;
  return 0;
}

function drawCoin(x, y, scale, color, now) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(Math.sin(now / 280) * 0.2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#081013';
  ctx.font = '700 13px Space Mono, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', 0, 1);
  ctx.restore();
}

function drawCar(width, height, now) {
  const isShift = state.phase === 'shift';
  const isMoving = isShift || state.phase === 'result';
  const isWin = state.phase === 'result' && state.outcome;
  const isFail = state.phase === 'result' && !state.outcome;
  const elapsed = now - state.phaseStartedAt;
  const t = Math.min(elapsed / (DRIFT_ANIM_MS / getBetConfig().speed), 1);
  const ease = t * t * (3 - 2 * t);
  const fromOffset = laneOffsetFor(state.shiftFrom, width);
  const shiftOffset = laneOffsetFor(state.shiftTo, width);
  const resultOffset = laneOffsetFor(state.selectedLane || state.carLane, width);
  const laneOffset = isShift ? fromOffset + (shiftOffset - fromOffset) * ease : state.phase === 'result' ? resultOffset : fromOffset + Math.sin(now / 380) * 2;
  const x = width / 2 + laneOffset;
  const motionProgress = isShift ? ease : 1;
  const visibleLane = isShift ? state.shiftTo : state.selectedLane || state.carLane;
  const y = height * 0.72 - (isWin ? motionProgress * 18 : 0) + (isFail ? motionProgress * 9 : 0);
  const tilt = isMoving ? (visibleLane === 'left' ? -0.22 : 0.22) * motionProgress : Math.sin(now / 230) * 0.025;
  const carColor = isFail ? '#ff537c' : '#d7f9ef';

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(1.15, 1.15);
  ctx.shadowColor = isFail ? 'rgba(255,83,124,0.45)' : 'rgba(40,243,221,0.32)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.beginPath(); ctx.ellipse(0, 26, 45, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = carColor;
  ctx.beginPath(); ctx.moveTo(-30, 22); ctx.lineTo(-22, -10); ctx.quadraticCurveTo(-16, -29, 0, -35); ctx.quadraticCurveTo(16, -29, 22, -10); ctx.lineTo(30, 22); ctx.quadraticCurveTo(0, 33, -30, 22); ctx.fill();
  ctx.fillStyle = '#172329';
  ctx.beginPath(); ctx.moveTo(-15, -12); ctx.lineTo(-9, -26); ctx.quadraticCurveTo(0, -31, 9, -26); ctx.lineTo(15, -12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = isFail ? '#ffb0bc' : '#28f3dd';
  ctx.fillRect(-26, 13, 8, 3); ctx.fillRect(18, 13, 8, 3);
  ctx.fillStyle = '#080d10';
  ctx.fillRect(-29, 22, 9, 5); ctx.fillRect(20, 22, 9, 5);
  ctx.restore();

  if (isMoving && t > 0.25) {
    const smokeColor = state.selectedLane === 'left' ? 'rgba(40,243,221,0.28)' : 'rgba(242,75,168,0.28)';
    for (let i = 0; i < 6; i += 1) {
      const puff = ((now / 240 + i * 0.3) % 1);
      ctx.fillStyle = smokeColor;
      ctx.globalAlpha = 1 - puff;
      ctx.beginPath(); ctx.arc(x - (state.selectedLane === 'left' ? -1 : 1) * i * 7, y + 22 + puff * 28, 3 + puff * 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawWorld(now) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  drawBackground(width, height, now);
  drawRoad(width, height, now);
  const activeLane = state.selectedLane || state.signalLane;
  const laneX = activeLane === 'left' ? width * 0.32 : width * 0.68;
  if (state.phase === 'result') {
    const progress = Math.min((now - state.phaseStartedAt) / (DRIFT_ANIM_MS / getBetConfig().speed), 1);
    const coinY = height * 0.45 + (1 - progress) * height * 0.1;
    if (state.outcome) drawCoin(laneX, coinY, 0.65 + progress * 0.45, activeLane === 'left' ? '#28f3dd' : '#f24ba8', now);
  }
  drawCar(width, height, now);
}

function animate(now) {
  drawWorld(now);
  if (state.phase === 'arming') {
    const elapsed = now - state.phaseStartedAt;
    const armDelay = SIGNAL_DELAY_MS / getBetConfig().speed;
    timerReadout.textContent = `SYNC ${(Math.max(0, armDelay - elapsed) / 1000).toFixed(1)}`;
    if (elapsed >= armDelay) showSignal();
  } else if (state.phase === 'signal') {
    const remaining = state.signalDeadline - now;
    timerReadout.textContent = `${Math.max(0, remaining / 1000).toFixed(1)} SEC`;
    if (remaining <= 0) resolveRound(false, null, 'NO INPUT');
  } else if (state.phase === 'shift') {
    const shiftTime = DRIFT_ANIM_MS / getBetConfig().speed;
    if (now - state.phaseStartedAt >= shiftTime) {
      state.carLane = state.shiftTo;
      if (state.pendingWin) resolveRound(true, state.carLane, `${getBetConfig().moves} MOVES COMPLETE`);
      else {
        state.pendingWin = false;
        armNextSignal();
      }
    }
  } else if (state.phase === 'result' && now - state.phaseStartedAt >= RESULT_MS) {
    resetRound();
  }
  requestAnimationFrame(animate);
}

buttons.forEach((button) => button.addEventListener('click', () => chooseLane(button.dataset.lane)));
readyButton.addEventListener('click', startRideFromReady);
betButtons.forEach((button) => button.addEventListener('click', () => selectBetTier(Number(button.dataset.bet))));
creditPacks.forEach((button) => button.addEventListener('click', () => selectPack(button)));
if (indianPaymentButton) indianPaymentButton.addEventListener('click', () => setPaymentMethod('indian'));
if (foreignPaymentButton) foreignPaymentButton.addEventListener('click', () => setPaymentMethod('foreign'));
openPaymentButton.addEventListener('click', openPaymentPage);
paymentChoiceIndianButton.addEventListener('click', () => openSelectedPaymentPage('indian'));
paymentChoiceForeignButton.addEventListener('click', () => openSelectedPaymentPage('foreign'));
openWithdrawButton.addEventListener('click', openWithdrawPage);
backToRide.addEventListener('click', closePaymentPage);
backToRideFromChoice.addEventListener('click', closePaymentPage);
backToRideFromWithdraw.addEventListener('click', closeWithdrawPage);
openProfileButton.addEventListener('click', openProfilePage);
backToRideFromProfile.addEventListener('click', closeProfilePage);
profileAddCreditsButton.addEventListener('click', openPaymentPage);
profileWithdrawButton.addEventListener('click', openWithdrawPage);
logoutButton.addEventListener('click', logout);
saveProfileButton.addEventListener('click', saveProfileName);
profileNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveProfileName();
});
profilePhoneInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveProfileName();
});
signInModeButton.addEventListener('click', () => setAuthMode('login'));
registerModeButton.addEventListener('click', () => setAuthMode('register'));
authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submitAuth();
});
copyWalletButton.addEventListener('click', copyWalletAddress);
scanQrButton.addEventListener('click', () => qrFileInput.click());
qrFileInput.addEventListener('change', scanQrImage);
payButton.addEventListener('click', completePayment);
withdrawAmountInput.addEventListener('input', updateWithdrawSummary);
indianPayoutButton.addEventListener('click', () => setWithdrawMethod('indian'));
foreignPayoutButton.addEventListener('click', () => setWithdrawMethod('foreign'));
withdrawSubmitButton.addEventListener('click', submitWithdrawalRequest);
resetButton.addEventListener('click', resetRun);
soundToggle.addEventListener('click', () => {
  state.soundOn = !state.soundOn;
  soundToggle.setAttribute('aria-pressed', String(state.soundOn));
  soundToggle.setAttribute('aria-label', state.soundOn ? 'Turn sound off' : 'Turn sound on');
  if (state.soundOn) { startBeat(); tone(500, 0.1, 'sine', 0.02); }
  else clearInterval(beatTimer);
});
window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'a') chooseLane('left');
  if (event.key.toLowerCase() === 'd') chooseLane('right');
  if (event.key === 'Escape') resetRun();
});

resizeCanvas();
updateHud();
setReadyUi();
setAuthMode('login');
void restoreLogin();
requestAnimationFrame(animate);
