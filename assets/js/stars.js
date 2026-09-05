/* The Lazy Creator Co. — cosmic starfield layer
   Fixed canvas of twinkling stars + bright flare stars + shooting stars,
   behind all content, above the black canvas. Pure JS, no images.
   Loaded on every page; degrades to a static field with reduced motion. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Nebula haze layers (pure CSS glows, drift slowly) */
  var nebulae = document.createElement('div');
  nebulae.className = 'nebulae';
  nebulae.setAttribute('aria-hidden', 'true');
  nebulae.innerHTML = '<div class="nebula nebula-a"></div><div class="nebula nebula-b"></div><div class="nebula nebula-c"></div>';
  document.body.appendChild(nebulae);

  var canvas = document.createElement('canvas');
  canvas.className = 'cosmos';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, DPR = 1;
  var stars = [], flares = [], meteors = [];
  var t0 = performance.now();
  var scrollY = 0;

  var STAR_COLORS = [
    { c: '255,255,255', w: 0.86 },
    { c: '191,217,255', w: 0.10 },
    { c: '247,180,120', w: 0.04 }
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

    var count = Math.min(340, Math.round((W * H) / 5200));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 1.4,       // extra depth for scroll parallax
        r: 0.4 + Math.random() * 1.7,
        a: 0.35 + Math.random() * 0.65,
        sp: 0.4 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
        c: pickColor(),
        drift: 0.008 + Math.random() * 0.03
      });
    }
    /* Bright flare stars with cross sparkle */
    flares = [];
    var fCount = Math.max(6, Math.round(W / 220));
    for (var j = 0; j < fCount; j++) {
      flares.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.6 + Math.random() * 1.4,
        len: 7 + Math.random() * 12,
        sp: 0.5 + Math.random() * 0.9,
        ph: Math.random() * Math.PI * 2,
        c: Math.random() < 0.75 ? '255,255,255' : '191,217,255'
      });
    }
  }

  function spawnMeteor() {
    var fromLeft = Math.random() < 0.5;
    meteors.push({
      x: fromLeft ? -60 : Math.random() * W,
      y: Math.random() * H * 0.4,
      vx: (fromLeft ? 1 : (Math.random() < 0.5 ? 1 : -1)) * (5 + Math.random() * 4),
      vy: 2.2 + Math.random() * 1.8,
      life: 1,
      decay: 0.014 + Math.random() * 0.012
    });
  }

  var nextMeteor = t0 + 3500;

  function drawStar(s, t, par) {
    var y = ((s.y - par) % (H * 1.4) + H * 1.4) % (H * 1.4) - H * 0.2;
    var x = ((s.x + t * s.drift * 60) % W + W) % W;
    var tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
    var alpha = s.a * tw;
    if (alpha < 0.03) return;
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + s.c + ',' + alpha.toFixed(3) + ')';
    ctx.shadowColor = 'rgba(' + s.c + ',' + (alpha * 0.9).toFixed(3) + ')';
    ctx.shadowBlur = s.r * 4;
    ctx.fill();
  }

  function drawFlare(f, t) {
    var tw = 0.5 + 0.5 * Math.sin(t * f.sp + f.ph);
    var alpha = 0.35 + 0.65 * tw;
    var len = f.len * (0.7 + 0.5 * tw);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.shadowColor = 'rgba(' + f.c + ',' + alpha.toFixed(3) + ')';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, f.r * (0.8 + 0.3 * tw), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + f.c + ',' + alpha.toFixed(3) + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(' + f.c + ',' + (alpha * 0.55).toFixed(3) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
    ctx.moveTo(0, -len); ctx.lineTo(0, len);
    ctx.stroke();
    ctx.restore();
  }

  function drawMeteor(m) {
    var grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12);
    grad.addColorStop(0, 'rgba(255,255,255,' + (0.85 * m.life).toFixed(3) + ')');
    grad.addColorStop(0.3, 'rgba(191,217,255,' + (0.4 * m.life).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(191,217,255,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * m.life).toFixed(3) + ')';
    ctx.fill();
  }

  function frame(now) {
    var t = (now - t0) / 1000;
    var par = scrollY * 0.08;
    ctx.clearRect(0, 0, W, H);
    var i;
    for (i = 0; i < stars.length; i++) drawStar(stars[i], t, par);
    ctx.shadowBlur = 0;
    for (i = 0; i < flares.length; i++) drawFlare(flares[i], t);

    if (now > nextMeteor) {
      spawnMeteor();
      nextMeteor = now + 4500 + Math.random() * 6000;
    }
    for (i = meteors.length - 1; i >= 0; i--) {
      var m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= m.decay;
      if (m.life <= 0 || m.y > H + 80) { meteors.splice(i, 1); continue; }
      drawMeteor(m);
    }
    requestAnimationFrame(frame);
  }

  function staticField() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) drawStar(stars[i], 1.3, 0);
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
