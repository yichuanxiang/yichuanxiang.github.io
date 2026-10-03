(() => {
  if (document.documentElement.classList.contains('journal-embedded')) return;
  const isHome = document.currentScript?.dataset.journalHome === 'true';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const arrivalKey = 'journal-petal-arrival';
  const petalContours = [
    'M4 -74C-4 -94 -28 -91 -48 -60C-78 -12 -40 52 -10 78C16 72 58 26 61 -19C61 -55 38 -88 17 -89L4 -74Z',
    'M7 -71C-6 -86 -31 -79 -48 -45C-74 9 -30 68 -6 82C25 58 61 9 54 -32C48 -67 31 -89 17 -84L7 -71Z',
    'M3 -73C-13 -85 -35 -60 -38 -27C-44 16 -15 60 10 78C25 39 46 -4 42 -32C37 -59 26 -82 13 -84L3 -73Z'
  ];
  let sprites;
  const makeSprites = () => petalContours.map(contour => [false, true].map(back => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 224;
    const brush = sprite.getContext('2d');
    brush.translate(112, 112);
    const shape = new Path2D(contour);
    const tissue = brush.createLinearGradient(-44, -70, 45, 76);
    tissue.addColorStop(0, back ? '#efb1c7' : '#fff7fb');
    tissue.addColorStop(.34, back ? '#e9a0bb' : '#fbe3ed');
    tissue.addColorStop(.72, back ? '#d789aa' : '#f2bdd3');
    tissue.addColorStop(1, back ? '#d48eaa' : '#e8a0bd');
    brush.fillStyle = tissue;
    brush.fill(shape);
    brush.save();
    brush.clip(shape);
    const foldedEdge = brush.createLinearGradient(20, 0, 60, 8);
    foldedEdge.addColorStop(0, 'rgba(205,119,154,0)');
    foldedEdge.addColorStop(.68, 'rgba(209,129,162,.10)');
    foldedEdge.addColorStop(1, 'rgba(181,98,138,.35)');
    brush.fillStyle = foldedEdge;
    brush.fillRect(-80, -100, 170, 195);
    brush.strokeStyle = 'rgba(255,250,253,.52)';
    brush.lineWidth = 1.25;
    brush.beginPath();
    brush.moveTo(15, -77);
    brush.bezierCurveTo(46, -47, 31, 20, -8, 74);
    brush.stroke();
    brush.strokeStyle = 'rgba(184,107,143,.09)';
    brush.lineWidth = .8;
    brush.beginPath();
    brush.moveTo(4, -65);
    brush.bezierCurveTo(-9, -18, 1, 30, -8, 67);
    brush.stroke();
    brush.restore();
    brush.strokeStyle = 'rgba(255,235,246,.18)';
    brush.lineWidth = .85;
    brush.stroke(shape);
    return sprite;
  }));
  let activeRain;
  let cleanupTimer;
  let activePanel;
  let pendingArrival = false;
  let arrivalFrame = 0;
  let arrivalGeneration = 0;
  let rainFrame = 0;
  let rainResizeObserver;
  const clearRain = () => {
    clearTimeout(cleanupTimer);
    cancelAnimationFrame(rainFrame);
    rainFrame = 0;
    rainResizeObserver?.disconnect();
    rainResizeObserver = null;
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
    const veil = document.createElement('span');
    veil.className = 'journal-petal-veil';
    layer.append(veil);
    const mobile = innerWidth <= 700;
    const softenNear = mobile && document.documentElement.dataset.theme === 'dark' ? .8 : 1;
    const canvas = document.createElement('canvas');
    canvas.className = 'journal-petal-canvas';
    layer.append(canvas);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    sprites ||= makeSprites();
    const wind = Math.random() < .5 ? -1 : 1;
    const petals = [];
    const counts = mobile ? [48, 38, 5] : [86, 62, 8];
    counts.forEach((count, depth) => {
      const columns = depth === 2 ? 3 : mobile ? 8 : 14;
      const rows = Math.ceil(count / columns);
      for (let index = 0; index < count; index++) {
        const counter = Math.random() < .06 ? -.25 : 1;
        petals.push({
          x: ((index % columns) + Math.random()) / columns * 1.32 - .16,
          y: (Math.floor(index / columns) + Math.random()) / rows * 1.35 - .2,
          depth,
          size: depth === 0 ? 5 + Math.random() * 7 : depth === 1 ? (mobile ? 16 : 20) + Math.random() * 16 : (mobile ? 66 : 90) + Math.random() * 55,
          drift: wind * counter * (depth === 0 ? .045 + Math.random() * .055 : depth === 1 ? .13 + Math.random() * .16 : .44 + Math.random() * .26),
          drop: depth === 0 ? .13 + Math.random() * .12 : depth === 1 ? .24 + Math.random() * .22 : .16 + Math.random() * .16,
          sway: depth === 0 ? .009 : depth === 1 ? .025 : .055,
          phase: Math.random() * Math.PI * 2,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() < .5 ? -1 : 1) * (.35 + Math.random() * 1.05),
          flip: .8 + Math.random() * 1.6,
          opacity: depth === 0 ? .24 + Math.random() * .2 : depth === 1 ? .6 + Math.random() * .22 : .45 + Math.random() * .18,
          variant: index % sprites.length,
          blur: depth === 2 ? 1.8 + Math.random() * 2.8 : depth === 0 && index % 3 === 0 ? .45 : 0
        });
      }
    });
    let width = 0;
    let height = 0;
    let ratio = 1;
    const resizeCanvas = () => {
      const box = layer.getBoundingClientRect();
      width = box.width;
      height = box.height;
      ratio = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    };
    (panel || document.body).append(layer);
    activeRain = layer;
    if (panel) {
      activePanel = panel;
      panel.addEventListener('close', clearRain, { once: true });
    }
    if (layer.hasAttribute('popover')) layer.showPopover();
    resizeCanvas();
    if (typeof ResizeObserver === 'function') {
      rainResizeObserver = new ResizeObserver(resizeCanvas);
      rainResizeObserver.observe(layer);
    }
    const started = performance.now();
    const duration = 3450;
    const render = now => {
      if (activeRain !== layer) return;
      const elapsed = now - started;
      const progress = Math.min(1, elapsed / duration);
      if (progress >= 1) { clearRain(); return; }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const seconds = elapsed / 1000;
      const gust = progress * 1.7 + Math.sin(progress * Math.PI) * .22;
      const enter = Math.min(1, elapsed / 240);
      const exit = Math.max(0, Math.min(1, (duration - elapsed) / 750));
      for (const petal of petals) {
        const x = (petal.x + petal.drift * gust + Math.sin(seconds * 1.3 + petal.phase) * petal.sway) * width;
        const y = (petal.y + petal.drop * seconds + Math.cos(seconds * 1.15 + petal.phase) * petal.sway * .6) * height;
        if (x < -petal.size || x > width + petal.size || y < -petal.size || y > height + petal.size) continue;
        const face = Math.cos(seconds * petal.flip + petal.phase);
        const roll = petal.angle + seconds * petal.spin + Math.sin(seconds * .9 + petal.phase) * .24;
        context.save();
        context.translate(x, y);
        context.rotate(roll);
        context.scale(Math.sign(face) * (.18 + Math.abs(face) * .82), 1);
        const edgeLight = petal.depth === 0 ? .45 + Math.abs(face) * .55 : .7 + Math.abs(face) * .3;
        context.globalAlpha = petal.opacity * enter * exit * edgeLight * (petal.depth === 2 ? softenNear : 1);
        context.filter = petal.blur ? `blur(${petal.blur}px)` : 'none';
        context.drawImage(sprites[petal.variant][face < 0 ? 1 : 0], -petal.size / 2, -petal.size / 2, petal.size, petal.size);
        context.restore();
      }
      rainFrame = requestAnimationFrame(render);
    };
    rainFrame = requestAnimationFrame(render);
    cleanupTimer = setTimeout(clearRain, duration + 150);
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
