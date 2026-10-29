(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  let active, timer, frame, panel;
  const element = (name, attrs = {}) => {
    const node = document.createElementNS(ns, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  const svgImage = content => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="${ns}" width="${innerWidth}" height="${innerHeight}" viewBox="0 0 ${innerWidth} ${innerHeight}">${content}</svg>`);
  const stop = () => {
    clearTimeout(timer); cancelAnimationFrame(frame);
    const current = active; active = null;
    current?.transition?.skipTransition();
    current?.svg?.remove(); current?.overlay?.remove();
    panel?.removeEventListener('close', stop); panel = null;
    delete root.dataset.journalGenjutsu;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
  };
  const cracks = (width, height) => {
    const cx = width * .57, cy = height * .43;
    let paths = '';
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9 + .17;
      const reach = Math.hypot(width, height) * .8;
      const points = [[cx, cy]];
      for (let j = 1; j <= 5; j++) {
        const distance = reach * j / 5;
        const bend = Math.sin(i * 8 + j * 3) * 15;
        points.push([cx + Math.cos(angle) * distance + bend, cy + Math.sin(angle) * distance - bend]);
      }
      paths += `<path d="M${points.map(point => point.join(',')).join('L')}"/>`;
      const [x, y] = points[1];
      paths += `<path d="M${x},${y}l${Math.cos(angle + .7) * reach * .17},${Math.sin(angle + .7) * reach * .17}"/>`;
    }
    return `<g fill="none" stroke="#08090c" stroke-width="2.8" stroke-linejoin="bevel">${paths}</g><g fill="none" stroke="#f8f9fb" stroke-width=".85">${paths}</g>`;
  };
  const buildFilter = () => {
    const width = innerWidth, height = innerHeight;
    const svg = element('svg', { width: 0, height: 0, 'aria-hidden': 'true', class: 'journal-genjutsu-defs' });
    const defs = element('defs');
    // Fragments leaving the viewport need no off-screen filter buffer.
    const filter = element('filter', { id: 'journal-genjutsu-fracture', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width, height, 'color-interpolation-filters': 'sRGB' });
    // A small coordinate map moves twelve panes of the real native page bitmap.
    const xs = [0, .22, .49, .77, 1], ys = [0, .32, .7, 1];
    const points = ys.map((y, row) => xs.map((x, col) => [width * x + (row && row < 3 && col && col < 4 ? Math.sin(row * 8 + col) * width * .025 : 0), height * y + (row && row < 3 && col && col < 4 ? Math.cos(row + col * 6) * height * .025 : 0)]));
    const offsets = [];
    const map = element('feImage', { x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'map' });
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = Math.min(320, width); mapCanvas.height = Math.round(mapCanvas.width * height / width);
    const brush = mapCanvas.getContext('2d');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
      const index = row * 4 + col;
      const polygon = [points[row][col], points[row][col + 1], points[row + 1][col + 1], points[row + 1][col]];
      const cx = (col + .5) / 4, cy = (row + .5) / 3;
      offsets.push({ path: new Path2D(`M${polygon.map(point => point.join(',')).join('L')}Z`), x: (cx - .5) * width * 2.4, y: (cy - .5) * height * 2.3, sign: index % 2 ? 1 : -1, delay: (index % 4) * .018 });
    }
    const paintMap = (travel, magnitude) => {
      brush.setTransform(mapCanvas.width / width, 0, 0, mapCanvas.height / height, 0, 0);
      brush.clearRect(0, 0, width, height);
      travel.forEach(({ piece, dx, dy }) => {
        brush.save(); brush.translate(dx, dy);
        brush.fillStyle = `rgb(${(0.5 - dx / magnitude) * 100}% ${(0.5 - dy / magnitude) * 100}% 0%)`;
        brush.fill(piece.path); brush.restore();
      });
      map.setAttribute('href', mapCanvas.toDataURL());
    };
    paintMap(offsets.map(piece => ({ piece, dx: 0, dy: 0 })), 1);
    filter.append(map);
    const displacement = element('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: 'shifted' });
    filter.append(displacement);
    filter.append(element('feComposite', { in: 'shifted', in2: 'map', operator: 'in', result: 'panes' }));
    filter.append(element('feImage', { href: svgImage(cracks(width, height)), x: 0, y: 0, width, height, result: 'cracks' }));
    const transfer = element('feComponentTransfer', { in: 'cracks', result: 'visible-cracks' });
    const crackAlpha = element('feFuncA', { type: 'linear', slope: 0 }); transfer.append(crackAlpha); filter.append(transfer);
    const result = element('feMerge'); result.append(element('feMergeNode', { in: 'panes' }), element('feMergeNode', { in: 'visible-cracks' }));
    filter.append(result); defs.append(filter); svg.append(defs); root.append(svg);
    return { svg, offsets, crackAlpha, displacement, paintMap };
  };
  const animateSnapshot = transition => {
    const pieces = buildFilter();
    const run = active = { ...pieces, transition };
    root.dataset.journalGenjutsu = 'breaking';
    root.classList.add('journal-genjutsu-ready');
    window.journalGenjutsuHandled = true;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
    transition.ready.then(() => {
      if (active !== run || reduce.matches || document.hidden) { stop(); return; }
      const start = performance.now();
      const draw = now => {
        if (active !== run) return;
        const progress = Math.max(0, Math.min(1, (now - start) / 1250));
        run.crackAlpha.setAttribute('slope', Math.min(1, Math.max(0, (progress - .1) / .16)) * (1 - Math.max(0, (progress - .55) / .45)));
        const travel = run.offsets.map(piece => {
          const cut = Math.max(0, Math.min(1, (progress - .19 - piece.delay) / .18));
          const burst = Math.pow(Math.max(0, (progress - .4 - piece.delay) / .53), 2.2);
          return { piece, dx: piece.sign * cut * innerWidth * .025 + piece.x * burst, dy: -piece.sign * cut * innerHeight * .018 + piece.y * burst };
        });
        const magnitude = Math.max(1, ...travel.flatMap(item => [Math.abs(item.dx), Math.abs(item.dy)])) * 2.04;
        run.displacement.setAttribute('scale', magnitude);
        run.paintMap(travel, magnitude);
        if (progress < 1) frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => { if (active === run) stop(); });
    transition.finished.then(() => { if (active === run) stop(); }).catch(() => { if (active === run) stop(); });
    timer = setTimeout(stop, 1800);
    return true;
  };
  const fallback = target => {
    stop();
    if (target) { panel = target; panel.addEventListener('close', stop, { once: true }); }
    const overlay = element('svg', { class: 'journal-genjutsu-fallback', viewBox: `0 0 ${innerWidth} ${innerHeight}`, 'aria-hidden': 'true' });
    overlay.innerHTML = cracks(innerWidth, innerHeight);
    (document.body || root).append(overlay); active = { overlay };
    root.dataset.journalGenjutsu = 'fallback';
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
    timer = setTimeout(stop, 760);
  };
  window.JournalGenjutsu = {
    get active() { return !!active || !!root.dataset.journalGenjutsu; },
    intro() {
      stop(); root.dataset.journalGenjutsu = 'out';
      document.dispatchEvent(new CustomEvent('journal:transition-motion'));
    },
    reveal(event) {
      if (root.dataset.journalGenjutsu !== 'pending' || !event.viewTransition || reduce.matches || document.hidden) return false;
      window.journalPageTransition = event.viewTransition.finished;
      try { return animateSnapshot(event.viewTransition); }
      catch {
        event.viewTransition.ready.catch(() => {});
        event.viewTransition.skipTransition(); fallback(); return true;
      }
    },
    local(target) {
      stop(); if (reduce.matches || document.hidden) return;
      if (target) { panel = target; panel.addEventListener('close', stop, { once: true }); }
      if (!document.startViewTransition) { fallback(target); return; }
      root.dataset.journalGenjutsu = 'intro';
      timer = setTimeout(() => {
        const transition = document.startViewTransition(() => { root.dataset.journalGenjutsu = 'breaking'; });
        try { animateSnapshot(transition); }
        catch { transition.ready.catch(() => {}); transition.skipTransition(); fallback(target); }
      }, 120);
    },
    stop
  };
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') stop(); });
  reduce.addEventListener('change', () => { if (reduce.matches) stop(); });
})();
