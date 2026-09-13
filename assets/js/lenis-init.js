/* Lenis smooth-scroll init — kept independent of Motion/stars/home so it
   activates the moment its own library loads, without waiting on anything else. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && window.Lenis) {
    var lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    window.__tlcLenis = lenis;
    var raf = function (time) { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
})();
