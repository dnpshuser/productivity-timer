(function () {
  'use strict';

  var STORAGE_KEY = 'dual_stopwatch_state_v4';

  // Internal state
  var state = {
    active: 'paused', // 'productive' | 'leisure' | 'paused'
    prodMs: 0,
    leisureMs: 0,
    currentSessionStart: null // absolute timestamp when the current active stretch started
  };

  // Safe localStorage loader
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.prodMs = Math.max(0, Number(parsed.prodMs) || 0);
      state.leisureMs = Math.max(0, Number(parsed.leisureMs) || 0);
      state.active = parsed.active || 'paused';
      state.currentSessionStart = parsed.currentSessionStart || null;

      // If it was left running when closed, immediately catch up the elapsed time
      if (state.active !== 'paused' && state.currentSessionStart) {
        var elapsed = Date.now() - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'productive') {
            state.prodMs += elapsed;
          } else if (state.active === 'leisure') {
            state.leisureMs += elapsed;
          }
        }
        // Reset anchor to now so it continues forward
        state.currentSessionStart = Date.now();
      }
    }
  } catch (err) {
    console.warn('Storage load error:', err);
  }

  function initApp() {
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

    if (!cardProd || !cardLeisure || !toggleBtn || !openResetBtn) {
      return;
    }

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
          active: state.active,
          currentSessionStart: state.currentSessionStart
        }));
      } catch (err) {
        console.warn('Persistence failed:', err);
      }
    }

    // Calculates real-time totals including in-progress background duration
    function getComputedTotals() {
      var now = Date.now();
      var prod = state.prodMs;
      var leisure = state.leisureMs;

      if (state.active !== 'paused' && state.currentSessionStart) {
        var elapsed = now - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'productive') {
            prod += elapsed;
          } else if (state.active === 'leisure') {
            leisure += elapsed;
          }
        }
      }
      return { prod: prod, leisure: leisure };
    }

    // Syncs computed elapsed time back into permanent state
    function settleCurrentSession() {
      if (state.active !== 'paused' && state.currentSessionStart) {
        var now = Date.now();
        var elapsed = now - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'productive') {
            state.prodMs += elapsed;
          } else if (state.active === 'leisure') {
            state.leisureMs += elapsed;
          }
        }
        state.currentSessionStart = now;
      }
    }

    function render() {
      var totals = getComputedTotals();

      displayProd.textContent = formatTime(totals.prod);
      displayLeisure.textContent = formatTime(totals.leisure);

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

      var sum = totals.prod + totals.leisure;
      if (sum === 0) {
        ratioProd.style.width = '50%';
        ratioLeisure.style.width = '50%';
        prodPct.textContent = '0%';
        leisurePct.textContent = '0%';
      } else {
        var pVal = Math.round((totals.prod / sum) * 100);
        var lVal = 100 - pVal;
        ratioProd.style.width = pVal + '%';
        ratioLeisure.style.width = lVal + '%';
        prodPct.textContent = pVal + '%';
        leisurePct.textContent = lVal + '%';
      }
    }

    function handleToggle() {
      settleCurrentSession();

      if (state.active === 'paused' || state.active === 'leisure') {
        state.active = 'productive';
      } else {
        state.active = 'leisure';
      }

      state.currentSessionStart = Date.now();
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
      state.currentSessionStart = null;
      persist();
      render();
      closeModal();
    }

    toggleBtn.addEventListener('click', handleToggle);
    openResetBtn.addEventListener('click', openModal);
    cancelResetBtn.addEventListener('click', closeModal);
    confirmResetBtn.addEventListener('click', confirmReset);

    resetModal.addEventListener('click', function (e) {
      if (e.target === resetModal) {
        closeModal();
      }
    });

    // Key fix: Trigger on window focus and visibility change
    function handleWakeUp() {
      if (state.active !== 'paused') {
        settleCurrentSession();
        persist();
      }
      render();
    }

    document.addEventListener('visibilitychange', handleWakeUp);
    window.addEventListener('focus', handleWakeUp);
    window.addEventListener('pageshow', handleWakeUp);

    // Regular UI rendering tick when app is in foreground
    setInterval(function () {
      if (state.active !== 'paused') {
        render();
      }
    }, 200);

    // Initial render
    render();
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('SW registration bypassed:', err);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();