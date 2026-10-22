(function () {
  'use strict';

  var STORAGE_KEY = 'stratified_stopwatch_state_v12';

  var PASSWORDS = {
    sleep: '0',
    productivity: '1',        // Base Productivity
    prod_high: '11',          // High Productivity
    prod_low: '12',           // Low Productivity
    mandate: '2',             // Base Mandate
    mandate_univ: '21',       // Universal Mandate
    mandate_cond: '22',       // Conditional Mandate
    leisure: '3',             // Base Leisure
    leisure_break: '31',      // Break
    leisure_spare: '32',      // Spare
    reset: 'sdrgb'
  };

  var state = {
    active: 'paused',
    sleepMs: 0,
    prodBaseMs: 0,
    prodHighMs: 0,
    prodLowMs: 0,
    mandateBaseMs: 0,
    mandateUnivMs: 0,
    mandateCondMs: 0,
    leisureBaseMs: 0,
    leisureBreakMs: 0,
    leisureSpareMs: 0,
    currentSessionStart: null
  };

  var pendingTarget = null;

  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      state.sleepMs = Math.max(0, Number(parsed.sleepMs) || 0);
      state.prodBaseMs = Math.max(0, Number(parsed.prodBaseMs) || 0);
      state.prodHighMs = Math.max(0, Number(parsed.prodHighMs) || 0);
      state.prodLowMs = Math.max(0, Number(parsed.prodLowMs) || 0);
      state.mandateBaseMs = Math.max(0, Number(parsed.mandateBaseMs) || 0);
      state.mandateUnivMs = Math.max(0, Number(parsed.mandateUnivMs) || 0);
      state.mandateCondMs = Math.max(0, Number(parsed.mandateCondMs) || 0);
      state.leisureBaseMs = Math.max(0, Number(parsed.leisureBaseMs) || 0);
      state.leisureBreakMs = Math.max(0, Number(parsed.leisureBreakMs) || 0);
      state.leisureSpareMs = Math.max(0, Number(parsed.leisureSpareMs) || 0);
      state.active = parsed.active || 'paused';
      state.currentSessionStart = parsed.currentSessionStart || null;

      if (state.active !== 'paused' && state.currentSessionStart) {
        var elapsed = Date.now() - state.currentSessionStart;
        if (elapsed > 0) {
          if (state.active === 'sleep') state.sleepMs += elapsed;
          else if (state.active === 'productivity') state.prodBaseMs += elapsed;
          else if (state.active === 'prod_high') state.prodHighMs += elapsed;
          else if (state.active === 'prod_low') state.prodLowMs += elapsed;
          else if (state.active === 'mandate') state.mandateBaseMs += elapsed;
          else if (state.active === 'mandate_univ') state.mandateUnivMs += elapsed;
          else if (state.active === 'mandate_cond') state.mandateCondMs += elapsed;
          else if (state.active === 'leisure') state.leisureBaseMs += elapsed;
          else if (state.active === 'leisure_break') state.leisureBreakMs += elapsed;
          else if (state.active === 'leisure_spare') state.leisureSpareMs += elapsed;
        }
        state.currentSessionStart = Date.now();
      }
    }
  } catch (err) {
    console.warn('Storage load error:', err);
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
        prodBaseMs: state.prodBaseMs,
        prodHighMs: state.prodHighMs,
        prodLowMs: state.prodLowMs,
        mandateBaseMs: state.mandateBaseMs,
        mandateUnivMs: state.mandateUnivMs,
        mandateCondMs: state.mandateCondMs,
        leisureBaseMs: state.leisureBaseMs,
        leisureBreakMs: state.leisureBreakMs,
        leisureSpareMs: state.leisureSpareMs,
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
    var pb = state.prodBaseMs;
    var ph = state.prodHighMs;
    var pl = state.prodLowMs;
    var mb = state.mandateBaseMs;
    var mu = state.mandateUnivMs;
    var mc = state.mandateCondMs;
    var lb = state.leisureBaseMs;
    var lbr = state.leisureBreakMs;
    var lsp = state.leisureSpareMs;

    if (state.active !== 'paused' && state.currentSessionStart) {
      var elapsed = now - state.currentSessionStart;
      if (elapsed > 0) {
        if (state.active === 'sleep') s += elapsed;
        else if (state.active === 'productivity') pb += elapsed;
        else if (state.active === 'prod_high') ph += elapsed;
        else if (state.active === 'prod_low') pl += elapsed;
        else if (state.active === 'mandate') mb += elapsed;
        else if (state.active === 'mandate_univ') mu += elapsed;
        else if (state.active === 'mandate_cond') mc += elapsed;
        else if (state.active === 'leisure') lb += elapsed;
        else if (state.active === 'leisure_break') lbr += elapsed;
        else if (state.active === 'leisure_spare') lsp += elapsed;
      }
    }

    return {
      sleep: s,
      prodTotal: pb + ph + pl, prodBase: pb, prodHigh: ph, prodLow: pl,
      mandateTotal: mb + mu + mc, mandateBase: mb, mandateUniv: mu, mandateCond: mc,
      leisureTotal: lb + lbr + lsp, leisureBase: lb, leisureBreak: lbr, leisureSpare: lsp
    };
  }

  function settleCurrentSession() {
    if (state.active !== 'paused' && state.currentSessionStart) {
      var now = Date.now();
      var elapsed = now - state.currentSessionStart;
      if (elapsed > 0) {
        if (state.active === 'sleep') state.sleepMs += elapsed;
        else if (state.active === 'productivity') state.prodBaseMs += elapsed;
        else if (state.active === 'prod_high') state.prodHighMs += elapsed;
        else if (state.active === 'prod_low') state.prodLowMs += elapsed;
        else if (state.active === 'mandate') state.mandateBaseMs += elapsed;
        else if (state.active === 'mandate_univ') state.mandateUnivMs += elapsed;
        else if (state.active === 'mandate_cond') state.mandateCondMs += elapsed;
        else if (state.active === 'leisure') state.leisureBaseMs += elapsed;
        else if (state.active === 'leisure_break') state.leisureBreakMs += elapsed;
        else if (state.active === 'leisure_spare') state.leisureSpareMs += elapsed;
      }
      state.currentSessionStart = now;
    }
  }

  function updateEl(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function render() {
    var totals = getComputedTotals();

    updateEl('displaySleep', formatTime(totals.sleep));
    updateEl('displayProd', formatTime(totals.prodTotal));
    updateEl('displayProdHigh', formatTime(totals.prodHigh));
    updateEl('displayProdLow', formatTime(totals.prodLow));

    updateEl('displayMandate', formatTime(totals.mandateTotal));
    updateEl('displayMandateUniv', formatTime(totals.mandateUniv));
    updateEl('displayMandateCond', formatTime(totals.mandateCond));

    updateEl('displayLeisure', formatTime(totals.leisureTotal));
    updateEl('displayLeisureBreak', formatTime(totals.leisureBreak));
    updateEl('displayLeisureSpare', formatTime(totals.leisureSpare));

    var isProdActive = (state.active === 'productivity' || state.active === 'prod_high' || state.active === 'prod_low');
    var isMandateActive = (state.active === 'mandate' || state.active === 'mandate_univ' || state.active === 'mandate_cond');
    var isLeisureActive = (state.active === 'leisure' || state.active === 'leisure_break' || state.active === 'leisure_spare');

    var setCls = function (id, cls) {
      var el = document.getElementById(id);
      if (el) el.className = cls;
    };

    setCls('cardSleep', 'parent-card solo-card' + (state.active === 'sleep' ? ' active-sleep' : ''));
    setCls('parentProdCard', 'parent-card composite-card' + (isProdActive ? ' parent-prod-running' : ''));
    setCls('parentMandateCard', 'parent-card composite-card' + (isMandateActive ? ' parent-mandate-running' : ''));
    setCls('parentLeisureCard', 'parent-card composite-card' + (isLeisureActive ? ' parent-leisure-running' : ''));

    setCls('cardProd', 'split-left' + (state.active === 'productivity' ? ' active-prod-base' : ''));
    setCls('cardProdHigh', 'sub-cell' + (state.active === 'prod_high' ? ' active-prod-high' : ''));
    setCls('cardProdLow', 'sub-cell' + (state.active === 'prod_low' ? ' active-prod-low' : ''));

    setCls('cardMandate', 'split-left' + (state.active === 'mandate' ? ' active-mandate-base' : ''));
    setCls('cardMandateUniv', 'sub-cell' + (state.active === 'mandate_univ' ? ' active-mandate-univ' : ''));
    setCls('cardMandateCond', 'sub-cell' + (state.active === 'mandate_cond' ? ' active-mandate-cond' : ''));

    setCls('cardLeisure', 'split-left' + (state.active === 'leisure' ? ' active-leisure-base' : ''));
    setCls('cardLeisureBreak', 'sub-cell' + (state.active === 'leisure_break' ? ' active-leisure-break' : ''));
    setCls('cardLeisureSpare', 'sub-cell' + (state.active === 'leisure_spare' ? ' active-leisure-spare' : ''));

    updateEl('badgeSleep', state.active === 'sleep' ? 'RUNNING' : 'PAUSED');
    updateEl('badgeProd', isProdActive ? 'RUNNING' : 'PAUSED');
    updateEl('badgeMandate', isMandateActive ? 'RUNNING' : 'PAUSED');
    updateEl('badgeLeisure', isLeisureActive ? 'RUNNING' : 'PAUSED');

    var switchBtn = document.getElementById('switchBtn');
    if (switchBtn) {
      if (state.active === 'paused') {
        switchBtn.textContent = 'Start Tracking';
      } else {
        var cleanName = state.active.replace('_', ' ').toUpperCase();
        switchBtn.textContent = 'Active: ' + cleanName + ' (Tap to Switch)';
      }
    }

    var grandTotal = totals.sleep + totals.prodTotal + totals.mandateTotal + totals.leisureTotal;
    var setWidth = function (id, w) {
      var el = document.getElementById(id);
      if (el) el.style.width = w;
    };

    if (grandTotal === 0) {
      setWidth('ratioSleep', '25%');
      setWidth('ratioProd', '25%');
      setWidth('ratioMandate', '25%');
      setWidth('ratioLeisure', '25%');

      setWidth('subBarProdHigh', '0%');
      setWidth('subBarProdLow', '0%');
      setWidth('subBarMandateUniv', '0%');
      setWidth('subBarMandateCond', '0%');
      setWidth('subBarLeisureBreak', '0%');
      setWidth('subBarLeisureSpare', '0%');

      updateEl('pctSleep', '0%');
      updateEl('pctProd', '0%');
      updateEl('pctProdHigh', '0%');
      updateEl('pctProdLow', '0%');
      updateEl('pctMandate', '0%');
      updateEl('pctMandateUniv', '0%');
      updateEl('pctMandateCond', '0%');
      updateEl('pctLeisure', '0%');
      updateEl('pctLeisureBreak', '0%');
      updateEl('pctLeisureSpare', '0%');
    } else {
      var sPct = Math.round((totals.sleep / grandTotal) * 100);
      var pPct = Math.round((totals.prodTotal / grandTotal) * 100);
      var mPct = Math.round((totals.mandateTotal / grandTotal) * 100);
      var lPct = Math.max(0, 100 - (sPct + pPct + mPct));

      setWidth('ratioSleep', sPct + '%');
      setWidth('ratioProd', pPct + '%');
      setWidth('ratioMandate', mPct + '%');
      setWidth('ratioLeisure', lPct + '%');

      updateEl('pctSleep', sPct + '%');
      updateEl('pctProd', pPct + '%');
      updateEl('pctMandate', mPct + '%');
      updateEl('pctLeisure', lPct + '%');

      var setSub = function (sub1, sub2, parentTotal, el1Id, el2Id, pct1Id, pct2Id) {
        if (parentTotal === 0) {
          setWidth(el1Id, '0%');
          setWidth(el2Id, '0%');
          updateEl(pct1Id, '0%');
          updateEl(pct2Id, '0%');
        } else {
          setWidth(el1Id, Math.round((sub1 / parentTotal) * 100) + '%');
          setWidth(el2Id, Math.round((sub2 / parentTotal) * 100) + '%');
          updateEl(pct1Id, Math.round((sub1 / grandTotal) * 100) + '%');
          updateEl(pct2Id, Math.round((sub2 / grandTotal) * 100) + '%');
        }
      };

      setSub(totals.prodHigh, totals.prodLow, totals.prodTotal, 'subBarProdHigh', 'subBarProdLow', 'pctProdHigh', 'pctProdLow');
      setSub(totals.mandateUniv, totals.mandateCond, totals.mandateTotal, 'subBarMandateUniv', 'subBarMandateCond', 'pctMandateUniv', 'pctMandateCond');
      setSub(totals.leisureBreak, totals.leisureSpare, totals.leisureTotal, 'subBarLeisureBreak', 'subBarLeisureSpare', 'pctLeisureBreak', 'pctLeisureSpare');
    }
  }

  function getFriendlyName(key) {
    var map = {
      sleep: 'Sleep', productivity: 'Productivity', prod_high: 'High', prod_low: 'Low',
      mandate: 'Mandate', mandate_univ: 'Universal', mandate_cond: 'Conditional',
      leisure: 'Leisure', leisure_break: 'Break', leisure_spare: 'Spare'
    };
    return map[key] || 'Category';
  }

  function openModal(target) {
    pendingTarget = target;
    var authPassInput = document.getElementById('authPassInput');
    var passError = document.getElementById('passError');
    var modalTitle = document.getElementById('modalTitle');
    var modalSubtitle = document.getElementById('modalSubtitle');
    var confirmModalBtn = document.getElementById('confirmModalBtn');
    var authModal = document.getElementById('authModal');

    if (authPassInput) authPassInput.value = '';
    if (passError) passError.classList.remove('show');

    if (target === 'reset') {
      if (modalTitle) modalTitle.textContent = 'Reset All 10 Timers?';
      if (modalSubtitle) modalSubtitle.textContent = 'Enter authorization password to reset all hours to zero:';
      if (confirmModalBtn) {
        confirmModalBtn.textContent = 'Verify & Reset';
        confirmModalBtn.className = 'btn btn-action-confirm danger-mode';
      }
    } else if (target === 'generic_switch') {
      if (modalTitle) modalTitle.textContent = 'Switch Category';
      if (modalSubtitle) modalSubtitle.textContent = 'Enter password for the category you want to activate:';
      if (confirmModalBtn) {
        confirmModalBtn.textContent = 'Activate';
        confirmModalBtn.className = 'btn btn-action-confirm';
      }
    } else {
      var friendly = getFriendlyName(target);
      if (modalTitle) modalTitle.textContent = 'Switch to ' + friendly;
      if (modalSubtitle) modalSubtitle.textContent = 'Enter password to activate ' + friendly + ':';
      if (confirmModalBtn) {
        confirmModalBtn.textContent = 'Activate ' + friendly;
        confirmModalBtn.className = 'btn btn-action-confirm';
      }
    }

    if (authModal) authModal.classList.add('active');
    setTimeout(function () {
      if (authPassInput) authPassInput.focus();
    }, 50);
  }

  function closeModal() {
    pendingTarget = null;
    var authPassInput = document.getElementById('authPassInput');
    var passError = document.getElementById('passError');
    var authModal = document.getElementById('authModal');
    if (authPassInput) authPassInput.value = '';
    if (passError) passError.classList.remove('show');
    if (authModal) authModal.classList.remove('active');
  }

  function executeAuthorizedAction() {
    var authPassInput = document.getElementById('authPassInput');
    var passError = document.getElementById('passError');
    if (!authPassInput) return;
    var entered = authPassInput.value.trim().toLowerCase();

    var showError = function () {
      if (passError) passError.classList.add('show');
      authPassInput.value = '';
      authPassInput.focus();
    };

    if (pendingTarget === 'reset') {
      if (entered === PASSWORDS.reset) {
        state.active = 'paused';
        state.sleepMs = 0;
        state.prodBaseMs = 0; state.prodHighMs = 0; state.prodLowMs = 0;
        state.mandateBaseMs = 0; state.mandateUnivMs = 0; state.mandateCondMs = 0;
        state.leisureBaseMs = 0; state.leisureBreakMs = 0; state.leisureSpareMs = 0;
        state.currentSessionStart = null;
        persist();
        render();
        closeModal();
      } else {
        showError();
      }
      return;
    }

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

  function initApp() {
    // Robust click delegation directly on container
    var container = document.querySelector('.widget-container');
    if (container) {
      container.addEventListener('click', function (e) {
        // Find nearest clickable target
        var targetEl = e.target.closest('[id]');
        if (!targetEl) return;

        var id = targetEl.id;

        if (id === 'cardSleep') {
          if (state.active !== 'sleep') openModal('sleep');
        } else if (id === 'cardProd') {
          if (state.active !== 'productivity') openModal('productivity');
        } else if (id === 'cardProdHigh') {
          if (state.active !== 'prod_high') openModal('prod_high');
        } else if (id === 'cardProdLow') {
          if (state.active !== 'prod_low') openModal('prod_low');
        } else if (id === 'cardMandate') {
          if (state.active !== 'mandate') openModal('mandate');
        } else if (id === 'cardMandateUniv') {
          if (state.active !== 'mandate_univ') openModal('mandate_univ');
        } else if (id === 'cardMandateCond') {
          if (state.active !== 'mandate_cond') openModal('mandate_cond');
        } else if (id === 'cardLeisure') {
          if (state.active !== 'leisure') openModal('leisure');
        } else if (id === 'cardLeisureBreak') {
          if (state.active !== 'leisure_break') openModal('leisure_break');
        } else if (id === 'cardLeisureSpare') {
          if (state.active !== 'leisure_spare') openModal('leisure_spare');
        } else if (id === 'switchBtn') {
          openModal('generic_switch');
        } else if (id === 'openResetBtn') {
          openModal('reset');
        } else if (id === 'cancelModalBtn') {
          closeModal();
        } else if (id === 'confirmModalBtn') {
          executeAuthorizedAction();
        } else if (id === 'authModal') {
          closeModal();
        }
      });
    }

    var authPassInput = document.getElementById('authPassInput');
    if (authPassInput) {
      authPassInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') executeAuthorizedAction();
      });
    }

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
      if (state.active !== 'paused') render();
    }, 200);

    render();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        console.warn('SW bypassed:', err);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();