/* The Lazy Creator Co. — cosmic starfield layer v2
   Living sky behind every page: twinkling stars, bright cross-flare stars,
   pulsing constellations, frequent glowing meteors, meteor-shower bursts,
   and a rare slow comet. Pure canvas, no images. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var nebulae = document.createElement('div');
  nebulae.className = 'nebulae';
  nebulae.setAttribute('aria-hidden', 'true');
  nebulae.innerHTML = '<div class="nebula nebula-a"></div><div class="nebula nebula-b"></div><div class="nebula nebula-c"></div><div class="nebula nebula-d"></div>';
  nebulae.insertAdjacentHTML('beforeend', '<div class="dist-planet"><span class="dist-planet-ring"></span><span class="dist-moon-orbit"><span class="dist-moon"></span></span></div>');

  /* tiny "stars caught" tally, persists between visits */
  var caught = 0;
  try { caught = parseInt(localStorage.getItem('tlc-caught') || '0', 10) || 0; } catch (e) {}
  /* Constellation reward: unlocked forever at 10 caught stars */
  var reward = null;
  var unlocked = false;
  try { unlocked = localStorage.getItem('tlc-constellation') === 'the-builders-dipper'; } catch (e) {}
  function buildReward() {
    reward = {
      pts: [[0.16, 0.30], [0.20, 0.22], [0.25, 0.18], [0.30, 0.24], [0.28, 0.33], [0.22, 0.38], [0.17, 0.35]],
      name: "THE BUILDER'S DIPPER"
    };
  }
  if (unlocked) buildReward();

  var counter = document.createElement('div');
  counter.className = 'star-counter';
  counter.setAttribute('data-testid', 'star-counter');
  document.body.appendChild(counter);
  function paintCounter() {
    counter.innerHTML = '\u2726 <b>' + caught + '</b> caught';
  }
  paintCounter();
  function bumpCounter() {
    caught++;
    if (caught >= 10 && !unlocked) {
      unlocked = true;
      try { localStorage.setItem('tlc-constellation', 'the-builders-dipper'); } catch (e) {}
      buildReward();
      var toast = document.createElement('div');
      toast.className = 'constellation-toast';
      toast.setAttribute('data-testid', 'constellation-toast');
      toast.innerHTML = '\u2726 Constellation unlocked: <b>The Builder\'s Dipper</b>';
      document.body.appendChild(toast);
      setTimeout(function () { toast.classList.add('show'); }, 30);
      setTimeout(function () { toast.classList.remove('show'); }, 5200);
    }
    try { localStorage.setItem('tlc-caught', String(caught)); } catch (e) {}
    paintCounter();
    counter.classList.remove('pop');
    void counter.offsetWidth;
    counter.classList.add('pop');
  }
  document.body.appendChild(nebulae);

  /* Per-page cosmic motif (each page gets its own live detail) */
  var MOTIFS = {
    products: '<span class="mo-orbit mo-o1"><i class="mo-dot mo-blue"></i></span><span class="mo-orbit mo-o2"><i class="mo-dot mo-amber"></i></span><span class="mo-orbit mo-o3"><i class="mo-dot mo-white"></i></span>',
    websites: '<span class="mo-sat"></span>',
    blog: '<span class="mo-fall f1"></span><span class="mo-fall f2"></span><span class="mo-fall f3"></span><span class="mo-fall f4"></span><span class="mo-fall f5"></span><span class="mo-fall f6"></span>',
    resources: '<span class="mo-ripple r1"></span><span class="mo-ripple r2"></span><span class="mo-ripple r3"></span>',
    toolbox: '<div class="mo-belt"></div>',
    about: '<div class="mo-aurora au-a"></div><div class="mo-aurora au-b"></div>',
    contact: '<span class="mo-ping p1"></span><span class="mo-ping p2"></span><span class="mo-ping p3"></span>',
    shop: '<span class="mo-ember e1"></span><span class="mo-ember e2"></span><span class="mo-ember e3"></span><span class="mo-ember e4"></span><span class="mo-ember e5"></span><span class="mo-ember e6"></span><span class="mo-ember e7"></span><span class="mo-ember e8"></span>',
    vault: '<span class="mo-swarm s1"><i></i></span><span class="mo-swarm s2"><i></i></span><span class="mo-swarm s3"><i></i></span><span class="mo-swarm s4"><i></i></span>'
  };
  var motifName = document.body.getAttribute('data-cosmos');
  if (motifName && MOTIFS[motifName]) {
    var motif = document.createElement('div');
    motif.className = 'cosmos-motif motif-' + motifName;
    motif.setAttribute('aria-hidden', 'true');
    motif.innerHTML = MOTIFS[motifName];
    document.body.appendChild(motif);
  }

  var canvas = document.createElement('canvas');
  canvas.className = 'cosmos';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var stars = [], flares = [], meteors = [], constellations = [], dust = [];
  var comet = null;
  var t0 = performance.now();
  var scrollY = 0;

  var STAR_COLORS = [
    { c: '255,255,255', w: 0.8 },
    { c: '191,217,255', w: 0.14 },
    { c: '247,180,120', w: 0.06 }
  ];

  function pickColor() {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < STAR_COLORS.length; i++) {
      acc += STAR_COLORS[i].w;
      if (r <= acc) return STAR_COLORS[i].c;
    }
    return STAR_COLORS[0].c;
  }

  function build() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var count = Math.min(380, Math.round((W * H) / 4600));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 1.4,
        r: 0.4 + Math.random() * 1.8,
        a: 0.4 + Math.random() * 0.6,
        sp: 0.4 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        c: pickColor(),
        drift: 0.008 + Math.random() * 0.03
      });
    }

    flares = [];
    var fCount = Math.max(8, Math.round(W / 180));
    for (var j = 0; j < fCount; j++) {
      flares.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.7 + Math.random() * 1.6,
        len: 8 + Math.random() * 14,
        sp: 0.5 + Math.random() * 0.9,
        ph: Math.random() * Math.PI * 2,
        c: Math.random() < 0.7 ? '255,255,255' : (Math.random() < 0.6 ? '191,217,255' : '247,180,120')
      });
    }

    /* Constellations: chains of 3-4 flares linked by faint pulsing lines */
    constellations = [];
    var used = {};
    for (var k = 0; k < 3 && flares.length > 5; k++) {
      var seed = -1, tries = 0;
      while (tries++ < 30) {
        var cand = Math.floor(Math.random() * flares.length);
        if (!used[cand]) { seed = cand; break; }
      }
      if (seed < 0) continue;
      used[seed] = true;
      var chain = [seed];
      var cur = flares[seed];
      for (var n = 0; n < 2 + Math.floor(Math.random() * 2); n++) {
        var best = -1, bestD = 1e9;
        for (var m = 0; m < flares.length; m++) {
          if (used[m]) continue;
          var dx = flares[m].x - cur.x, dy = flares[m].y - cur.y;
          var d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = m; }
        }
        if (best < 0 || bestD > 460 * 460) break;
        used[best] = true;
        chain.push(best);
        cur = flares[best];
      }
      if (chain.length > 2) {
        constellations.push({ chain: chain, ph: Math.random() * Math.PI * 2, sp: 0.25 + Math.random() * 0.3 });
      }
    }
  }

  function spawnMeteor(burst) {
    var warm = Math.random() < 0.25;
    var fromTop = Math.random() < 0.6;
    meteors.push({
      x: fromTop ? Math.random() * W : -60,
      y: fromTop ? -40 : Math.random() * H * 0.35,
      vx: (2.5 + Math.random() * 4) * (Math.random() < 0.5 ? 1 : 1) * (fromTop ? (Math.random() < 0.5 ? 1 : -1) : 1),
      vy: 2.4 + Math.random() * 2.2,
      life: 1,
      decay: (burst ? 0.016 : 0.011) + Math.random() * 0.01,
      tail: 14 + Math.random() * 10,
      warm: warm,
      width: burst ? 1.8 : 1.5
    });
  }

  function spawnComet() {
    var vx = 1.5 + Math.random() * 0.7;
    comet = {
      x: -160,
      y: H * (0.12 + Math.random() * 0.2),
      vx: vx,
      vy: 0.35 + Math.random() * 0.25,
      r: 2.6
    };
    /* how long the comet actually takes to cross the whole viewport */
    var crossing = (W + 420) / (vx * 60);
    window.dispatchEvent(new CustomEvent('tlc:comet', { detail: { duration: crossing } }));
  }

  var nextMeteor = t0 + 1200;
  var nextShower = t0 + 9000 + Math.random() * 8000;
  var nextComet = t0 + 7000;

  function drawStar(s, t, par) {
    var y = ((s.y - par) % (H * 1.4) + H * 1.4) % (H * 1.4) - H * 0.2;
    var x = ((s.x + t * s.drift * 60) % W + W) % W;
    var tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
    var alpha = s.a * tw;
    if (alpha < 0.03) return;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + s.c + ',' + alpha.toFixed(3) + ')';
    ctx.shadowColor = 'rgba(' + s.c + ',' + (alpha * 0.95).toFixed(3) + ')';
    ctx.shadowBlur = s.r * 5;
    ctx.fill();
  }

  function drawFlare(f, t) {
    var tw = 0.5 + 0.5 * Math.sin(t * f.sp + f.ph);
    var alpha = 0.4 + 0.6 * tw;
    var len = f.len * (0.7 + 0.5 * tw);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.shadowColor = 'rgba(' + f.c + ',' + alpha.toFixed(3) + ')';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, f.r * (0.8 + 0.3 * tw), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + f.c + ',' + alpha.toFixed(3) + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(' + f.c + ',' + (alpha * 0.6).toFixed(3) + ')';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
    ctx.moveTo(0, -len); ctx.lineTo(0, len);
    ctx.stroke();
    ctx.restore();
  }

  function drawConstellations(t) {
    for (var i = 0; i < constellations.length; i++) {
      var con = constellations[i];
      var alpha = 0.06 + 0.09 * (0.5 + 0.5 * Math.sin(t * con.sp + con.ph));
      ctx.strokeStyle = 'rgba(148, 190, 255,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (var j = 0; j < con.chain.length; j++) {
        var f = flares[con.chain[j]];
        if (j === 0) ctx.moveTo(f.x, f.y); else ctx.lineTo(f.x, f.y);
      }
      ctx.stroke();
    }
  }

  function drawMeteor(m) {
    var head = m.warm ? '255,214,170' : '255,255,255';
    var mid = m.warm ? '247,151,63' : '140,190,255';
    var tailX = m.x - m.vx * m.tail, tailY = m.y - m.vy * m.tail;
    var grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
    grad.addColorStop(0, 'rgba(' + head + ',' + (0.95 * m.life).toFixed(3) + ')');
    grad.addColorStop(0.25, 'rgba(' + mid + ',' + (0.55 * m.life).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(' + mid + ',0)');
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = m.width;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(' + mid + ',' + (0.8 * m.life).toFixed(3) + ')';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + head + ',' + (0.95 * m.life).toFixed(3) + ')';
    ctx.fill();
    ctx.restore();
  }

  function drawComet(c) {
    var tailLen = 90;
    var tailX = c.x - c.vx * tailLen, tailY = c.y - c.vy * tailLen;
    var grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
    grad.addColorStop(0, 'rgba(255,244,220,0.9)');
    grad.addColorStop(0.15, 'rgba(247,180,120,0.5)');
    grad.addColorStop(0.5, 'rgba(140,190,255,0.18)');
    grad.addColorStop(1, 'rgba(140,190,255,0)');
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(247,180,120,0.85)';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();
    var glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 16);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.4, 'rgba(247,180,120,0.5)');
    glow.addColorStop(1, 'rgba(247,180,120,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* Stardust burst + meteor catching (Easter egg: click a shooting star) */
  function burst(x, y, warm) {
    for (var i = 0; i < 42; i++) {
      var ang = Math.random() * Math.PI * 2;
      var sp = 0.6 + Math.random() * 4.4;
      dust.push({
        x: x, y: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 0.6,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        r: 0.8 + Math.random() * 1.8,
        c: warm ? (Math.random() < 0.5 ? '247,180,120' : '255,255,255')
                : (Math.random() < 0.6 ? '191,217,255' : '255,255,255')
      });
    }
  }

  function tryCatch(x, y) {
    var i, m, dx, dy;
    for (i = meteors.length - 1; i >= 0; i--) {
      m = meteors[i];
      dx = m.x - x; dy = m.y - y;
      if (dx * dx + dy * dy < 55 * 55) {
        burst(m.x, m.y, m.warm);
        meteors.splice(i, 1);
        bumpCounter();
        window.dispatchEvent(new CustomEvent('tlc:catch'));
        return true;
      }
    }
    if (comet) {
      dx = comet.x - x; dy = comet.y - y;
      if (dx * dx + dy * dy < 75 * 75) {
        burst(comet.x, comet.y, true);
        burst(comet.x, comet.y, false);
        comet = null;
        bumpCounter();
        bumpCounter();
        window.dispatchEvent(new CustomEvent('tlc:catch'));
        return true;
      }
    }
    return false;
  }

  window.addEventListener('pointerdown', function (e) {
    tryCatch(e.clientX, e.clientY);
  }, { passive: true });

  /* tiny public hook (also used by automated tests) */
  window.tlcCosmos = {
    burst: burst,
    meteorCount: function () { return meteors.length; },
    firstMeteor: function () { return meteors.length ? { x: meteors[0].x, y: meteors[0].y } : null; },
    caught: function () { return caught; }
  };

  function drawDust() {
    for (var i = dust.length - 1; i >= 0; i--) {
      var p = dust[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.035;
      p.vx *= 0.985; p.vy *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) { dust.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.c + ',' + (p.life * 0.9).toFixed(3) + ')';
      ctx.shadowColor = 'rgba(' + p.c + ',' + (p.life * 0.8).toFixed(3) + ')';
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function frame(now) {
    var t = (now - t0) / 1000;
    var par = scrollY * 0.08;
    ctx.clearRect(0, 0, W, H);
    var i;
    for (i = 0; i < stars.length; i++) drawStar(stars[i], t, par);
    ctx.shadowBlur = 0;
    drawConstellations(t);
    for (i = 0; i < flares.length; i++) drawFlare(flares[i], t);

    if (now > nextMeteor) {
      spawnMeteor(false);
      nextMeteor = now + 4400 + Math.random() * 1400;
    }
    if (now > nextShower) {
      var burst = 3 + Math.floor(Math.random() * 4);
      for (i = 0; i < burst; i++) {
        (function (delay) { setTimeout(function () { spawnMeteor(true); }, delay); })(i * (220 + Math.random() * 300));
      }
      nextShower = now + 16000 + Math.random() * 14000;
    }
    if (now > nextComet) {
      spawnComet();
      nextComet = now + 23000 + Math.random() * 4000;
    }
    for (i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= m.decay;
      if (m.life <= 0 || m.y > H + 120 || m.x > W + 160 || m.x < -200) { meteors.splice(i, 1); continue; }
      drawMeteor(m);
    }
    if (comet) {
      comet.x += comet.vx; comet.y += comet.vy;
      if (comet.x > W + 260) { comet = null; } else { drawComet(comet); }
    }
    if (reward) {
      ctx.save();
      ctx.strokeStyle = 'rgba(247, 180, 120, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      var rp = reward.pts.map(function (q) { return [q[0] * W, q[1] * H]; });
      for (var ri = 0; ri < rp.length; ri++) {
        if (ri === 0) ctx.moveTo(rp[0][0], rp[0][1]); else ctx.lineTo(rp[ri][0], rp[ri][1]);
      }
      ctx.stroke();
      for (ri = 0; ri < rp.length; ri++) {
        var twk = 0.7 + 0.3 * Math.sin(t * 0.9 + ri);
        ctx.beginPath();
        ctx.arc(rp[ri][0], rp[ri][1], 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 226, 190,' + (0.85 * twk).toFixed(3) + ')';
        ctx.shadowColor = 'rgba(247, 180, 120, 0.9)';
        ctx.shadowBlur = 12;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillStyle = 'rgba(247, 180, 120, 0.55)';
      ctx.fillText(reward.name, rp[0][0], rp[0][1] + 26);
      ctx.restore();
    }
    drawDust();
    requestAnimationFrame(frame);
  }

  function staticField() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) drawStar(stars[i], 1.3, 0);
    drawConstellations(1.1);
    for (var j = 0; j < flares.length; j++) drawFlare(flares[j], 1.1);
  }

  window.addEventListener('resize', function () {
    build();
    if (reduced) staticField();
  });
  window.addEventListener('scroll', function () { scrollY = window.scrollY; }, { passive: true });

  build();
  if (reduced) { staticField(); } else { requestAnimationFrame(frame); }
})();

/* ---------- Comet whoosh: optional, off by default, now global, every page ---------- */
(function () {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  /* homepage has a designed hero button; everywhere else gets a floating pill */
  var btn = document.querySelector('[data-testid="sound-toggle"]');
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sound-toggle-global';
    btn.setAttribute('data-testid', 'sound-toggle');
    document.body.appendChild(btn);
  }

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
    if (enabled) ensureCtx();
    paint();
  });

  /* Browsers suspend audio until a gesture: nudge resume on any interaction */
  window.addEventListener('pointerdown', function () {
    if (actx && actx.state === 'suspended') actx.resume();
  });

  function ensureCtx() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
    }
    if (actx.state === 'suspended') actx.resume();
  }

  /* FIX: on return visits the saved "Sound On" never recreated the audio
     engine, so comets played into a null context = silence. Create lazily. */
  function ready() {
    if (!enabled) return false;
    ensureCtx();
    return true;
  }


  window.addEventListener('tlc:comet', function (e) {
    if (!ready()) return;
    var now = actx.currentTime;
    /* persist for the comet's full crossing of the page */
    var dur = (e.detail && e.detail.duration) || 14;
    var peak = now + dur * 0.62;   /* closest approach */

    /* stereo field: the comet always travels left -> right, and the sound follows */
    var pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
    var out = actx.destination;
    if (pan) {
      pan.pan.setValueAtTime(-0.85, now);
      pan.pan.linearRampToValueAtTime(0.85, now + dur);
      pan.connect(out);
      out = pan;
    }

    /* engine drone: two detuned saws beating against each other, doppler pitch
       rising as it nears, dropping away as it passes */
    [0, 0.9].forEach(function (detune) {
      var osc = actx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(38 + detune, now);
      osc.frequency.linearRampToValueAtTime(92 + detune, peak);
      osc.frequency.exponentialRampToValueAtTime(30 + detune, now + dur);
      var lp = actx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(120, now);
      lp.frequency.exponentialRampToValueAtTime(700, peak);
      lp.frequency.exponentialRampToValueAtTime(140, now + dur);
      var g = actx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.setValueAtTime(0.0001, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.012, now + dur * 0.3);
      g.gain.exponentialRampToValueAtTime(0.075, peak);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(lp); lp.connect(g); g.connect(out);
      osc.start(now); osc.stop(now + dur);
    });

    /* rushing air layer: noise through a slowly opening filter, dragging on
       and swelling with the approach */
    var len = Math.floor(actx.sampleRate * dur);
    var buf = actx.createBuffer(1, len, actx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = actx.createBufferSource();
    src.buffer = buf;
    var filt = actx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.Q.value = 0.6;
    filt.frequency.setValueAtTime(220, now);
    filt.frequency.exponentialRampToValueAtTime(3400, peak);
    filt.frequency.exponentialRampToValueAtTime(300, now + dur);
    var gain = actx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.015, now + dur * 0.32);
    gain.gain.exponentialRampToValueAtTime(0.22, peak);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filt); filt.connect(gain); gain.connect(out);
    src.start();

    /* sub rumble that only really arrives when it's close */
    var sub = actx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(30, now);
    sub.frequency.linearRampToValueAtTime(52, peak);
    sub.frequency.exponentialRampToValueAtTime(24, now + dur);
    var sg = actx.createGain();
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.exponentialRampToValueAtTime(0.008, now + dur * 0.4);
    sg.gain.exponentialRampToValueAtTime(0.11, peak);
    sg.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    sub.connect(sg); sg.connect(out);
    sub.start(now); sub.stop(now + dur);
  });

  /* tiny chime when a visitor catches a shooting star */
  window.addEventListener('tlc:catch', function () {
    if (!ready()) return;
    var now = actx.currentTime;
    var osc = actx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1900, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.22);
    var g = actx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(g); g.connect(actx.destination);
    osc.start(now); osc.stop(now + 0.32);
  });
})();
