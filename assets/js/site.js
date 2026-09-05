/* The Lazy Creator Co. — shared motion for inner pages (redesign rollout)
   Lenis smooth scroll + IntersectionObserver scroll reveals.
   Fully progressive: if anything fails, content stays visible. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  /* Lenis smooth momentum scrolling */
  if (window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* Kinetic hero titles: masked rise, same signature as the homepage */
  var heroH1 = document.querySelector('.hero h1');
  if (heroH1 && !heroH1.classList.contains('kt-done')) {
    heroH1.classList.add('kt-mask', 'kt-done');
    heroH1.innerHTML = '<span class="kt-line">' + heroH1.innerHTML + '</span>';
  }

  /* Scroll reveals: tag key blocks, then fade them up as they enter */
  var selector = [
    '.hero h1', '.hero .lede', '.hero-actions',
    '.section-label', '.section-title', '.section-intro',
    '.glass-frame', '.split-card', '.web-card', '.product-card',
    '.project-card', '.blog-post', '.tool-card', '.roadmap-phase',
    '.quote-block', '.scripture-block', '.grid-card', '.shelf',
    '.av-module-card', '.card-note', '.cs-cta', '.filter-tabs',
    '.product-cover', '.product-info', '.inquiry-form', '.toolbox-jump'
  ].join(',');

  var els = Array.prototype.slice.call(document.querySelectorAll(selector));
  if (!els.length || !('IntersectionObserver' in window)) return;

  /* Stagger siblings: delay by position within parent */
  els.forEach(function (el) {
    el.classList.add('rvl');
    var siblings = el.parentElement ? Array.prototype.slice.call(el.parentElement.children).filter(function (c) { return c.classList && c.classList.contains('rvl'); }) : [el];
    var idx = siblings.indexOf(el);
    el.style.transitionDelay = Math.min(idx * 90, 450) + 'ms';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('rvl-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

  els.forEach(function (el) { io.observe(el); });
})();
