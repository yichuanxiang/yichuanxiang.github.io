(() => {
  if (document.documentElement.classList.contains('journal-embedded')) return;
  const isHome = document.currentScript?.dataset.journalHome === 'true';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const arrivalKey = 'journal-petal-arrival';
  const petalShape = '<svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg"><path d="M12 29C3 23-2 13 3 5 6 0 9 1 12 5 15 1 18 0 21 5 26 13 21 23 12 29Z" fill="currentColor"/><path d="M12 8C9 15 10 22 12 27" fill="none" stroke="white" stroke-opacity=".32" stroke-width="1"/></svg>';
  let activeRain;
  let cleanupTimer;
  let activePanel;
  let pendingArrival = false;
  let arrivalFrame = 0;
  let arrivalGeneration = 0;
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
    const count = innerWidth <= 700 ? 18 : 32;
    let lastPetal = 0;
    for (let index = 0; index < count; index++) {
      const petal = document.createElement('span');
      petal.className = 'journal-petal';
      petal.innerHTML = petalShape;
      const x = (index + Math.random()) / count * 100;
      const direction = x < 15 ? 1 : x > 85 ? -1 : Math.random() < .5 ? -1 : 1;
      const drift = direction * (12 + Math.random() * 14);
      const delay = Math.random() * 500;
      const duration = 2800 + Math.random() * 1100;
      lastPetal = Math.max(lastPetal, delay + duration);
      petal.style.cssText = `--petal-x:${x}%;--petal-start:${-16 + Math.random() * 41}vh;--petal-size:${14 + Math.random() * 12}px;--petal-drift:${drift}vw;--petal-bend-one:${drift * .35 - 8 + Math.random() * 16}vw;--petal-bend-two:${drift * .7 - 10 + Math.random() * 20}vw;--petal-y-one:${30 + Math.random() * 18}vh;--petal-y-two:${64 + Math.random() * 18}vh;--petal-turn:${-90 + Math.random() * 180}deg;--petal-spin:${(Math.random() < .5 ? -1 : 1) * (100 + Math.random() * 150)}deg;--petal-flutter-duration:${850 + Math.random() * 650}ms;--petal-flutter-start:${-15 - Math.random() * 25}deg;--petal-flutter-end:${15 + Math.random() * 25}deg;--petal-delay:${delay}ms;--petal-duration:${duration}ms;--petal-opacity:${.6 + Math.random() * .2};--petal-color:${index % 3 === 0 ? '#f5b7c7' : index % 3 === 1 ? '#ed8da9' : '#f6a5bc'};`;
      layer.append(petal);
    }
    (panel || document.body).append(layer);
    activeRain = layer;
    if (panel) {
      activePanel = panel;
      panel.addEventListener('close', clearRain, { once: true });
    }
    if (layer.hasAttribute('popover')) layer.showPopover();
    cleanupTimer = setTimeout(clearRain, lastPetal + 100);
  };
  const readArrival = () => {
    let arrival;
    try {
      arrival = JSON.parse(sessionStorage.getItem(arrivalKey));
      sessionStorage.removeItem(arrivalKey);
    } catch { return false; }
    if (!arrival || Date.now() - arrival.at < 0 || Date.now() - arrival.at > 15000) return false;
    return arrival.destination === location.pathname + location.search;
  };
  const markedArrival = readArrival();
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  // Fresh inner-page entries also work with older cached pages that lack the marker.
  pendingArrival = navigationType !== 'reload' && navigationType !== 'back_forward' && (markedArrival || (!isHome && navigationType === 'navigate'));
  const revealArrival = () => {
    cancelAnimationFrame(arrivalFrame);
    const generation = ++arrivalGeneration;
    if (!pendingArrival || document.hidden) return;
    if (reduce.matches) { pendingArrival = false; return; }
    // Start on the new page after its transition, rather than spending the burst on a snapshot.
    arrivalFrame = requestAnimationFrame(() => {
      Promise.resolve(window.journalPageTransition).catch(() => {}).then(() => {
        if (generation !== arrivalGeneration) return;
        arrivalFrame = requestAnimationFrame(() => {
          arrivalFrame = 0;
          if (generation !== arrivalGeneration || !pendingArrival || document.hidden) return;
          pendingArrival = false;
          rain();
        });
      });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', revealArrival, { once: true });
  else revealArrival();
  window.addEventListener('pagereveal', revealArrival);
  window.addEventListener('pageshow', event => { if (!event.persisted) revealArrival(); });
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
    // Any section can lead to the next one; navigation itself stays immediate.
    try { sessionStorage.setItem(arrivalKey, JSON.stringify({ destination: destination.pathname + destination.search, at: Date.now() })); } catch { /* Navigation still works when storage is unavailable. */ }
  });
  window.addEventListener('pagehide', () => {
    pendingArrival = false;
    ++arrivalGeneration;
    cancelAnimationFrame(arrivalFrame);
    clearRain();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ++arrivalGeneration; cancelAnimationFrame(arrivalFrame); clearRain(); }
    else revealArrival();
  });
  reduce.addEventListener('change', () => {
    if (reduce.matches) { pendingArrival = false; ++arrivalGeneration; cancelAnimationFrame(arrivalFrame); clearRain(); }
  });
})();
