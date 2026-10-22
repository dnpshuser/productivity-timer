(function () {
  'use strict';

  var STORAGE_KEY = 'stratified_stopwatch_state_v6';

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

  function initApp() {
    var cardSleep = document.getElementById('cardSleep');
    var parentProdCard = document.getElementById('parentProdCard');
    var parentMandateCard = document.getElementById('parentMandateCard');
    var parentLeisureCard = document.getElementById('parentLeisureCard');

    var cardProd = document.getElementById('cardProd');
    var cardProdHigh = document.getElementById('cardProdHigh');
    var cardProdLow = document.getElementById('cardProdLow');

    var cardMandate = document.getElementById('cardMandate');
    var cardMandateUniv = document.getElementById('cardMandateUniv');
    var cardMandateCond = document.getElementById('cardMandateCond');

    var cardLeisure = document.getElementById('cardLeisure');
    var cardLeisureBreak = document.getElementById('cardLeisureBreak');
    var cardLeisureSpare = document.getElementById('cardLeisureSpare');

    var badgeSleep = document.getElementById('badgeSleep');
    var badgeProd = document.getElementById('badgeProd');
    var badgeMandate = document.getElementById('badgeMandate');
    var badgeLeisure = document.getElementById('badgeLeisure');

    var displaySleep = document.getElementById('displaySleep');
    var displayProd = document.getElementById('displayProd');
    var displayProdHigh = document.getElementById('displayProdHigh');
    var displayProdLow = document.getElementById('displayProdLow');

    var displayMandate = document.getElementById('displayMandate');
    var displayMandateUniv = document.getElementById('displayMandateUniv');
    var displayMandateCond = document.getElementById('displayMandateCond');

    var displayLeisure = document.getElementById('displayLeisure');
    var displayLeisureBreak = document.getElementById('displayLeisureBreak');
    var displayLeisureSpare = document.getElementById('displayLeisureSpare');

    var ratioSleep = document.getElementById('ratioSleep');
    var ratioProd = document.getElementById('ratioProd');
    var ratioMandate = document.getElementById('ratioMandate');
    var ratioLeisure = document.getElementById('ratioLeisure');

    var subBarProdHigh = document.getElementById('subBarProdHigh');
    var subBarProdLow = document.getElementById('subBarProdLow');
    var subBarMandateUniv = document.getElementById('subBarMandateUniv');
    var subBarMandateCond = document.getElementById('subBarMandateCond');
    var subBarLeisureBreak = document.getElementById('subBarLeisureBreak');
    var subBarLeisureSpare = document.getElementById('subBarLeisureSpare');

    var pctSleep = document.getElementById('pctSleep');
    var pctProd = document.getElementById('pctProd');
    var pctProdHigh = document.getElementById('pctProdHigh');
    var pctProdLow = document.getElementById('pctProdLow');
    var pctMandate = document.getElementById('pctMandate');
    var pctMandateUniv = document.getElementById('pctMandateUniv');
    var pctMandateCond = document.getElementById('pctMandateCond');
    var pctLeisure = document.getElementById('pctLeisure');
    var pctLeisureBreak = document.getElementById('pctLeisureBreak');
    var pctLeisureSpare = document.getElementById('pctLeisureSpare');

    var switchBtn = document.getElementById('switchBtn');
    var openResetBtn = document.getElementById('openResetBtn');
    var cancelModalBtn = document.getElementById('cancelModalBtn');
    var confirmModalBtn = document.getElementById('confirmModalBtn');

    var authModal = document.getElementById('authModal');
    var authPassInput = document.getElementById('authPassInput');
    var passError = document.getElementById('passError');
    var modalTitle = document.getElementById('modalTitle');
    var modalSubtitle = document.getElementById('modalSubtitle');

    if (!cardSleep || !cardProd || !switchBtn) return;

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

      var totalProd = pb + ph + pl;
      var totalMandate = mb + mu + mc;
      var totalLeisure = lb + lbr + lsp;

      return {
        sleep: s,
        prodTotal: totalProd, prodBase: pb, prodHigh: ph, prodLow: pl,
        mandateTotal: totalMandate, mandateBase: mb, mandateUniv: mu, mandateCond: mc,
        leisureTotal: totalLeisure, leisureBase: lb, leisureBreak: lbr, leisureSpare: lsp
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

    function render() {
      var totals = getComputedTotals();

      displaySleep.textContent = formatTime(totals.sleep);
      displayProd.textContent = formatTime(totals.prodTotal);
      displayProdHigh.textContent = formatTime(totals.prodHigh);
      displayProdLow.textContent = formatTime(totals.prodLow);

      displayMandate.textContent = formatTime(totals.mandateTotal);
      displayMandateUniv.textContent = formatTime(totals.mandateUniv);
      displayMandateCond.textContent = formatTime(totals.mandateCond);

      displayLeisure.textContent = formatTime(totals.leisureTotal);
      displayLeisureBreak.textContent = formatTime(totals.leisureBreak);
      displayLeisureSpare.textContent = formatTime(totals.leisureSpare);

      var isProdActive = (state.active === 'productivity' || state.active === 'prod_high' || state.active === 'prod_low');
      var isMandateActive = (state.active === 'mandate' || state.active === 'mandate_univ' || state.active === 'mandate_cond');
      var isLeisureActive = (state.active === 'leisure' || state.active === 'leisure_break' || state.active === 'leisure_spare');

      cardSleep.className = 'parent-card solo-card' + (state.active === 'sleep' ? ' active-sleep' : '');
      parentProdCard.className = 'parent-card composite-card' + (isProdActive ? ' parent-prod-running' : '');
      parentMandateCard.className = 'parent-card composite-card' + (isMandateActive ? ' parent-mandate-running' : '');
      parentLeisureCard.className = 'parent-card composite-card' + (isLeisureActive ? ' parent-leisure-running' : '');

      cardProd.className = 'split-left' + (state.active === 'productivity' ? ' active-prod-base' : '');
      cardProdHigh.className = 'sub-cell' + (state.active === 'prod_high' ? ' active-prod-high' : '');
      cardProdLow.className = 'sub-cell' + (state.active === 'prod_low' ? ' active-prod-low' : '');

      cardMandate.className = 'split-left' + (state.active === 'mandate' ? ' active-mandate-base' : '');
      cardMandateUniv.className = 'sub-cell' + (state.active === 'mandate_univ' ? ' active-mandate-univ' : '');
      cardMandateCond.className = 'sub-cell' + (state.active === 'mandate_cond' ? ' active-mandate-cond' : '');

      cardLeisure.className = 'split-left' + (state.active === 'leisure' ? ' active-leisure-base' : '');
      cardLeisureBreak.className = 'sub-cell' + (state.active === 'leisure_break' ? ' active-leisure-break' : '');
      cardLeisureSpare.className = 'sub-cell' + (state.active === 'leisure_spare' ? ' active-leisure-spare' : '');

      badgeSleep.textContent = (state.active === 'sleep' ? 'RUNNING' : 'PAUSED');
      badgeProd.textContent = (isProdActive ? 'RUNNING' : 'PAUSED');
      badgeMandate.textContent = (isMandateActive ? 'RUNNING' : 'PAUSED');
      badgeLeisure.textContent = (isLeisureActive ? 'RUNNING' : 'PAUSED');

      if (state.active === 'paused') {
        switchBtn.textContent = 'Start Tracking';
      } else {
        var cleanName = state.active.replace('_', ' ').toUpperCase();
        switchBtn.textContent = 'Active: ' + cleanName + ' (Tap to Switch)';
      }

      // Grand total calculation for the 4 overarching domains
      var grandTotal = totals.sleep + totals.prodTotal + totals.mandateTotal + totals.leisureTotal;

      if (grandTotal === 0) {
        ratioSleep.style.width = '25%'; ratioProd.style.width = '25%';
        ratioMandate.style.width = '25%'; ratioLeisure.style.width = '25%';
        subBarProdHigh.style.width = '0%'; subBarProdLow.style.width = '0%';
        subBarMandateUniv.style.width = '0%'; subBarMandateCond.style.width = '0%';
        subBarLeisureBreak.style.width = '0%'; subBarLeisureSpare.style.width = '0%';
        pctSleep.textContent = '0%'; pctProd.textContent = '0%';
        pctProdHigh.textContent = '0%'; pctProdLow.textContent = '0%';
        pctMandate.textContent = '0%'; pctMandateUniv.textContent = '0%'; pctMandateCond.textContent = '0%';
        pctLeisure.textContent = '0%'; pctLeisureBreak.textContent = '0%'; pctLeisureSpare.textContent = '0%';
      } else {
        // Parent domain global percentages
        var sPct = Math.round((totals.sleep / grandTotal) * 100);
        var pPct = Math.round((totals.prodTotal / grandTotal) * 100);
        var mPct = Math.round((totals.mandateTotal / grandTotal) * 100);
        var lPct = Math.max(0, 100 - (sPct + pPct + mPct));

        ratioSleep.style.width = sPct + '%'; pctSleep.textContent = sPct + '%';
        ratioProd.style.width = pPct + '%'; pctProd.textContent = pPct + '%';
        ratioMandate.style.width = mPct + '%'; pctMandate.textContent = mPct + '%';
        ratioLeisure.style.width = lPct + '%'; pctLeisure.textContent = lPct + '%';

        // Nested sub-bars calculated relative to parent width (centered inside parent domain)
        var setSubBarWidths = function (sub1, sub2, parentTotal, el1, el2, pctEl1, pctEl2) {
          if (parentTotal === 0) {
            el1.style.width = '0%';
            el2.style.width = '0%';
            pctEl1.textContent = '0%';
            pctEl2.textContent = '0%';
          } else {
            var w1 = Math.round((sub1 / parentTotal) * 100);
            var w2 = Math.round((sub2 / parentTotal) * 100);
            el1.style.width = w1 + '%';
            el2.style.width = w2 + '%';
            // Global percentage for legend
            pctEl1.textContent = Math.round((sub1 / grandTotal) * 100) + '%';
            pctEl2.textContent = Math.round((sub2 / grandTotal) * 100) + '%';
          }
        };

        setSubBarWidths(totals.prodHigh, totals.prodLow, totals.prodTotal, subBarProdHigh, subBarProdLow, pctProdHigh, pctProdLow);
        setSubBarWidths(totals.mandateUniv, totals.mandateCond, totals.mandateTotal, subBarMandateUniv, subBarMandateCond, pctMandateUniv, pctMandateCond);
        setSubBarWidths(totals.leisureBreak, totals.leisureSpare, totals.leisureTotal, subBarLeisureBreak, subBarLeisureSpare, pctLeisureBreak, pctLeisureSpare);
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
      authPassInput.value = '';
      passError.classList.remove('show');

      if (target === 'reset') {
        modalTitle.textContent = 'Reset All 10 Timers?';
        modalSubtitle.textContent = 'Enter authorization password to reset all hours to zero:';
        confirmModalBtn.textContent = 'Verify & Reset';
        confirmModalBtn.className = 'btn btn-action-confirm danger-mode';
      } else if (target === 'generic_switch') {
        modalTitle.textContent = 'Switch Category';
        modalSubtitle.textContent = 'Enter password for the category you want to activate:';
        confirmModalBtn.textContent = 'Activate';
        confirmModalBtn.className = 'btn btn-action-confirm';
      } else {
        var friendly = getFriendlyName(target);
        modalTitle.textContent = 'Switch to ' + friendly;
        modalSubtitle.textContent = 'Enter password to activate ' + friendly + ':';
        confirmModalBtn.textContent = 'Activate ' + friendly;
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

    function showError() {
      passError.classList.add('show');
      authPassInput.value = '';
      authPassInput.focus();
    }

    cardSleep.addEventListener('click', function () { if (state.active !== 'sleep') openModal('sleep'); });
    cardProd.addEventListener('click', function () { if (state.active !== 'productivity') openModal('productivity'); });
    cardProdHigh.addEventListener('click', function () { if (state.active !== 'prod_high') openModal('prod_high'); });
    cardProdLow.addEventListener('click', function () { if (state.active !== 'prod_low') openModal('prod_low'); });

    cardMandate.addEventListener('click', function () { if (state.active !== 'mandate') openModal('mandate'); });
    cardMandateUniv.addEventListener('click', function () { if (state.active !== 'mandate_univ') openModal('mandate_univ'); });
    cardMandateCond.addEventListener('click', function () { if (state.active !== 'mandate_cond') openModal('mandate_cond'); });

    cardLeisure.addEventListener('click', function () { if (state.active !== 'leisure') openModal('leisure'); });
    cardLeisureBreak.addEventListener('click', function () { if (state.active !== 'leisure_break') openModal('leisure_break'); });
    cardLeisureSpare.addEventListener('click', function () { if (state.active !== 'leisure_spare') openModal('leisure_spare'); });

    switchBtn.addEventListener('click', function () { openModal('generic_switch'); });
    openResetBtn.addEventListener('click', function () { openModal('reset'); });
    cancelModalBtn.addEventListener('click', closeModal);
    confirmModalBtn.addEventListener('click', executeAuthorizedAction);

    authPassInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') executeAuthorizedAction();
    });

    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) closeModal();
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