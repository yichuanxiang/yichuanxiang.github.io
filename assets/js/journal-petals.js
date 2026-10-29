(() => {
  if (document.documentElement.classList.contains('journal-embedded')) return;
  const isHome = document.currentScript?.dataset.journalHome === 'true';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const arrivalKey = 'journal-petal-arrival';
  const historyKey = 'journal-transition-history';
  const effects = ['sakura', 'kamui', 'genjutsu'];
  let effectHistory;
  try {
    const saved = JSON.parse(sessionStorage.getItem(historyKey));
    if (effects.includes(saved?.effect) && Number.isInteger(saved.count) && saved.count >= 1 && saved.count <= 2) effectHistory = saved;
  } catch { /* Random transitions also work without storage. */ }
  const chooseEffect = () => {
    let effect = effects[Math.floor(Math.random() * effects.length)];
    // Keep it random, while avoiding a long run of the same effect.
    if (effectHistory?.effect === effect && effectHistory.count >= 2) {
      const alternatives = effects.filter(value => value !== effect);
      effect = alternatives[Math.floor(Math.random() * alternatives.length)];
    }
    effectHistory = { effect, count: effectHistory?.effect === effect ? effectHistory.count + 1 : 1 };
    try { sessionStorage.setItem(historyKey, JSON.stringify(effectHistory)); } catch { /* Keep this page's history in memory. */ }
    return effect;
  };
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
  let sceneAnimations = [];
  let sceneTargets = [];
  let pendingNavigation;
  let panelFrame = 0;
  const clearRain = () => {
    clearTimeout(cleanupTimer);
    cancelAnimationFrame(rainFrame);
    rainFrame = 0;
    rainResizeObserver?.disconnect();
    rainResizeObserver = null;
    sceneAnimations.forEach(animation => animation.cancel());
    sceneAnimations = [];
    sceneTargets.forEach(({ target, origin, priority }) => {
      if (origin) target.style.setProperty('transform-origin', origin, priority);
      else target.style.removeProperty('transform-origin');
      target.classList.remove('journal-kamui-subject');
    });
    sceneTargets = [];
    delete document.documentElement.dataset.journalKamui;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
    activePanel?.removeEventListener('close', clearRain);
    activePanel = null;
    if (activeRain?.hasAttribute('popover') && activeRain.matches(':popover-open')) activeRain.hidePopover();
    activeRain?.remove();
    activeRain = null;
  };
  const createLayer = effect => {
    const layer = document.createElement('div');
    layer.className = 'journal-transition-layer';
    layer.dataset.effect = effect;
    layer.setAttribute('aria-hidden', 'true');
    // Decorations can cross the native dialog's edges without taking focus.
    if (typeof layer.showPopover === 'function') layer.setAttribute('popover', 'manual');
    return layer;
  };
  const mountLayer = (layer, panel, duration) => {
    (panel || document.body).append(layer);
    activeRain = layer;
    if (panel) {
      activePanel = panel;
      panel.addEventListener('close', clearRain, { once: true });
    }
    if (layer.hasAttribute('popover')) layer.showPopover();
    cleanupTimer = setTimeout(clearRain, duration + 150);
  };
  const rain = panel => {
    clearRain();
    if (reduce.matches || document.hidden) return;
    const layer = createLayer('sakura');
    layer.classList.add('journal-petal-rain');
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
    const duration = 3450;
    mountLayer(layer, panel, duration);
    resizeCanvas();
    if (typeof ResizeObserver === 'function') {
      rainResizeObserver = new ResizeObserver(resizeCanvas);
      rainResizeObserver.observe(layer);
    }
    const started = performance.now();
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
  };
  const kamui = (panel, options = {}) => {
    const mode = options.mode || 'local';
    const mobile = innerWidth <= 700;
    const direction = options.direction === -1 ? -1 : options.direction === 1 ? 1 : Math.random() < .5 ? -1 : 1;
    const focus = options.focus || { x: .52, y: .46 };
    const timings = { out: 520, in: 600, local: 1120 };
    const duration = timings[mode];
    const layer = createLayer('kamui');
    layer.dataset.phase = mode;
    const canvas = document.createElement('canvas');
    canvas.className = 'journal-kamui-canvas';
    layer.append(canvas);
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) { options.onFinish?.(); return; }
    let width, height, ratio, reach, folds;
    const resizeCanvas = () => {
      const box = layer.getBoundingClientRect();
      width = box.width;
      height = box.height;
      ratio = Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      reach = Math.hypot(width, height) * .84;
      // Compile the folds only when the viewport changes, not on every frame.
      folds = Array.from({ length: 6 }, (_, arm) => {
        const path = new Path2D();
        const edge = (t, side) => {
          const r = 12 + reach * Math.pow(t, 1.58);
          const a = arm * Math.PI / 3 + direction * (1 - t) * 6 + side * Math.sin(t * Math.PI) * .085;
          return [Math.cos(a) * r, Math.sin(a) * r * .92];
        };
        for (let i = 0; i <= 64; i++) {
          const point = edge(i / 64, 1);
          if (!i) path.moveTo(...point); else path.lineTo(...point);
        }
        for (let i = 64; i >= 0; i--) path.lineTo(...edge(i / 64, -1));
        path.closePath();
        return path;
      });
    };
    // Hold the collapsed frame while the browser starts the real navigation,
    // so a slower response cannot flash the departing page back into view.
    mountLayer(layer, panel, mode === 'out' ? 8000 : duration);
    document.documentElement.classList.add('journal-kamui-ready');
    document.documentElement.dataset.journalKamui = mode;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
    resizeCanvas();
    if (typeof ResizeObserver === 'function') {
      rainResizeObserver = new ResizeObserver(resizeCanvas);
      rainResizeObserver.observe(layer);
    }
    // Animate the real DOM, including its text and art. A spiral painted over a
    // stationary page cannot give the impression that space is being pulled in.
    const targets = panel ? [panel] : [...document.querySelectorAll('body > .header, body > .main, body > .footer, body > .music-player, body > .top-link')];
    const closeFraction = timings.out / timings.local;
    const smooth = value => value * value * (3 - 2 * value);
    // Dense samples of one continuous curve avoid velocity changes at keyframes.
    const keyframes = Array.from({ length: 61 }, (_, i) => {
      const progress = i / 60;
      const opening = mode === 'in' || (mode === 'local' && progress > closeFraction);
      const t = mode === 'local' ? opening ? (progress - closeFraction) / (1 - closeFraction) : progress / closeFraction : progress;
      const scale = opening ? .015 + .985 * (1 - Math.pow(1 - t, 3)) : 1 - .985 * Math.pow(t, 2.3);
      const turn = opening ? -92 * Math.pow(1 - t, 3) : 92 * Math.pow(t, 2.3);
      return { transform: `rotate(${direction * turn}deg) scale(${scale})`, opacity: opening ? smooth(Math.min(1, t * 3)) : 1 - smooth(Math.max(0, (t - .72) / .28)), offset: progress };
    });
    targets.forEach(target => {
      if (typeof target.animate !== 'function') return;
      const box = target.getBoundingClientRect();
      sceneTargets.push({ target, origin: target.style.getPropertyValue('transform-origin'), priority: target.style.getPropertyPriority('transform-origin') });
      target.style.transformOrigin = `${focus.x * width - box.left}px ${focus.y * height - box.top}px`;
      target.classList.add('journal-kamui-subject');
      sceneAnimations.push(target.animate(keyframes, { duration, easing: 'linear', fill: 'both' }));
    });
    // Radial threads move down a tightening spiral, accelerating as they reach
    // the same vanishing point as the page. No circles rotating in place.
    const threads = Array.from({ length: mobile ? 22 : 36 }, (_, index) => ({
      phase: index * 2.399963 + Math.random() * .25,
      start: Math.random(),
      speed: .65 + Math.random() * .7,
      weight: index % 6 === 0 ? 2.3 : .7 + Math.random() * .8,
      light: index % 4 === 0
    }));
    const started = performance.now();
    const render = now => {
      if (activeRain !== layer) return;
      const progress = Math.max(0, Math.min(1, (now - started) / duration));
      if (progress >= 1) {
        if (mode === 'out') {
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          context.fillStyle = '#0b0810';
          context.fillRect(0, 0, width, height);
        } else clearRain();
        options.onFinish?.();
        return;
      }
      const opening = mode === 'in' || (mode === 'local' && progress > closeFraction);
      const phase = mode === 'local' ? opening ? (progress - closeFraction) / (1 - closeFraction) : progress / closeFraction : progress;
      const grip = opening ? Math.pow(1 - phase, 1.15) : Math.pow(phase, 1.7);
      const pulse = opening ? Math.min(1, (1 - phase) * 3) : Math.min(1, phase * 5);
      const cover = opening ? Math.pow(Math.max(0, 1 - phase * 2.2), 2) : Math.pow(Math.max(0, (phase - .58) / .42), 2);
      const cx = width * focus.x, cy = height * focus.y;
      const core = (mobile ? 12 : 18) + grip * (mobile ? 24 : 35);
      const spinTime = (now - started + (mode === 'in' ? timings.out : 0)) / 1000;
      const rotation = direction * (spinTime * 3.8);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = `rgba(11,8,16,${cover})`;
      context.fillRect(0, 0, width, height);
      context.save();
      context.translate(cx, cy);
      const vignette = context.createRadialGradient(0, 0, core, 0, 0, reach);
      vignette.addColorStop(0, 'rgba(11,8,16,0)');
      vignette.addColorStop(.48, `rgba(24,18,30,${grip * .15})`);
      vignette.addColorStop(1, `rgba(11,8,16,${grip * .66})`);
      context.fillStyle = vignette;
      context.fillRect(-cx, -cy, width, height);
      const point = (distance, angle, edge = 0) => {
        const radius = core * .4 + reach * Math.pow(distance, 1.58);
        const turn = angle + rotation + direction * (1 - distance) * (4.5 + grip * 3.2) + edge;
        return [Math.cos(turn) * radius, Math.sin(turn) * radius * .92];
      };
      // Broad folds thicken near the black core, leaving the contracting page
      // visible between them until the final instant of the outgoing phase.
      context.save();
      context.rotate(rotation);
      for (const path of folds) {
        const fold = context.createRadialGradient(0, 0, core * .4, 0, 0, reach);
        fold.addColorStop(0, 'rgba(10,7,16,.95)');
        fold.addColorStop(.3, 'rgba(39,29,48,.64)');
        fold.addColorStop(1, 'rgba(67,49,78,0)');
        context.globalAlpha = pulse * .8;
        context.fillStyle = fold;
        context.fill(path);
      }
      context.restore();
      for (const thread of threads) {
        const travel = ((thread.start + (now - started) / 1000 * thread.speed * (.6 + grip * 1.2)) % 1);
        const distance = 1 - travel;
        context.beginPath();
        for (let step = 0; step <= 6; step++) {
          const t = Math.max(0, Math.min(1, distance + step / 6 * (.035 + grip * .08)));
          const p = point(t, thread.phase);
          if (step === 0) context.moveTo(...p); else context.lineTo(...p);
        }
        context.globalAlpha = pulse * Math.sin(distance * Math.PI) * (thread.light ? .65 : .42);
        context.strokeStyle = thread.light ? '#dfcdda' : '#50435f';
        context.lineWidth = thread.weight * (.55 + grip);
        context.stroke();
      }
      const abyss = context.createRadialGradient(0, 0, core * .25, 0, 0, core * 1.45);
      abyss.addColorStop(0, '#08060e');
      abyss.addColorStop(.64, 'rgba(12,8,20,.98)');
      abyss.addColorStop(1, 'rgba(38,23,51,0)');
      context.globalAlpha = pulse;
      context.fillStyle = abyss;
      context.beginPath();
      context.ellipse(0, 0, core * 1.45, core * 1.2, rotation, 0, Math.PI * 2);
      context.fill();
      context.restore();
      rainFrame = requestAnimationFrame(render);
    };
    rainFrame = requestAnimationFrame(render);
  };
  const transition = (panel, selected) => {
    clearRain();
    if (reduce.matches || document.hidden) return;
    const effect = selected?.effect || chooseEffect();
    if (effect === 'kamui') kamui(panel, { ...selected, mode: selected?.mode || 'local' });
    else if (effect === 'genjutsu' && window.JournalGenjutsu) window.JournalGenjutsu.local(panel);
    else rain(panel);
  };
  const readArrival = () => {
    let arrival;
    try {
      arrival = JSON.parse(sessionStorage.getItem(arrivalKey));
      sessionStorage.removeItem(arrivalKey);
    } catch { return false; }
    if (!arrival || Date.now() - arrival.at < 0 || Date.now() - arrival.at > 15000) return false;
    if (arrival.destination !== location.pathname + location.search) return false;
    if (!effects.includes(arrival.effect)) return { effect: chooseEffect() };
    const validFocus = Number.isFinite(arrival.focus?.x) && Number.isFinite(arrival.focus?.y);
    return {
      effect: arrival.effect,
      direction: arrival.direction === -1 ? -1 : 1,
      focus: validFocus ? { x: Math.max(.25, Math.min(.75, arrival.focus.x)), y: Math.max(.25, Math.min(.7, arrival.focus.y)) } : { x: .52, y: .46 },
      mode: arrival.effect === 'kamui' ? 'in' : 'local'
    };
  };
  const markedArrival = readArrival();
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  // Fresh inner-page entries also work with older cached pages that lack the marker.
  pendingArrival = navigationType !== 'reload' && navigationType !== 'back_forward' && (markedArrival || (!isHome && navigationType === 'navigate'));
  if (pendingArrival && markedArrival?.effect === 'kamui' && !reduce.matches && !document.hidden) document.documentElement.dataset.journalKamui = 'pending';
  const revealArrival = () => {
    cancelAnimationFrame(arrivalFrame);
    const generation = ++arrivalGeneration;
    if (!pendingArrival || document.hidden) return;
    if (markedArrival?.effect === 'genjutsu' && window.journalGenjutsuHandled) { pendingArrival = false; return; }
    if (reduce.matches) { pendingArrival = false; delete document.documentElement.dataset.journalKamui; return; }
    // Start on the new page after its transition, rather than spending the burst on a snapshot.
    arrivalFrame = requestAnimationFrame(() => {
      Promise.resolve(window.journalPageTransition).catch(() => {}).then(() => {
        if (generation !== arrivalGeneration) return;
        arrivalFrame = requestAnimationFrame(() => {
          arrivalFrame = 0;
          if (generation !== arrivalGeneration || !pendingArrival || document.hidden) return;
          pendingArrival = false;
          transition(null, markedArrival || undefined);
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
    if (!(panel instanceof HTMLDialogElement) || !panel.open) return;
    cancelAnimationFrame(panelFrame);
    // The desk also starts its own paper entrance in this event's task. Run
    // after that task and transform the dialog itself, preserving that entrance.
    panelFrame = requestAnimationFrame(() => {
      panelFrame = 0;
      if (panel.open) transition(panel);
    });
  });
  const removeArrival = () => { try { sessionStorage.removeItem(arrivalKey); } catch { /* Storage is optional. */ } };
  const warmed = new Set();
  const warmDestination = link => {
    if (!link || link.hasAttribute('download') || link.hasAttribute('data-desk-panel') || link.target || navigator.connection?.saveData) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || destination.pathname === location.pathname || destination.search || !destination.pathname.endsWith('/') || warmed.has(destination.href) || warmed.size >= 8) return;
    warmed.add(destination.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.as = 'document'; hint.href = destination.href;
    document.head.append(hint);
  };
  document.addEventListener('pointerover', event => warmDestination(event.target.closest('a[href]')), { passive: true });
  document.addEventListener('focusin', event => warmDestination(event.target.closest('a[href]')));
  document.addEventListener('touchstart', event => warmDestination(event.target.closest('a[href]')), { passive: true });
  const finishNavigation = () => {
    if (!pendingNavigation) return;
    const { href, timer } = pendingNavigation;
    pendingNavigation = null;
    clearTimeout(timer);
    location.assign(href);
  };
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || reduce.matches || document.hidden) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || link.hasAttribute('data-desk-panel') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, location.href);
    if (!['http:', 'https:'].includes(destination.protocol) || destination.origin !== location.origin || destination.pathname === location.pathname) return;
    if (pendingNavigation || window.JournalGenjutsu?.active) { event.preventDefault(); return; }
    const effect = chooseEffect();
    const selected = { effect, direction: Math.random() < .5 ? -1 : 1, focus: { x: .52, y: .46 } };
    // Select exactly once. The arrival reads this choice without another draw.
    try { sessionStorage.setItem(arrivalKey, JSON.stringify({ ...selected, destination: destination.pathname + destination.search, at: Date.now() })); } catch { /* Navigation still works when storage is unavailable. */ }
    if (effect === 'genjutsu' && window.JournalGenjutsu) {
      event.preventDefault(); warmDestination(link);
      window.JournalGenjutsu.intro();
      pendingNavigation = { href: destination.href, timer: setTimeout(finishNavigation, 140) };
      return;
    }
    if (effect !== 'kamui' || typeof document.querySelector('.main')?.animate !== 'function') return;
    event.preventDefault();
    warmDestination(link);
    pendingNavigation = { href: destination.href, timer: setTimeout(finishNavigation, 720) };
    try { transition(null, { ...selected, mode: 'out', onFinish: finishNavigation }); }
    catch { clearRain(); finishNavigation(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    pendingArrival = false;
    ++arrivalGeneration;
    cancelAnimationFrame(arrivalFrame); arrivalFrame = 0;
    cancelAnimationFrame(panelFrame); panelFrame = 0;
    if (pendingNavigation) {
      clearTimeout(pendingNavigation.timer);
      pendingNavigation = null;
      removeArrival();
    }
    clearRain();
  });
  window.addEventListener('pagehide', () => {
    pendingArrival = false;
    ++arrivalGeneration;
    cancelAnimationFrame(arrivalFrame);
    cancelAnimationFrame(panelFrame); panelFrame = 0;
    if (pendingNavigation) { clearTimeout(pendingNavigation.timer); pendingNavigation = null; }
    clearRain();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ++arrivalGeneration; cancelAnimationFrame(arrivalFrame);
      cancelAnimationFrame(panelFrame); panelFrame = 0;
      clearRain();
      finishNavigation();
    }
    else revealArrival();
  });
  reduce.addEventListener('change', () => {
    if (reduce.matches) {
      pendingArrival = false; ++arrivalGeneration; cancelAnimationFrame(arrivalFrame);
      cancelAnimationFrame(panelFrame); panelFrame = 0;
      clearRain(); finishNavigation();
    }
  });
})();
