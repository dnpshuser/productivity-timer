(function () {
  'use strict';

  var STORAGE_KEY = 'dual_stopwatch_state_v7';

  var state = {
    active: 'paused', // 'productive' | 'leisure' | 'paused'
    prodMs: 0,
    leisureMs: 0,
    currentSessionStart: null
  };

  // Tracks which action is waiting for authentication: 'start_prod', 'pause_prod', or 'reset'
  var pendingAction = null;

  // Safe localStorage recovery
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.prodMs = Math.max(0, Number(parsed.prodMs) || 0);
      state.leisureMs = Math.max(0, Number(parsed.leisureMs) || 0);
      state.active = parsed.active || 'paused';
      state.currentSessionStart = parsed.currentSessionStart || null;

      if (state.active !== 'paused' && state.currentSessionStart) {
        var elapsed = Date.now() - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'productive') {
            state.prodMs += elapsed;
          } else if (state.active === 'leisure') {
            state.leisureMs += elapsed;
          }
        }
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
    var cancelModalBtn = document.getElementById('cancelModalBtn');
    var confirmModalBtn = document.getElementById('confirmModalBtn');
    var authModal = document.getElementById('authModal');
    var authPassInput = document.getElementById('authPassInput');
    var passError = document.getElementById('passError');
    var modalTitle = document.getElementById('modalTitle');
    var modalSubtitle = document.getElementById('modalSubtitle');
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
        toggleBtn.textContent = 'Pause Productive (Switch to Leisure)';
      } else if (state.active === 'leisure') {
        cardProd.className = 'stopwatch-card';
        cardLeisure.className = 'stopwatch-card active-leisure';
        badgeProd.textContent = 'PAUSED';
        badgeLeisure.textContent = 'RUNNING';
        toggleBtn.textContent = 'Start Productive Time';
      } else {
        cardProd.className = 'stopwatch-card';
        cardLeisure.className = 'stopwatch-card';
        badgeProd.textContent = 'PAUSED';
        badgeLeisure.textContent = 'PAUSED';
        toggleBtn.textContent = 'Start Productive Time';
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

    function openModal(action) {
      pendingAction = action;
      authPassInput.value = '';
      passError.classList.remove('show');

      if (action === 'start_prod') {
        modalTitle.textContent = 'Start Productive Time';
        modalSubtitle.textContent = 'Enter password "1" to start tracking Productive Time:';
        confirmModalBtn.textContent = 'Start';
        confirmModalBtn.className = 'btn btn-action-confirm';
      } else if (action === 'pause_prod') {
        modalTitle.textContent = 'Pause Productive Time';
        modalSubtitle.textContent = 'Enter password "0" to pause and switch to Leisure:';
        confirmModalBtn.textContent = 'Pause';
        confirmModalBtn.className = 'btn btn-action-confirm';
      } else if (action === 'reset') {
        modalTitle.textContent = 'Reset Both Timers?';
        modalSubtitle.textContent = 'Enter authorization password to reset all hours to zero:';
        confirmModalBtn.textContent = 'Verify & Reset';
        confirmModalBtn.className = 'btn btn-action-confirm danger-mode';
      }

      authModal.classList.add('active');
      setTimeout(function () {
        authPassInput.focus();
      }, 50);
    }

    function closeModal() {
      pendingAction = null;
      authPassInput.value = '';
      passError.classList.remove('show');
      authModal.classList.remove('active');
    }

    function executeAuthorizedAction() {
      var entered = authPassInput.value.trim().toLowerCase();

      if (pendingAction === 'start_prod') {
        if (entered === '1') {
          settleCurrentSession();
          state.active = 'productive';
          state.currentSessionStart = Date.now();
          persist();
          render();
          closeModal();
        } else {
          showError();
        }
      } else if (pendingAction === 'pause_prod') {
        if (entered === '0') {
          settleCurrentSession();
          state.active = 'leisure';
          state.currentSessionStart = Date.now();
          persist();
          render();
          closeModal();
        } else {
          showError();
        }
      } else if (pendingAction === 'reset') {
        if (entered === 'sdrgb') {
          state.active = 'paused';
          state.prodMs = 0;
          state.leisureMs = 0;
          state.currentSessionStart = null;
          persist();
          render();
          closeModal();
        } else {
          showError();
        }
      }
    }

    function showError() {
      passError.classList.add('show');
      authPassInput.value = '';
      authPassInput.focus();
    }

    // Toggle click intercepted by password requirements
    toggleBtn.addEventListener('click', function () {
      if (state.active === 'productive') {
        openModal('pause_prod'); // Requires 0
      } else {
        openModal('start_prod'); // Requires 1
      }
    });

    openResetBtn.addEventListener('click', function () {
      openModal('reset'); // Requires sdrgb
    });

    cancelModalBtn.addEventListener('click', closeModal);
    confirmModalBtn.addEventListener('click', executeAuthorizedAction);

    // Support keyboard "Enter" key
    authPassInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        executeAuthorizedAction();
      }
    });

    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) {
        closeModal();
      }
    });

    function syncTime() {
      if (state.active !== 'paused') {
        settleCurrentSession();
        persist();
      }
      render();
    }

    document.addEventListener('visibilitychange', syncTime);
    window.addEventListener('focus', syncTime);
    window.addEventListener('pageshow', syncTime);

    window.addEventListener('beforeunload', function () {
      if (state.active !== 'paused') {
        settleCurrentSession();
        persist();
      }
    });

    setInterval(function () {
      if (state.active !== 'paused') {
        settleCurrentSession();
        persist();
      }
    }, 2000);

    setInterval(function () {
      if (state.active !== 'paused') {
        render();
      }
    }, 200);

    render();
  }

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