/* The Lazy Creator Co. — homepage motion system
   Lenis (smooth momentum scroll) + Motion (reveals, parallax, micro-interactions).
   Degrades gracefully: without the CDN libs, everything stays visible. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var M = window.Motion || null;

  /* ---------- Smooth scroll (Lenis) ---------- */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- Nav scrolled state ---------- */
  var nav = document.querySelector('.nav');
  var onScroll = function () {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero on-load sequence: masked line-by-line reveal ---------- */
  var heroInner = document.querySelector('.hero-inner');

  function heroIntro() {
    if (!M || reduced) {
      document.querySelectorAll('.mask-line').forEach(function (el) { el.style.transform = 'none'; });
      document.querySelectorAll('[data-hero]').forEach(function (el) { el.style.opacity = '1'; });
      return;
    }
    var lines = document.querySelectorAll('.hero-title .mask-line');
    M.animate(lines, { y: ['115%', '0%'] }, {
      duration: 1.3,
      delay: M.stagger(0.16, { start: 0.25 }),
      easing: [0.16, 1, 0.3, 1]
    });
    M.animate('[data-hero="eyebrow"]', { opacity: [0, 1], y: [14, 0] }, { duration: 1, delay: 0.15, easing: 'ease-out' });
    M.animate('[data-hero="lede"]', { opacity: [0, 1], y: [24, 0] }, { duration: 1.1, delay: 0.95, easing: [0.22, 1, 0.36, 1] });
    M.animate('[data-hero="actions"]', { opacity: [0, 1], y: [24, 0] }, { duration: 1.1, delay: 1.15, easing: [0.22, 1, 0.36, 1] });
    M.animate('[data-hero="cue"]', { opacity: [0, 1] }, { duration: 1.2, delay: 1.6 });
  }

  /* ---------- Section scroll reveals ---------- */
  function reveals() {
    var singles = document.querySelectorAll('[data-reveal]');
    var groups = document.querySelectorAll('[data-reveal-stagger]');

    if (!M || reduced) return; // CSS leaves everything visible

    singles.forEach(function (el) {
      M.inView(el, function () {
        M.animate(el, { opacity: [0, 1], y: [44, 0] }, { duration: 1.1, easing: [0.22, 1, 0.36, 1] });
      }, { margin: '0px 0px -12% 0px' });
    });

    groups.forEach(function (group) {
      var kids = Array.prototype.slice.call(group.children);
      M.inView(group, function () {
        M.animate(kids, { opacity: [0, 1], y: [52, 0] }, {
          duration: 1.1,
          delay: M.stagger(0.12),
          easing: [0.22, 1, 0.36, 1]
        });
      }, { margin: '0px 0px -10% 0px' });
    });
  }

  /* Initial hidden state for reveal targets (only when JS + Motion run) */
  if (M && !reduced) {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.style.opacity = '0'; });
    document.querySelectorAll('[data-reveal-stagger]').forEach(function (g) {
      Array.prototype.slice.call(g.children).forEach(function (el) { el.style.opacity = '0'; });
    });
  }

  /* ---------- Hero: mouse 3D tilt + layered parallax ---------- */
  function heroParallax() {
    if (reduced || !heroInner || !window.matchMedia('(pointer: fine)').matches) return;
    var hero = document.querySelector('.hero');
    var layers = document.querySelectorAll('.hero [data-depth]');
    var tx = 0, ty = 0, cx = 0, cy = 0;

    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener('mouseleave', function () { tx = 0; ty = 0; });

    (function tick() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      heroInner.style.transform =
        'rotateY(' + (cx * 4) + 'deg) rotateX(' + (-cy * 3) + 'deg)';
      layers.forEach(function (l) {
        if (l === heroInner) return;
        var d = parseFloat(l.getAttribute('data-depth')) || 0.2;
        l.style.translate = (cx * -60 * d) + 'px ' + (cy * -44 * d) + 'px';
      });
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- Hero: scroll parallax exit ---------- */
  function heroScrollOut() {
    if (!M || reduced) return;
    M.scroll(
      M.animate('.hero-inner', { opacity: [1, 0], y: [0, 90], scale: [1, 0.96] }),
      { target: document.querySelector('.hero'), offset: ['start start', 'end start'] }
    );
  }

  /* ---------- Spotlight cursor on cards ---------- */
  function spotlights() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    document.querySelectorAll('.spot').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    heroIntro();
    reveals();
    heroParallax();
    heroScrollOut();
    spotlights();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

/* ---------- Cursor comet: soft glowing tail follows the pointer in the hero ---------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;
  var hero = document.querySelector('.hero');
  if (!hero) return;

  var wrap = document.createElement('div');
  wrap.className = 'cursor-comet';
  wrap.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wrap);

  var N = 7, dots = [];
  for (var i = 0; i < N; i++) {
    var s = document.createElement('span');
    var size = 30 - i * 3.4;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    wrap.appendChild(s);
    dots.push({ el: s, x: -100, y: -100, size: size });
  }

  var mx = -100, my = -100, active = false;
  window.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY; active = true;
    var hot = e.target && e.target.closest && e.target.closest('.btn-amber, .btn-ghost');
    wrap.classList.toggle('hot', !!hot);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', function () { active = false; });

  (function tick() {
    var px = mx, py = my;
    for (var i = 0; i < N; i++) {
      var d = dots[i];
      d.x += (px - d.x) * 0.38;
      d.y += (py - d.y) * 0.38;
      d.el.style.transform = 'translate(' + (d.x - d.size / 2) + 'px,' + (d.y - d.size / 2) + 'px)';
      px = d.x; py = d.y;
    }
    var inHero = window.scrollY < hero.offsetHeight * 0.85;
    wrap.classList.toggle('on', active && inHero);
    requestAnimationFrame(tick);
  })();
})();

/* ---------- Comet whoosh: optional, off by default, toggle in the hero ---------- */
(function () {
  var btn = document.querySelector('[data-testid="sound-toggle"]');
  if (!btn || !window.AudioContext && !window.webkitAudioContext) return;

  var enabled = false;
  try { enabled = localStorage.getItem('tlc-sound') === 'on'; } catch (e) {}
  var actx = null;

  function paint() {
    btn.textContent = enabled ? 'Sound On' : 'Sound Off';
    btn.classList.toggle('on', enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  }
  paint();

  btn.addEventListener('click', function () {
    enabled = !enabled;
    try { localStorage.setItem('tlc-sound', enabled ? 'on' : 'off'); } catch (e) {}
    if (enabled && !actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    paint();
  });

  window.addEventListener('tlc:comet', function () {
    if (!enabled || !actx) return;
    var dur = 1.6;
    var len = Math.floor(actx.sampleRate * dur);
    var buf = actx.createBuffer(1, len, actx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = actx.createBufferSource();
    src.buffer = buf;
    var filt = actx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = 1.4;
    filt.frequency.setValueAtTime(280, actx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(2100, actx.currentTime + dur * 0.45);
    filt.frequency.exponentialRampToValueAtTime(240, actx.currentTime + dur);
    var gain = actx.createGain();
    gain.gain.setValueAtTime(0.0001, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, actx.currentTime + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    src.connect(filt); filt.connect(gain); gain.connect(actx.destination);
    src.start();
  });
})();
