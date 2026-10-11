// One local Shaders composition per page; original art and CSS remain below it.
(() => {
  const script = document.querySelector('script[data-journal-shaders]');
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const embedded = root.classList.contains('journal-embedded');
  let surface = document.querySelector('[data-journal-light="hero"]');
  if (!surface) {
    const header = document.querySelector('.station-page-header, .page-header, .post-header');
    if (!header) return;
    header.classList.add('journal-lit-header');
    surface = document.createElement('div');
    surface.className = 'journal-shader-surface journal-shader-surface--paper';
    surface.dataset.journalLight = 'paper';
    surface.setAttribute('aria-hidden', 'true');
    const node = document.createElement('canvas');
    node.className = 'journal-shader-canvas';
    node.setAttribute('aria-hidden', 'true');
    surface.append(node);
    header.append(surface);
  }
  const canvas = surface.querySelector('.journal-shader-canvas');
  const hero = surface.dataset.journalLight === 'hero';
  let renderer = null;
  let starting = false;
  let generation = 0;
  let disposed = false;
  let inView = true;
  let pageHidden = false;
  let pointerFrame = 0;
  let pointerPoint;
  const dark = () => root.dataset.theme === 'dark';
  const fallback = reason => {
    surface.dataset.shaderState = 'fallback';
    surface.dataset.shaderReason = reason;
  };
  const paperColors = () => dark()
    ? [{ color: '#28232b', position: 0 }, { color: '#40313b', position: .45 }, { color: '#353d36', position: 1 }]
    : [{ color: '#f8deb9', position: 0 }, { color: '#f3d4d6', position: .45 }, { color: '#f5edcd', position: 1 }];
  const preset = () => hero ? {
    components: [{ type: 'Godrays', id: 'sunlight', props: {
      rayColor: dark() ? '#dfb6c4' : '#ffe5b4', backgroundColor: 'transparent',
      center: { x: .84, y: .02 }, density: .22, intensity: .55, spotty: .14, speed: .18,
    } }],
  } : {
    components: [
      { type: 'MeshGradient', id: 'paper', props: {
        stops: paperColors(), count: 4, smoothness: 3.5, variation: 0,
        swirl: .12, drift: .32, wrapping: 0, speed: .2, seed: 8,
      } },
      { type: 'LightLeak', id: 'light', props: {
        position: { x: .82, y: .24 }, spread: .7, intensity: .16, streaks: .18,
        colorHot: '#fff6d8', colorMid: '#eeb675', colorFringe: '#d9a0af',
        flicker: .08, speed: .22, seed: 12,
      } },
    ],
  };
  const reconcile = () => {
    if (!renderer) return;
    const paused = disposed || pageHidden || document.hidden || !inView || reduce.matches;
    paused ? renderer.pause() : renderer.resume();
    surface.dataset.shaderPaused = String(paused);
  };
  const resize = () => {
    if (!renderer) return;
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Soft light needs no retina framebuffer. Bound GPU work on large monitors.
    const scale = Math.min(fine.matches ? 1 : .85, 1200 / rect.width, 800 / rect.height);
    renderer.resize(Math.max(1, Math.round(rect.width * scale)), Math.max(1, Math.round(rect.height * scale)));
    // resize() also sets CSS pixels; keep the bounded buffer stretched over its art.
    canvas.style.removeProperty('width');
    canvas.style.removeProperty('height');
    reconcile();
  };
  const palette = () => {
    if (!renderer) return;
    if (hero) renderer.update('sunlight', { rayColor: dark() ? '#dfb6c4' : '#ffe5b4' });
    else renderer.update('paper', { stops: paperColors() });
  };
  async function start() {
    if (disposed || starting || renderer) return;
    if (embedded) { fallback('embedded'); return; }
    if (reduce.matches) { fallback('reduced-motion'); return; }
    if (navigator.connection?.saveData) { fallback('save-data'); return; }
    if (!navigator.gpu) { fallback('unsupported'); return; }
    starting = true;
    const token = ++generation;
    surface.dataset.shaderState = 'loading';
    const timeout = setTimeout(() => {
      if (generation !== token) return;
      ++generation; starting = false;
      renderer?.destroy(); renderer = null;
      fallback('timeout');
    }, 12000);
    try {
      const engineURL = new URL(script.dataset.engineSrc, location.href);
      if (engineURL.origin !== location.origin) throw new Error('Local shader bundle required');
      const { createShader } = await import(engineURL.href);
      if (token !== generation || disposed) return;
      const instance = await createShader(canvas, preset(), {
        disableTelemetry: true, observeElement: false,
        onReady() {
          if (token !== generation || disposed) return;
          surface.dataset.shaderState = 'ready';
          delete surface.dataset.shaderReason;
          if (renderer) resize();
        },
        onError(reason) { if (token === generation && !disposed) fallback(reason); },
      });
      if (token !== generation || disposed) { instance.destroy(); return; }
      renderer = instance;
      if (instance.getFailureReason()) fallback(instance.getFailureReason());
      else { palette(); resize(); reconcile(); }
    } catch {
      if (token === generation && !disposed) fallback('init-failed');
    } finally {
      clearTimeout(timeout);
      if (token === generation) starting = false;
    }
  }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(surface);
  if (!resizeObserver) addEventListener('resize', resize, { passive: true });
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting; reconcile();
  }, { threshold: 0 }) : null;
  visibilityObserver?.observe(surface);
  const themeObserver = new MutationObserver(palette);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('visibilitychange', reconcile);
  reduce.addEventListener('change', () => {
    if (reduce.matches) {
      ++generation; starting = false;
      renderer?.destroy(); renderer = null;
      cancelAnimationFrame(pointerFrame); pointerFrame = 0;
      fallback('reduced-motion');
    } else start();
  });
  if (hero) {
    const region = surface.closest('.cappu-home-shell');
    region.addEventListener('pointermove', event => {
      if (!renderer || !fine.matches || reduce.matches || event.pointerType === 'touch') return;
      pointerPoint = { x: event.clientX, y: event.clientY };
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!renderer) return;
        const rect = region.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (pointerPoint.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (pointerPoint.y - rect.top) / rect.height));
        renderer.update('sunlight', { center: { x: .82 + x * .04, y: y * .035 } });
      });
    }, { passive: true });
    region.addEventListener('pointerleave', () => {
      cancelAnimationFrame(pointerFrame); pointerFrame = 0;
      renderer?.update('sunlight', { center: { x: .84, y: .02 } });
    });
  }
  addEventListener('pagehide', event => {
    pageHidden = true;
    cancelAnimationFrame(pointerFrame); pointerFrame = 0;
    if (event.persisted) { reconcile(); return; }
    disposed = true; ++generation;
    renderer?.destroy(); renderer = null;
    resizeObserver?.disconnect(); visibilityObserver?.disconnect(); themeObserver.disconnect();
  });
  addEventListener('pageshow', () => { pageHidden = false; reconcile(); });
  // Let the cover and navigation paint before downloading the GPU engine.
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1400 });
  else setTimeout(start, 350);
})();
