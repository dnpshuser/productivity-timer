(function () {
  'use strict';

  var STORAGE_KEY = 'stratified_stopwatch_state_v2';

  // Secret internal mappings (never shown in UI)
  var PASSWORDS = {
    sleep: '0',
    productivity: '1',
    mandate: '2',
    leisure: '3',
    reset: 'sdrgb'
  };

  var state = {
    active: 'paused', // 'sleep' | 'productivity' | 'mandate' | 'leisure' | 'paused'
    sleepMs: 0,
    prodMs: 0,
    mandateMs: 0,
    leisureMs: 0,
    currentSessionStart: null
  };

  var pendingTarget = null; // target mode to activate, or 'reset', or 'generic_switch'

  // Safe localStorage recovery
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.sleepMs = Math.max(0, Number(parsed.sleepMs) || 0);
      state.prodMs = Math.max(0, Number(parsed.prodMs) || 0);
      state.mandateMs = Math.max(0, Number(parsed.mandateMs) || 0);
      state.leisureMs = Math.max(0, Number(parsed.leisureMs) || 0);
      state.active = parsed.active || 'paused';
      state.currentSessionStart = parsed.currentSessionStart || null;

      if (state.active !== 'paused' && state.currentSessionStart) {
        var elapsed = Date.now() - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'sleep') state.sleepMs += elapsed;
          else if (state.active === 'productivity') state.prodMs += elapsed;
          else if (state.active === 'mandate') state.mandateMs += elapsed;
          else if (state.active === 'leisure') state.leisureMs += elapsed;
        }
        state.currentSessionStart = Date.now();
      }
    }
  } catch (err) {
    console.warn('Storage load error:', err);
  }

  function initApp() {
    var cardSleep = document.getElementById('cardSleep');
    var cardProd = document.getElementById('cardProd');
    var cardMandate = document.getElementById('cardMandate');
    var cardLeisure = document.getElementById('cardLeisure');

    var badgeSleep = document.getElementById('badgeSleep');
    var badgeProd = document.getElementById('badgeProd');
    var badgeMandate = document.getElementById('badgeMandate');
    var badgeLeisure = document.getElementById('badgeLeisure');

    var displaySleep = document.getElementById('displaySleep');
    var displayProd = document.getElementById('displayProd');
    var displayMandate = document.getElementById('displayMandate');
    var displayLeisure = document.getElementById('displayLeisure');

    var ratioSleep = document.getElementById('ratioSleep');
    var ratioProd = document.getElementById('ratioProd');
    var ratioMandate = document.getElementById('ratioMandate');
    var ratioLeisure = document.getElementById('ratioLeisure');

    var pctSleep = document.getElementById('pctSleep');
    var pctProd = document.getElementById('pctProd');
    var pctMandate = document.getElementById('pctMandate');
    var pctLeisure = document.getElementById('pctLeisure');

    var switchBtn = document.getElementById('switchBtn');
    var openResetBtn = document.getElementById('openResetBtn');
    var cancelModalBtn = document.getElementById('cancelModalBtn');
    var confirmModalBtn = document.getElementById('confirmModalBtn');

    var authModal = document.getElementById('authModal');
    var authPassInput = document.getElementById('authPassInput');
    var passError = document.getElementById('passError');
    var modalTitle = document.getElementById('modalTitle');
    var modalSubtitle = document.getElementById('modalSubtitle');

    if (!cardSleep || !cardProd || !cardMandate || !cardLeisure || !switchBtn) {
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
          sleepMs: state.sleepMs,
          prodMs: state.prodMs,
          mandateMs: state.mandateMs,
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
      var s = state.sleepMs;
      var p = state.prodMs;
      var m = state.mandateMs;
      var l = state.leisureMs;

      if (state.active !== 'paused' && state.currentSessionStart) {
        var elapsed = now - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'sleep') s += elapsed;
          else if (state.active === 'productivity') p += elapsed;
          else if (state.active === 'mandate') m += elapsed;
          else if (state.active === 'leisure') l += elapsed;
        }
      }
      return { sleep: s, prod: p, mandate: m, leisure: l };
    }

    function settleCurrentSession() {
      if (state.active !== 'paused' && state.currentSessionStart) {
        var now = Date.now();
        var elapsed = now - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'sleep') state.sleepMs += elapsed;
          else if (state.active === 'productivity') state.prodMs += elapsed;
          else if (state.active === 'mandate') state.mandateMs += elapsed;
          else if (state.active === 'leisure') state.leisureMs += elapsed;
        }
        state.currentSessionStart = now;
      }
    }

    function render() {
      var totals = getComputedTotals();

      displaySleep.textContent = formatTime(totals.sleep);
      displayProd.textContent = formatTime(totals.prod);
      displayMandate.textContent = formatTime(totals.mandate);
      displayLeisure.textContent = formatTime(totals.leisure);

      cardSleep.className = 'stopwatch-card' + (state.active === 'sleep' ? ' active-sleep' : '');
      cardProd.className = 'stopwatch-card' + (state.active === 'productivity' ? ' active-prod' : '');
      cardMandate.className = 'stopwatch-card' + (state.active === 'mandate' ? ' active-mandate' : '');
      cardLeisure.className = 'stopwatch-card' + (state.active === 'leisure' ? ' active-leisure' : '');

      badgeSleep.textContent = (state.active === 'sleep' ? 'RUNNING' : 'PAUSED');
      badgeProd.textContent = (state.active === 'productivity' ? 'RUNNING' : 'PAUSED');
      badgeMandate.textContent = (state.active === 'mandate' ? 'RUNNING' : 'PAUSED');
      badgeLeisure.textContent = (state.active === 'leisure' ? 'RUNNING' : 'PAUSED');

      if (state.active === 'paused') {
        switchBtn.textContent = 'Start Tracking';
      } else {
        var name = state.active.charAt(0).toUpperCase() + state.active.slice(1);
        switchBtn.textContent = 'Active: ' + name + ' (Tap to Switch)';
      }

      var sum = totals.sleep + totals.prod + totals.mandate + totals.leisure;
      if (sum === 0) {
        ratioSleep.style.width = '25%';
        ratioProd.style.width = '25%';
        ratioMandate.style.width = '25%';
        ratioLeisure.style.width = '25%';
        pctSleep.textContent = '0%';
        pctProd.textContent = '0%';
        pctMandate.textContent = '0%';
        pctLeisure.textContent = '0%';
      } else {
        var sPct = Math.round((totals.sleep / sum) * 100);
        var pPct = Math.round((totals.prod / sum) * 100);
        var mPct = Math.round((totals.mandate / sum) * 100);
        var lPct = 100 - (sPct + pPct + mPct);

        ratioSleep.style.width = sPct + '%';
        ratioProd.style.width = pPct + '%';
        ratioMandate.style.width = mPct + '%';
        ratioLeisure.style.width = lPct + '%';

        pctSleep.textContent = sPct + '%';
        pctProd.textContent = pPct + '%';
        pctMandate.textContent = mPct + '%';
        pctLeisure.textContent = lPct + '%';
      }
    }

    function openModal(target) {
      pendingTarget = target;
      authPassInput.value = '';
      passError.classList.remove('show');

      if (target === 'reset') {
        modalTitle.textContent = 'Reset All 4 Timers?';
        modalSubtitle.textContent = 'Enter authorization password to reset all hours to zero:';
        confirmModalBtn.textContent = 'Verify & Reset';
        confirmModalBtn.className = 'btn btn-action-confirm danger-mode';
      } else if (target === 'generic_switch') {
        modalTitle.textContent = 'Switch Category';
        modalSubtitle.textContent = 'Enter password for the category you want to activate:';
        confirmModalBtn.textContent = 'Activate';
        confirmModalBtn.className = 'btn btn-action-confirm';
      } else {
        var catName = target.charAt(0).toUpperCase() + target.slice(1);
        modalTitle.textContent = 'Switch to ' + catName;
        modalSubtitle.textContent = 'Enter password to activate ' + catName + ':';
        confirmModalBtn.textContent = 'Activate ' + catName;
        confirmModalBtn.className = 'btn btn-action-confirm';
      }

      authModal.classList.add('active');
      setTimeout(function () {
        authPassInput.focus();
      }, 50);
    }

    function closeModal() {
      pendingTarget = null;
      authPassInput.value = '';
      passError.classList.remove('show');
      authModal.classList.remove('active');
    }

    function executeAuthorizedAction() {
      var entered = authPassInput.value.trim().toLowerCase();

      // Reset action
      if (pendingTarget === 'reset') {
        if (entered === PASSWORDS.reset) {
          state.active = 'paused';
          state.sleepMs = 0;
          state.prodMs = 0;
          state.mandateMs = 0;
          state.leisureMs = 0;
          state.currentSessionStart = null;
          persist();
          render();
          closeModal();
        } else {
          showError();
        }
        return;
      }

      // Generic switch button: accepts 0, 1, 2, or 3 directly
      if (pendingTarget === 'generic_switch') {
        var matched = null;
        for (var cat in PASSWORDS) {
          if (cat !== 'reset' && entered === PASSWORDS[cat]) {
            matched = cat;
            break;
          }
        }
        if (matched) {
          settleCurrentSession();
          state.active = matched;
          state.currentSessionStart = Date.now();
          persist();
          render();
          closeModal();
        } else {
          showError();
        }
        return;
      }

      // Direct card tap: requires password for that specific card
      if (pendingTarget && PASSWORDS[pendingTarget] && entered === PASSWORDS[pendingTarget]) {
        settleCurrentSession();
        state.active = pendingTarget;
        state.currentSessionStart = Date.now();
        persist();
        render();
        closeModal();
      } else {
        showError();
      }
    }

    function showError() {
      passError.classList.add('show');
      authPassInput.value = '';
      authPassInput.focus();
    }

    // Direct card tap handlers - allows jumping between ANY two categories
    cardSleep.addEventListener('click', function () {
      if (state.active !== 'sleep') openModal('sleep');
    });
    cardProd.addEventListener('click', function () {
      if (state.active !== 'productivity') openModal('productivity');
    });
    cardMandate.addEventListener('click', function () {
      if (state.active !== 'mandate') openModal('mandate');
    });
    cardLeisure.addEventListener('click', function () {
      if (state.active !== 'leisure') openModal('leisure');
    });

    // Main switch button: opens prompt to enter any category PIN
    switchBtn.addEventListener('click', function () {
      openModal('generic_switch');
    });

    openResetBtn.addEventListener('click', function () {
      openModal('reset');
    });

    cancelModalBtn.addEventListener('click', closeModal);
    confirmModalBtn.addEventListener('click', executeAuthorizedAction);

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