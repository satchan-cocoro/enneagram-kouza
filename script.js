// All content is visible in the initial HTML; motion is progressive enhancement.
(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  const nodes = [...document.querySelectorAll('.questions p, .motive-map, .layer, .difference-next')];
  function configure() {
    observer?.disconnect();
    if (preference.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('observed');
        observer.unobserve(entry.target);
      }
    }, { threshold: .18 });
    nodes.filter(node => !node.classList.contains('observed')).forEach(node => observer.observe(node));
  }
  configure();
  preference.addEventListener('change', configure);
  window.addEventListener('pagehide', () => observer?.disconnect());
  window.addEventListener('pageshow', configure);
})();
