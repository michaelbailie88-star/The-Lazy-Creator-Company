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
  nebulae.insertAdjacentHTML('beforeend', '<div class="dist-planet"><span class="dist-planet-ring"></span></div>');

  /* tiny "stars caught" tally, persists between visits */
  var caught = 0;
  try { caught = parseInt(localStorage.getItem('tlc-caught') || '0', 10) || 0; } catch (e) {}
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
    try { localStorage.setItem('tlc-caught', String(caught)); } catch (e) {}
    paintCounter();
    counter.classList.remove('pop');
    void counter.offsetWidth;
    counter.classList.add('pop');
  }
  document.body.appendChild(nebulae);

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
    comet = {
      x: -160,
      y: H * (0.12 + Math.random() * 0.2),
      vx: 1.5 + Math.random() * 0.7,
      vy: 0.35 + Math.random() * 0.25,
      r: 2.6
    };
    window.dispatchEvent(new CustomEvent('tlc:comet'));
  }

  var nextMeteor = t0 + 1200;
  var nextShower = t0 + 9000 + Math.random() * 8000;
  var nextComet = t0 + 9000 + Math.random() * 8000;

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
    meteorCount: function () { return meteors.length; }
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
      nextMeteor = now + 2600 + Math.random() * 4200;
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
      nextComet = now + 24000 + Math.random() * 16000;
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
