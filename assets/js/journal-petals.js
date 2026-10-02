(() => {
  if (document.documentElement.classList.contains('journal-embedded')) return;
  const isHome = document.currentScript?.dataset.journalHome === 'true';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const arrivalKey = 'journal-petal-arrival';
  const petalShape = '<svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg"><path d="M12 29C3 23-2 13 3 5 6 0 9 1 12 5 15 1 18 0 21 5 26 13 21 23 12 29Z" fill="currentColor"/><path d="M12 8C9 15 10 22 12 27" fill="none" stroke="white" stroke-opacity=".32" stroke-width="1"/></svg>';
  let activeRain;
  let cleanupTimer;
  let activePanel;
  const clearRain = () => {
    clearTimeout(cleanupTimer);
    activePanel?.removeEventListener('close', clearRain);
    activePanel = null;
    if (activeRain?.hasAttribute('popover') && activeRain.matches(':popover-open')) activeRain.hidePopover();
    activeRain?.remove();
    activeRain = null;
  };
  const rain = panel => {
    clearRain();
    if (reduce.matches || document.hidden) return;
    const layer = document.createElement('div');
    layer.className = 'journal-petal-rain';
    layer.setAttribute('aria-hidden', 'true');
    // A manual popover puts decoration above the native dialog without taking focus.
    if (typeof layer.showPopover === 'function') layer.setAttribute('popover', 'manual');
    const count = innerWidth <= 700 ? 14 : 24;
    for (let index = 0; index < count; index++) {
      const petal = document.createElement('span');
      petal.className = 'journal-petal';
      petal.innerHTML = petalShape;
      petal.style.cssText = `--petal-x:${(index + Math.random()) / count * 100}%;--petal-start:${-20 + Math.random() * 35}vh;--petal-size:${12 + Math.random() * 12}px;--petal-drift:${-65 + Math.random() * 130}px;--petal-turn:${-70 + Math.random() * 140}deg;--petal-delay:${Math.random() * 300}ms;--petal-duration:${1800 + Math.random() * 400}ms;--petal-opacity:${.48 + Math.random() * .25};--petal-color:${index % 3 === 0 ? '#f5b7c7' : index % 3 === 1 ? '#ed8da9' : '#f6a5bc'};`;
      layer.append(petal);
    }
    (panel || document.body).append(layer);
    activeRain = layer;
    if (panel) {
      activePanel = panel;
      panel.addEventListener('close', clearRain, { once: true });
    }
    if (layer.hasAttribute('popover')) layer.showPopover();
    cleanupTimer = setTimeout(clearRain, 2600);
  };
  const consumeArrival = () => {
    let arrival;
    try {
      arrival = JSON.parse(sessionStorage.getItem(arrivalKey));
      sessionStorage.removeItem(arrivalKey);
    } catch { return; }
    if (!arrival || Date.now() - arrival.at < 0 || Date.now() - arrival.at > 15000) return;
    if (arrival.destination === location.pathname + location.search) rain();
  };
  consumeArrival();
  if (isHome) {
    window.addEventListener('journal:panel-open', event => {
      const panel = event.detail?.panel;
      if (panel instanceof HTMLDialogElement && panel.open) rain(panel);
    });
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || reduce.matches) return;
      const link = event.target.closest('a[href]');
      if (!link || link.hasAttribute('download') || link.dataset.deskPanel || (link.target && link.target !== '_self')) return;
      const destination = new URL(link.href, location.href);
      if (destination.origin !== location.origin || destination.pathname === location.pathname) return;
      // The destination page consumes this once; navigation itself stays immediate.
      try { sessionStorage.setItem(arrivalKey, JSON.stringify({ destination: destination.pathname + destination.search, at: Date.now() })); } catch { /* Navigation still works when storage is unavailable. */ }
    });
  }
  window.addEventListener('pagehide', clearRain);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearRain(); });
  reduce.addEventListener('change', () => { if (reduce.matches) clearRain(); });
})();
