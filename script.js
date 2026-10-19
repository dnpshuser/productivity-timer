(function () {
  'use strict';

  var STORAGE_KEY = 'dual_stopwatch_state_v3';
  var state = {
    active: 'paused', // 'productive' | 'leisure' | 'paused'
    prodMs: 0,
    leisureMs: 0,
    lastTick: null
  };

  // Safe LocalStorage Loader
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.prodMs = Math.max(0, Number(parsed.prodMs) || 0);
      state.leisureMs = Math.max(0, Number(parsed.leisureMs) || 0);
      state.active = 'paused';
      state.lastTick = null;
    }
  } catch (e) {
    console.warn('Storage initial load error:', e);
  }

  // DOM Elements
  var cardProd = document.getElementById('cardProd');
  var cardLeisure = document.getElementById('cardLeisure');
  var badgeProd = document.getElementById('badgeProd');
  var badgeLeisure = document.getElementById('badgeLeisure');
  var displayProd = document.getElementById('displayProd');
  var displayLeisure = document.getElementById('displayLeisure');
  var toggleBtn = document.getElementById('toggleBtn');
  var openResetBtn = document.getElementById('openResetBtn');
  var cancelResetBtn = document.getElementById('cancelResetBtn');
  var confirmResetBtn = document.getElementById('confirmResetBtn');
  var resetModal = document.getElementById('resetModal');
  var ratioProd = document.getElementById('ratioProd');
  var ratioLeisure = document.getElementById('ratioLeisure');
  var prodPct = document.getElementById('prodPct');
  var leisurePct = document.getElementById('leisurePct');

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        prodMs: state.prodMs,
        leisureMs: state.leisureMs,
        active: state.active
      }));
    } catch (e) {
      console.warn('Persist failed:', e);
    }
  }

  function flushDelta(now) {
    if (state.active !== 'paused' && state.lastTick) {
      var elapsed = now - state.lastTick;
      if (elapsed > 0) {
        if (state.active === 'productive') {
          state.prodMs += elapsed;
        } else if (state.active === 'leisure') {
          state.leisureMs += elapsed;
        }
      }
    }
    state.lastTick = now;
  }

  function render() {
    displayProd.textContent = formatTime(state.prodMs);
    displayLeisure.textContent = formatTime(state.leisureMs);

    if (state.active === 'productive') {
      cardProd.className = 'stopwatch-card active-prod';
      cardLeisure.className = 'stopwatch-card';
      badgeProd.textContent = 'RUNNING';
      badgeLeisure.textContent = 'PAUSED';
      toggleBtn.textContent = 'Switch to Leisure';
    } else if (state.active === 'leisure') {
      cardProd.className = 'stopwatch-card';
      cardLeisure.className = 'stopwatch-card active-leisure';
      badgeProd.textContent = 'PAUSED';
      badgeLeisure.textContent = 'RUNNING';
      toggleBtn.textContent = 'Switch to Productive';
    } else {
      cardProd.className = 'stopwatch-card';
      cardLeisure.className = 'stopwatch-card';
      badgeProd.textContent = 'PAUSED';
      badgeLeisure.textContent = 'PAUSED';
      toggleBtn.textContent = 'Start Tracking';
    }

    var sum = state.prodMs + state.leisureMs;
    if (sum === 0) {
      ratioProd.style.width = '50%';
      ratioLeisure.style.width = '50%';
      prodPct.textContent = '0%';
      leisurePct.textContent = '0%';
    } else {
      var pVal = Math.round((state.prodMs / sum) * 100);
      var lVal = 100 - pVal;
      ratioProd.style.width = pVal + '%';
      ratioLeisure.style.width = lVal + '%';
      prodPct.textContent = pVal + '%';
      leisurePct.textContent = lVal + '%';
    }
  }

  // Event Handlers
  function handleToggle() {
    var now = Date.now();
    flushDelta(now);

    if (state.active === 'paused' || state.active === 'leisure') {
      state.active = 'productive';
    } else {
      state.active = 'leisure';
    }

    state.lastTick = now;
    persist();
    render();
  }

  function openModal() {
    resetModal.classList.add('active');
  }

  function closeModal() {
    resetModal.classList.remove('active');
  }

  function confirmReset() {
    state.active = 'paused';
    state.prodMs = 0;
    state.leisureMs = 0;
    state.lastTick = null;
    persist();
    render();
    closeModal();
  }

  // Bind Event Listeners
  toggleBtn.addEventListener('click', handleToggle);
  openResetBtn.addEventListener('click', openModal);
  cancelResetBtn.addEventListener('click', closeModal);
  confirmResetBtn.addEventListener('click', confirmReset);

  resetModal.addEventListener('click', function (e) {
    if (e.target === resetModal) {
      closeModal();
    }
  });

  // Page Visibility API: Recalculates exact delta on app wake
  document.addEventListener('visibilitychange', function () {
    if (state.active !== 'paused') {
      flushDelta(Date.now());
      persist();
      render();
    }
  });

  // Continuous loop for UI ticking
  setInterval(function () {
    if (state.active !== 'paused') {
      flushDelta(Date.now());
      render();
    }
  }, 100);

  // Initial draw
  render();
})();