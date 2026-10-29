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
  const toneForPage = () => {
    if (document.querySelector('dialog[open]')) return 'ink';
    let pictureArea = 0;
    document.querySelectorAll('img').forEach(img => {
      const box = img.getBoundingClientRect();
      pictureArea += Math.max(0, Math.min(innerWidth, box.right) - Math.max(0, box.left)) * Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top));
    });
    return pictureArea > innerWidth * innerHeight * .4 ? 'cel' : 'ink';
  };
  const stop = () => {
    clearTimeout(timer); cancelAnimationFrame(frame);
    const current = active; active = null;
    current?.transition?.skipTransition();
    current?.svg?.remove(); current?.overlay?.remove();
    panel?.removeEventListener('close', stop); panel = null;
    delete root.dataset.journalGenjutsu;
    delete root.dataset.journalGenjutsuTone;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
  };
  const cracks = (width, height) => {
    // Fractures enter from different edges; there is no single impact centre.
    let seed = 9347;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const starts = [[-.01, .18], [.24, -.01], [1.01, .28], [.79, 1.01], [-.01, .83], [1.01, .79]];
    const paths = [], hairlines = [], splinters = [];
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
        if (j > 0 && j < 6) {
          const chip = length * (.014 + random() * .02);
          splinters.push([[x - Math.cos(heading) * chip * 2, y - Math.sin(heading) * chip * 2], [x + Math.cos(heading + 1.1) * chip, y + Math.sin(heading + 1.1) * chip], [x + Math.cos(heading) * chip * 1.6, y + Math.sin(heading) * chip * 1.6]]);
        }
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
    const weight = Math.max(1, Math.min(width / 640, height / 360));
    return `<g fill="none" stroke="#f5f5f1" stroke-width="${weight * 1.25}" stroke-linejoin="miter">${lines(paths)}</g><g fill="none" stroke="#f5f5f1" stroke-width="${weight * .55}">${lines(hairlines)}${lines(splinters)}</g>`;
  };
  const buildFilter = () => {
    const width = innerWidth, height = innerHeight;
    const svg = element('svg', { width: 0, height: 0, 'aria-hidden': 'true', class: 'journal-genjutsu-defs' });
    const defs = element('defs');
    // Fragments leaving the viewport need no off-screen filter buffer.
    const filter = element('filter', { id: 'journal-genjutsu-fracture', filterUnits: 'userSpaceOnUse', x: 0, y: 0, width, height, 'color-interpolation-filters': 'sRGB' });
    // The reference opens short horizontal slits while the picture stays local.
    let seed = 4721;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const cells = [];
    let bandY = 0;
    [.12, .19, .15, .22, .17, .15].forEach((fraction, group) => {
      const bandHeight = height * fraction;
      const rows = 3 + Math.floor(random() * 3);
      const weights = Array.from({ length: rows }, () => .6 + random());
      const sum = weights.reduce((total, value) => total + value, 0);
      let y = bandY;
      weights.forEach(weight => {
        const rowHeight = bandHeight * weight / sum;
        let x = 0;
        while (x < width) {
          let span = width * (width < 700 ? .16 + random() * .3 : .035 + random() * .17);
          if (width - x - span < width * .035) span = width - x;
          cells.push({ x, y, width: Math.min(span, width - x), height: rowHeight, group });
          x += span;
        }
        y += rowHeight;
      });
      bandY += bandHeight;
    });
    const map = element('feImage', { x: 0, y: 0, width, height, preserveAspectRatio: 'none', result: 'map' });
    const mapCanvas = document.createElement('canvas');
    const mapScale = Math.min(1, (width < 700 ? 512 : 640) / Math.max(width, height));
    mapCanvas.width = Math.round(width * mapScale); mapCanvas.height = Math.round(height * mapScale);
    const brush = mapCanvas.getContext('2d');
    const offsets = cells.map(cell => {
      return { ...cell,
        cutX: [.012, -.019, .007, -.015, .024, -.009][cell.group] * width,
        driftX: random() < .45 ? 0 : (random() < .5 ? -1 : 1) * width * (.025 + random() * .085),
        driftY: (random() - .5) * height * .035,
        slit: random() < .28,
        anchorX: random() < .5 ? 0 : 1, anchorY: random() < .5 ? 0 : 1,
        delay: random() * .27, life: .16 + random() * .15
      };
    });
    const paintMap = (travel, magnitude) => {
      const sx = mapCanvas.width / width, sy = mapCanvas.height / height;
      brush.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
      travel.forEach(({ piece, dx, dy, remainingX = 1, remainingY = 1 }) => {
        dx = Math.round(dx * sx) / sx; dy = Math.round(dy * sy) / sy;
        const left = Math.round((piece.x + dx + piece.width * (1 - remainingX) * piece.anchorX) * sx);
        const top = Math.round((piece.y + dy + piece.height * (1 - remainingY) * piece.anchorY) * sy);
        const right = Math.round((piece.x + dx + piece.width * (1 - remainingX) * piece.anchorX + piece.width * remainingX) * sx);
        const bottom = Math.round((piece.y + dy + piece.height * (1 - remainingY) * piece.anchorY + piece.height * remainingY) * sy);
        brush.fillStyle = `rgb(${(0.5 - dx / magnitude) * 100}% ${(0.5 - dy / magnitude) * 100}% 0%)`;
        brush.fillRect(left, top, right - left, bottom - top);
      });
      map.setAttribute('href', mapCanvas.toDataURL());
    };
    paintMap(offsets.map(piece => ({ piece, dx: 0, dy: 0 })), 1);
    filter.append(map);
    const displacement = element('feDisplacementMap', { in: 'SourceGraphic', in2: 'map', scale: 0, xChannelSelector: 'R', yChannelSelector: 'G', result: 'shifted' });
    filter.append(element('feColorMatrix', { in: 'SourceGraphic', type: 'saturate', values: 0, result: 'monochrome' }));
    const poster = element('feComponentTransfer', { in: 'monochrome', result: 'poster' });
    // Keep the deepest shadows black, lift midtones, and solarize the whites.
    const tones = (root.dataset.journalGenjutsuTone || toneForPage()) === 'cel' ? '0 0 .2 .6 .75 1 .6 0 0' : '1 .9 .72 .55 .3 .12 0 0';
    for (const channel of ['R', 'G', 'B']) poster.append(element(`feFunc${channel}`, { type: 'discrete', tableValues: tones }));
    filter.append(poster);
    filter.append(element('feImage', { href: svgImage(cracks(width, height)), x: 0, y: 0, width, height, result: 'cracks' }));
    const transfer = element('feComponentTransfer', { in: 'cracks', result: 'visible-cracks' });
    const crackAlpha = element('feFuncA', { type: 'linear', slope: 0 }); transfer.append(crackAlpha); filter.append(transfer);
    const etched = element('feMerge', { result: 'etched' });
    etched.append(element('feMergeNode', { in: 'poster' }), element('feMergeNode', { in: 'visible-cracks' }));
    filter.append(etched); displacement.setAttribute('in', 'etched'); filter.append(displacement);
    filter.append(element('feComposite', { in: 'shifted', in2: 'map', operator: 'in' }));
    defs.append(filter); svg.append(defs); root.append(svg);
    const magnitude = Math.max(...offsets.map(piece => Math.abs(piece.cutX) + Math.abs(piece.driftX)), height * .04) * 2.04;
    return { svg, offsets, crackAlpha, displacement, paintMap, magnitude };
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
        run.crackAlpha.setAttribute('slope', Math.min(1, Math.max(0, (progress - .06) / .12)));
        const travel = run.offsets.map(piece => {
          const cut = Math.max(0, progress - piece.group * .009);
          const step = cut < .27 ? 0 : cut < .34 ? .35 : cut < .41 ? .7 : 1;
          const scatter = Math.max(0, Math.min(1, (progress - .44 - piece.delay) / piece.life));
          const drift = scatter * scatter;
          const collapse = Math.max(0, (scatter - .65) / .35);
          return { piece, dx: piece.cutX * step + piece.driftX * drift, dy: piece.driftY * drift,
            remainingX: 1 - (piece.slit ? scatter * scatter : collapse),
            remainingY: 1 - (piece.slit ? Math.pow(scatter, .7) : collapse) };
        });
        const magnitude = progress < .27 ? 0 : run.magnitude;
        run.displacement.setAttribute('scale', magnitude);
        run.paintMap(travel, Math.max(1, magnitude));
        if (progress < 1) frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => { if (active === run) stop(); });
    transition.finished.then(() => { if (active === run && !run.hold) stop(); }).catch(() => { if (active === run) stop(); });
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
  const compatible = (target, hold = false) => {
    // One inert viewport copy lets older WebKit fracture the page itself.
    // Never duplicate the page per fragment or copy executable elements.
    const overlay = document.createElement('div');
    overlay.className = 'journal-genjutsu-compat';
    overlay.dataset.hold = String(hold);
    overlay.setAttribute('aria-hidden', 'true'); overlay.inert = true;
    const mirror = document.createElement('div');
    mirror.className = 'journal-genjutsu-mirror';
    const contents = document.createElement('div');
    contents.style.cssText = `position:absolute;left:0;top:${-scrollY}px;width:${innerWidth}px;`;
    for (const child of [...document.body.children]) {
      if (child.matches('script, style, link, iframe, dialog:not([open]), .journal-genjutsu-compat, .journal-genjutsu-fallback')) continue;
      const copy = child.cloneNode(true);
      copy.querySelectorAll('script, iframe, object, embed, audio, video, dialog:not([open])').forEach(node => node.remove());
      for (const node of [copy, ...copy.querySelectorAll('*')]) {
        for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
        if (node.matches('input[type="password"]')) node.value = '';
        if (node.matches('dialog')) node.style.display = 'block';
        // Avoid nested native snapshot names inside this single bitmap surface.
        node.style.viewTransitionName = 'none';
      }
      if (child.matches('dialog[open]')) {
        const box = child.getBoundingClientRect();
        Object.assign(copy.style, { position: 'fixed', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, margin: '0' });
      }
      contents.append(copy);
    }
    mirror.append(contents); overlay.append(mirror); (target || document.body).append(overlay);
    try {
      const transition = { ready: Promise.resolve(), finished: new Promise(resolve => setTimeout(resolve, 1900)), skipTransition() {} };
      animateSnapshot(transition);
      active.overlay = overlay; active.hold = hold;
      if (target) { panel = target; panel.addEventListener('close', stop, { once: true }); }
      if (hold) { clearTimeout(timer); timer = setTimeout(stop, 10000); }
      return transition.finished;
    } catch {
      overlay.remove(); fallback(target); return Promise.resolve();
    }
  };
  window.JournalGenjutsu = {
    get active() { return !!active || !!root.dataset.journalGenjutsu; },
    intro() {
      stop(); root.dataset.journalGenjutsu = 'out';
      root.dataset.journalGenjutsuTone = toneForPage();
      try {
        const arrival = JSON.parse(sessionStorage.getItem('journal-petal-arrival'));
        if (arrival?.effect === 'genjutsu') {
          arrival.tone = root.dataset.journalGenjutsuTone;
          sessionStorage.setItem('journal-petal-arrival', JSON.stringify(arrival));
        }
      } catch { /* The picture transition also works without storage. */ }
      document.dispatchEvent(new CustomEvent('journal:transition-motion'));
      if (!document.startViewTransition) {
        try {
          const arrival = JSON.parse(sessionStorage.getItem('journal-petal-arrival'));
          if (arrival?.effect === 'genjutsu') {
            arrival.compatCompleted = true;
            sessionStorage.setItem('journal-petal-arrival', JSON.stringify(arrival));
          }
        } catch { /* Keep ordinary navigation available without storage. */ }
        return compatible(null, true);
      }
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
      root.dataset.journalGenjutsuTone = toneForPage();
      if (target) { panel = target; panel.addEventListener('close', stop, { once: true }); }
      if (!document.startViewTransition) { compatible(target); return; }
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
