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
    // Fractures enter from different edges; there is no single impact centre.
    let seed = 9347;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const starts = [[-.01, .18], [.24, -.01], [1.01, .28], [.79, 1.01], [-.01, .83], [1.01, .79]];
    const paths = [], hairlines = [];
    starts.forEach(([sx, sy], index) => {
      let x = sx * width, y = sy * height;
      const targetX = width * (.35 + random() * .3), targetY = height * (.3 + random() * .35);
      const angle = Math.atan2(targetY - y, targetX - x);
      const length = Math.hypot(targetX - x, targetY - y) * (.8 + random() * .5);
      const points = [[x, y]];
      for (let j = 0; j < 7; j++) {
        const heading = angle + (random() - .5) * .75;
        x += Math.cos(heading) * length / 7; y += Math.sin(heading) * length / 7;
        points.push([x, y]);
        if (j === 2 || j === 4) {
          let bx = x, by = y;
          const fork = [[bx, by]], direction = angle + (index % 2 ? 1 : -1) * (.6 + random() * .5);
          for (let k = 0; k < 3; k++) {
            const h = direction + (random() - .5) * .7;
            bx += Math.cos(h) * length * .07; by += Math.sin(h) * length * .07; fork.push([bx, by]);
          }
          paths.push(fork);
        }
      }
      paths.push(points);
      hairlines.push(points.slice(0, 4).map(([px, py], j) => [px + j * 2.3, py + j * 1.4]));
    });
    const lines = list => list.map(points => `<path d="M${points.map(point => point.join(',')).join('L')}"/>`).join('');
    return `<g fill="none" stroke="#f6f6f5" stroke-width="1.05" stroke-linejoin="miter">${lines(paths)}</g><g fill="none" stroke="#d6d6d4" stroke-width=".45" opacity=".6">${lines(hairlines)}</g>`;
  };
  const buildFilter = () => {
    const width = innerWidth, height = innerHeight;
    const svg = element('svg', { width: 0, height: 0, 'aria-hidden': 'true', class: 'journal-genjutsu-defs' });
    const defs = element('defs');
    // Fragments leaving the viewport need no off-screen filter buffer.
    const filter = element('filter', { id: 'journal-genjutsu-fracture', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width, height, 'color-interpolation-filters': 'sRGB' });
    // Unequal flat fragments, like the displaced cels in the reference.
    let seed = 4721;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    let cells = [{ x: 0, y: 0, width, height }];
    const count = width < 700 ? 46 : 58;
    while (cells.length < count) {
      let largest = 0;
      cells.forEach((cell, i) => { if (cell.width * cell.height > cells[largest].width * cells[largest].height) largest = i; });
      const cell = cells.splice(largest, 1)[0];
      const ratio = .28 + random() * .44;
      if (cell.width / width > cell.height / height * (random() > .35 ? 1 : .5)) {
        const cut = Math.round(cell.width * ratio);
        cells.push({ ...cell, width: cut }, { ...cell, x: cell.x + cut, width: cell.width - cut });
      } else {
        const cut = Math.round(cell.height * ratio);
        cells.push({ ...cell, height: cut }, { ...cell, y: cell.y + cut, height: cell.height - cut });
      }
    }
    const map = element('feImage', { x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'map' });
    const mapCanvas = document.createElement('canvas');
    const mapScale = Math.min(1, 360 / Math.max(width, height));
    mapCanvas.width = Math.round(width * mapScale); mapCanvas.height = Math.round(height * mapScale);
    const brush = mapCanvas.getContext('2d');
    const offsets = cells.map((cell, index) => {
      const cx = (cell.x + cell.width / 2) / width, cy = (cell.y + cell.height / 2) / height;
      const group = Math.min(3, Math.floor(cx * 4));
      const horizontal = index % 4 !== 0;
      const sign = (horizontal ? cx : cy) < .5 ? -1 : 1;
      return { ...cell, path: new Path2D(`M${cell.x},${cell.y}h${cell.width}v${cell.height}h${-cell.width}Z`),
        cutX: [1, -1, 1, -1][group] * width * (.032 + group * .009),
        cutY: [1, -1, -1, 1][group] * height * .024,
        x: horizontal ? sign * width * (1.1 + random() * .7) : (random() - .5) * width * .25,
        y: horizontal ? (random() - .5) * height * .32 : sign * height * (1.1 + random() * .65),
        delay: random() * .18, speed: .8 + random() * .35
      };
    });
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
    const poster = element('feComponentTransfer', { in: 'SourceGraphic', result: 'poster' });
    for (const channel of ['R', 'G', 'B']) poster.append(element(`feFunc${channel}`, { type: 'discrete', tableValues: '0 .12 .5 .76 1' }));
    filter.append(poster);
    filter.append(element('feImage', { href: svgImage(cracks(width, height)), x: 0, y: 0, width, height, result: 'cracks' }));
    const transfer = element('feComponentTransfer', { in: 'cracks', result: 'visible-cracks' });
    const crackAlpha = element('feFuncA', { type: 'linear', slope: 0 }); transfer.append(crackAlpha); filter.append(transfer);
    const etched = element('feMerge', { result: 'etched' });
    etched.append(element('feMergeNode', { in: 'poster' }), element('feMergeNode', { in: 'visible-cracks' }));
    filter.append(etched); displacement.setAttribute('in', 'etched'); filter.append(displacement);
    filter.append(element('feComposite', { in: 'shifted', in2: 'map', operator: 'in' }));
    defs.append(filter); svg.append(defs); root.append(svg);
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
        const progress = Math.max(0, Math.min(1, (now - start) / 1800));
        run.crackAlpha.setAttribute('slope', Math.min(1, Math.max(0, (progress - .13) / .12)));
        const travel = run.offsets.map(piece => {
          const cut = Math.max(0, Math.min(1, (progress - .23) / .15));
          const hold = cut * cut * (3 - 2 * cut);
          const scatter = Math.max(0, Math.min(1, (progress - .46 - piece.delay) / (.33 * piece.speed)));
          const burst = Math.pow(scatter, 2.05);
          return { piece, dx: piece.cutX * hold + piece.x * burst, dy: piece.cutY * hold + piece.y * burst };

        });
        const magnitude = Math.max(1, ...travel.flatMap(item => [Math.abs(item.dx), Math.abs(item.dy)])) * 2.04;
        run.displacement.setAttribute('scale', magnitude);
        run.paintMap(travel, magnitude);
        if (progress < 1) frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => { if (active === run) stop(); });
    transition.finished.then(() => { if (active === run) stop(); }).catch(() => { if (active === run) stop(); });
    timer = setTimeout(stop, 2400);
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
