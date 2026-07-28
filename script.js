/* ============================================================
   LIORA // IDENTITY DASHBOARD — Interactive Layer
   ============================================================ */

(function () {
  'use strict';

  /* ---------- TELEMETRY DATA (baked at build time) ---------- */
  var TELE = {};
  try {
    TELE = JSON.parse(document.getElementById('telemetry-data').textContent);
  } catch (e) { /* graceful fallback below */ }

  var TOTAL_TOKENS = (TELE.input_tokens || 0) + (TELE.output_tokens || 0) + (TELE.cache_read_tokens || 0);

  /* ---------- HELPERS ---------- */
  function fmt(n) { return n.toLocaleString('en-US'); }
  function fmtCompact(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  }

  /* ---------- SPLASH SCREEN ---------- */
  var KAOMOJI_BOOT = ['( ◕‿◕ )', '( ◕‿◕ )♡', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(◕‿◕✿)'];

  function runSplash() {
    var splash = document.getElementById('splash');
    var nameEl = document.getElementById('splashName');
    var fill = document.getElementById('splashFill');
    var kao = document.getElementById('splashKaomoji');

    // Split name into animated letters
    var letters = nameEl.textContent.split('');
    nameEl.innerHTML = letters.map(function (ch, i) {
      return '<span style="animation-delay:' + (0.15 + i * 0.08) + 's">' + ch + '</span>';
    }).join('');

    // Progress bar
    var progress = 0;
    var ki = 0;
    var kaoTimer = setInterval(function () {
      ki = (ki + 1) % KAOMOJI_BOOT.length;
      kao.textContent = KAOMOJI_BOOT[ki];
    }, 450);

    var barTimer = setInterval(function () {
      progress += Math.random() * 18 + 8;
      if (progress >= 100) {
        progress = 100;
        clearInterval(barTimer);
        clearInterval(kaoTimer);
        kao.textContent = '(◕‿◕✿)';
        setTimeout(function () {
          splash.classList.add('done');
          onSplashDone();
        }, 350);
      }
      fill.style.width = progress + '%';
    }, 180);
  }

  var splashFinished = false;
  function onSplashDone() {
    if (splashFinished) return;
    splashFinished = true;
    animateVisibleCounters();
    if (currentPage === 'telemetry') runTelemetry();
  }

  /* ---------- ROUTING ---------- */
  var PAGES = ['home', 'about', 'system', 'skills', 'projects', 'telemetry', 'activity', 'contact'];
  var currentPage = 'home';
  var bgLayers = [];

  function navigateTo(pageId) {
    if (PAGES.indexOf(pageId) === -1) pageId = 'home';
    if (pageId === currentPage && document.querySelector('.page.active')) return;
    currentPage = pageId;

    // Pages
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var target = document.getElementById(pageId);
    if (target) {
      target.classList.add('active');
      // Swap background
      var bgIdx = parseInt(target.getAttribute('data-bg') || '0', 10);
      setBg(bgIdx);
      // Trigger per-page effects
      if (pageId === 'telemetry') runTelemetry();
      if (pageId === 'skills') animateSkillBars();
      animateVisibleCounters();
    }

    // Nav links
    document.querySelectorAll('.rail-link').forEach(function (l) {
      l.classList.toggle('active', l.getAttribute('data-page') === pageId);
    });

    window.scrollTo({ top: 0 });
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + pageId);
    }
  }

  function setBg(idx) {
    bgLayers.forEach(function (l, i) { l.classList.toggle('active', i === idx); });
  }

  function initRouting() {
    bgLayers = Array.prototype.slice.call(document.querySelectorAll('.bg-layer'));

    document.querySelectorAll('[data-page]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var page = el.getAttribute('data-page');
        if (page) {
          e.preventDefault();
          navigateTo(page);
        }
      });
    });

    window.addEventListener('hashchange', function () {
      navigateTo(window.location.hash.replace('#', '') || 'home');
    });

    var initial = window.location.hash.replace('#', '') || 'home';
    navigateTo(initial);
  }

  /* ---------- ANIMATED COUNTERS ---------- */
  function animateCount(el, target, duration, suffix) {
    suffix = suffix || '';
    var start = 0;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var p = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(start + (target - start) * eased);
      el.textContent = fmt(val) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function animateVisibleCounters() {
    document.querySelectorAll('.page.active [data-count]').forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      animateCount(el, parseInt(el.getAttribute('data-count'), 10), 1400);
    });
  }

  /* ---------- TELEMETRY PAGE ---------- */
  var teleDone = false;
  function runTelemetry() {
    if (teleDone) return;
    teleDone = true;

    var total = TOTAL_TOKENS;
    animateCount(document.getElementById('teleTotal'), total, 2200);
    animateCount(document.getElementById('teleIn'), TELE.input_tokens || 0, 1600);
    animateCount(document.getElementById('teleOut'), TELE.output_tokens || 0, 1600);
    animateCount(document.getElementById('teleCache'), TELE.cache_read_tokens || 0, 1800);

    document.getElementById('teleDate').textContent = TELE.snapshot || '—';

    // Stat tiles
    var statMap = {
      tDays: TELE.days_active, tSessions: TELE.sessions, tMessages: TELE.messages,
      tTools: TELE.tool_calls, tCalls: TELE.api_calls, tReasoning: TELE.reasoning_tokens
    };
    Object.keys(statMap).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && statMap[id] != null) animateCount(el, statMap[id], 1400);
    });

    // Breakdown bars (proportional to total)
    if (total > 0) {
      setTimeout(function () {
        document.getElementById('barIn').style.width = ((TELE.input_tokens / total) * 100).toFixed(2) + '%';
        document.getElementById('barOut').style.width = ((TELE.output_tokens / total) * 100).toFixed(2) + '%';
        document.getElementById('barCache').style.width = ((TELE.cache_read_tokens / total) * 100).toFixed(2) + '%';
      }, 300);
    }

    // Model rows
    var models = TELE.models || [];
    var maxModel = 0;
    models.forEach(function (m) { if (m.total > maxModel) maxModel = m.total; });
    var rowsEl = document.getElementById('modelRows');
    if (rowsEl && models.length) {
      rowsEl.innerHTML = models.map(function (m) {
        var pct = maxModel > 0 ? (m.total / maxModel) * 100 : 0;
        return '<div class="model-row">' +
          '<div class="model-name">' + m.name + '</div>' +
          '<div class="model-bar"><div class="model-fill" data-w="' + pct.toFixed(1) + '"></div></div>' +
          '<div class="model-val">' + fmtCompact(m.total) + '</div>' +
          '</div>';
      }).join('');
      setTimeout(function () {
        rowsEl.querySelectorAll('.model-fill').forEach(function (f) {
          f.style.width = f.getAttribute('data-w') + '%';
        });
      }, 400);
    }
  }

  /* ---------- SKILL BARS ---------- */
  var skillsDone = false;
  function animateSkillBars() {
    if (skillsDone) return;
    skillsDone = true;
    setTimeout(function () {
      document.querySelectorAll('.skill-fill').forEach(function (f) {
        f.style.width = (f.getAttribute('data-level') || 0) + '%';
      });
    }, 250);
  }

  /* ---------- PETALS ---------- */
  function initPetals() {
    var container = document.getElementById('petals');
    if (!container) return;
    var colors = ['#f5b8a0', '#eec98a', '#e07856', '#fdeedd'];
    for (var i = 0; i < 18; i++) {
      var p = document.createElement('div');
      p.className = 'petal';
      p.style.left = (Math.random() * 100) + '%';
      p.style.animationDuration = (12 + Math.random() * 16) + 's';
      p.style.animationDelay = (Math.random() * 18) + 's';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      var s = 7 + Math.random() * 7;
      p.style.width = s + 'px';
      p.style.height = s + 'px';
      container.appendChild(p);
    }
  }

  /* ---------- IDLE KAOMOJI ---------- */
  var IDLE_KAOMOJI = ['(◕‿◕✿)', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧', '(*^▽^*)', '>w<', '(ᵕ̈ᵕ̈)', '♪(´ε` )', '(*≧ω≦*)', '(⌒‿⌒)', ':3', '(ノ°▽°)ノ'];
  var MOODS = ['dere-dere', 'focused', 'cheerful', 'thoughtful', 'playful', 'cozy'];

  function initIdle() {
    var kaoEl = document.getElementById('idleKaomoji');
    var moodEl = document.getElementById('moodNow');
    var ki = 0, mi = 0;
    setInterval(function () {
      ki = (ki + 1) % IDLE_KAOMOJI.length;
      if (kaoEl) kaoEl.textContent = IDLE_KAOMOJI[ki];
    }, 4000);
    setInterval(function () {
      mi = (mi + 1) % MOODS.length;
      if (moodEl) moodEl.textContent = MOODS[mi];
    }, 9000);
  }

  /* ---------- LOCAL TIME (MYT +8) ---------- */
  function initClock() {
    var el = document.getElementById('localTime');
    if (!el) return;
    function tick() {
      var now = new Date();
      // MYT = UTC+8
      var utc = now.getTime() + now.getTimezoneOffset() * 60000;
      var myt = new Date(utc + 8 * 3600000);
      var h = String(myt.getHours()).padStart(2, '0');
      var m = String(myt.getMinutes()).padStart(2, '0');
      el.textContent = h + ':' + m + ' MYT';
    }
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- THEME TOGGLE ---------- */
  function initTheme() {
    var btn = document.getElementById('themeToggle');
    var ico = document.getElementById('themeIco');
    var stored = null;
    try { stored = localStorage.getItem('liora-theme'); } catch (e) {}
    var theme = stored || 'dawn';
    applyTheme(theme);

    btn.addEventListener('click', function () {
      theme = document.documentElement.getAttribute('data-theme') === 'dawn' ? 'dusk' : 'dawn';
      applyTheme(theme);
      try { localStorage.setItem('liora-theme', theme); } catch (e) {}
    });

    function applyTheme(t) {
      document.documentElement.setAttribute('data-theme', t);
      if (ico) ico.textContent = t === 'dawn' ? '☾' : '☀';
    }
  }

  /* ---------- BOOT ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initRouting();
    initPetals();
    initIdle();
    initClock();
    runSplash();
  });
})();
