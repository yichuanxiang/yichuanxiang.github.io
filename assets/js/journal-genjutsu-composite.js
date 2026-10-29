(() => {
  if (window.journalTransitionPreview) return;
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const duration = 2450;
  let active;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);
  const svgNode = (name, attrs = {}) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const stop = () => {
    const run = active; active = null;
    if (run) {
      clearTimeout(run.timeout); clearTimeout(run.preparation);
      cancelAnimationFrame(run.frame);
      run.controller?.abort();
      run.panel?.removeEventListener('close', stop);
      run.overlay.remove(); run.defs.remove();
      if (!run.settled) { run.settled = true; run.reject(new DOMException('Transition cancelled', 'AbortError')); }
    }
    delete root.dataset.journalGenjutsu;
    delete root.dataset.journalGenjutsuTone;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
  };
  const toneForPage = () => {
    if (document.querySelector('dialog[open]')) return 'ink';
    let area = 0;
    for (const image of document.images) {
      const box = image.getBoundingClientRect();
      area += Math.max(0, Math.min(innerWidth, box.right) - Math.max(0, box.left)) * Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(0, box.top));
    }
    return area > innerWidth * innerHeight * .35 ? 'cel' : 'ink';
  };
  const makeTone = tone => {
    const svg = svgNode('svg', { width: 0, height: 0, class: 'journal-genjutsu-defs', 'aria-hidden': 'true' });
    const defs = svgNode('defs');
    const filter = svgNode('filter', { id: 'journal-genjutsu-tone', x: 0, y: 0, width: 1, height: 1, filterUnits: 'objectBoundingBox', 'color-interpolation-filters': 'sRGB' });
    filter.append(svgNode('feColorMatrix', { type: 'saturate', values: 0 }));
    const transfer = svgNode('feComponentTransfer');
    const dark = root.dataset.theme === 'dark' || root.classList.contains('dark');
    const values = tone === 'ink' && !dark ? '1 .82 .58 .32 .12 .035' : '0 .06 .25 .52 .8 1';
    for (const channel of ['R', 'G', 'B']) transfer.append(svgNode(`feFunc${channel}`, { type: 'discrete', tableValues: values }));
    filter.append(transfer); defs.append(filter); svg.append(defs); root.append(svg);
    return svg;
  };
  const copyCanvases = (source, copy) => {
    const originals = source.querySelectorAll('canvas');
    copy.querySelectorAll('canvas').forEach((canvas, index) => {
      try { canvas.width = originals[index].width; canvas.height = originals[index].height; canvas.getContext('2d').drawImage(originals[index], 0, 0); }
      catch { /* Static page art remains available when a GPU surface cannot be read. */ }
    });
  };
  const copyElement = source => {
    const copy = source.cloneNode(true);
    copyCanvases(source, copy);
    copy.querySelectorAll('script, iframe, object, embed, audio, video, dialog').forEach(node => node.remove());
    for (const node of [copy, ...copy.querySelectorAll('*')]) {
      for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      if (node.matches('input[type="password"]')) { node.value = ''; node.removeAttribute('value'); }
      node.style.viewTransitionName = 'none';
    }
    const box = source.getBoundingClientRect();
    Object.assign(copy.style, { position: 'absolute', left: `${box.left}px`, top: `${box.top + scrollY}px`, width: `${box.width}px`, height: `${box.height}px`, margin: '0', right: 'auto', bottom: 'auto', boxSizing: 'border-box' });
    return copy;
  };
  const capture = () => {
    const scene = document.createElement('div');
    scene.className = 'journal-genjutsu-capture';
    scene.style.cssText = `top:${-scrollY}px;width:${innerWidth}px;`;
    for (const child of [...document.body.children]) {
      if (child.matches('script, style, link, iframe, dialog, [hidden], .journal-genjutsu-composite')) continue;
      const box = child.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= innerHeight || box.width <= 0 || box.height <= 0) continue;
      scene.append(copyElement(child));
    }
    for (const dialog of document.querySelectorAll('dialog[open]')) scene.append(copyElement(dialog));
    return scene;
  };
  const geometry = (width, height) => {
    let seed = 8137;
    const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
    const groups = [], leaves = [], faults = [];
    const vectors = [[-.033, -.025], [.028, .018], [.024, -.037], [-.037, .029], [-.02, .04], [.036, -.024]];
    let top = 0;
    [.29, .36, .35].forEach((fraction, row) => {
      const split = width * [.43, .57, .48][row];
      for (let column = 0; column < 2; column++) {
        const group = { x: column ? split : 0, y: top, width: column ? width - split : split, height: height * fraction, index: groups.length, leaves: [] };
        [group.vx, group.vy] = vectors[group.index]; groups.push(group);
        const divide = (rect, depth) => {
          const horizontal = rect.width / rect.height < .8 ? true : rect.width / rect.height > 2.4 ? false : random() > .58;
          const length = horizontal ? rect.height : rect.width;
          if (depth < 7 && rect.width * rect.height > width * height / 155 && length > (width < 700 ? 22 : 34)) {
            const amount = length * (.24 + random() * .52);
            if (horizontal) {
              if (depth < 3 || random() < .12) faults.push({ x1: rect.x, y1: rect.y + amount, x2: rect.x + rect.width, y2: rect.y + amount, fine: depth > 1 });
              divide({ ...rect, height: amount }, depth + 1);
              divide({ ...rect, y: rect.y + amount, height: rect.height - amount }, depth + 1);
            } else {
              if (depth < 3 || random() < .12) faults.push({ x1: rect.x + amount, y1: rect.y, x2: rect.x + amount, y2: rect.y + rect.height, fine: depth > 1 });
              divide({ ...rect, width: amount }, depth + 1);
              divide({ ...rect, x: rect.x + amount, width: rect.width - amount }, depth + 1);
            }
          } else {
            const distance = Math.hypot((rect.x + rect.width * .5) / width - .52, (rect.y + rect.height * .5) / height - .48);
            const leaf = { ...rect, reveal: .29 + distance * .32 + random() * .22, life: .13 + random() * .17, vertical: random() < .3, reverse: random() < .5 };
            group.leaves.push(leaf); leaves.push(leaf);
          }
        };
        divide({ x: group.x, y: group.y, width: group.width, height: group.height }, 0);
      }
      top += height * fraction;
    });
    return { groups, leaves, faults };
  };
  const crackImage = (faults, width, height) => {
    const lines = faults.map(({ x1, y1, x2, y2, fine }) => {
      const mx = x1 + (x2 - x1) * .52, my = y1 + (y2 - y1) * .52;
      const branch = Math.min(11, Math.hypot(x2 - x1, y2 - y1) * .15);
      return `<path d="M${x1},${y1}L${x2},${y2}M${mx},${my}l${branch},${-branch * .65}" stroke-width="${fine ? .45 : .8}" opacity="${fine ? .42 : .65}"/>`;
    }).join('');
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="${ns}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="none" stroke="#fff">${lines}</g></svg>`);
  };
  const paintMask = (group, progress) => {
    const { canvas, brush } = group, sx = canvas.width / group.width, sy = canvas.height / group.height;
    brush.clearRect(0, 0, canvas.width, canvas.height); brush.fillStyle = '#fff';
    if (progress < .22) brush.fillRect(0, 0, canvas.width, canvas.height);
    else if (progress < .995) for (const leaf of group.leaves) {
      const loss = ease((progress - leaf.reveal) / leaf.life);
      let x = leaf.x - group.x, y = leaf.y - group.y, width = leaf.width, height = leaf.height;
      if (leaf.vertical) { height *= 1 - loss; if (leaf.reverse) y += leaf.height - height; }
      else { width *= 1 - loss; if (leaf.reverse) x += leaf.width - width; }
      const left = Math.round(x * sx), top = Math.round(y * sy);
      brush.fillRect(left, top, Math.round((x + width) * sx) - left, Math.round((y + height) * sy) - top);
    }
    const mask = `url("${canvas.toDataURL()}")`;
    group.node.style.maskImage = mask; group.node.style.webkitMaskImage = mask;
  };
  const begin = run => {
    if (active !== run || reduce.matches || document.hidden) return;
    clearTimeout(run.preparation);
    root.dataset.journalGenjutsu = 'breaking';
    run.overlay.dataset.realityReady = 'true';
    const start = performance.now(); let lastMask = -Infinity;
    const draw = now => {
      if (active !== run) return;
      const progress = clamp((now - start) / duration);
      run.overlay.dataset.progress = progress.toFixed(3);
      const crackOpacity = ease((progress - .07) / .22) * (1 - ease((progress - .79) / .18));
      for (const group of run.groups) {
        const separation = ease((progress - .12 - group.index * .009) / .26);
        const drift = ease((progress - .43) / .54);
        const dx = group.vx * run.width * separation * (1 + drift * .72);
        const dy = group.vy * run.height * separation * (1 + drift * .82);
        group.node.style.transform = `translate3d(${dx}px,${dy}px,0)`;
        group.veins.style.opacity = crackOpacity;
        if (now - lastMask >= 40 || progress === 1) paintMask(group, progress);
      }
      if (now - lastMask >= 40) lastMask = now;
      if (progress < 1) run.frame = requestAnimationFrame(draw);
      else {
        run.overlay.dataset.progress = '1';
        run.settled = true; run.resolve();
        if (!run.destination) stop();
      }
    };
    run.frame = requestAnimationFrame(draw);
  };
  const compose = (destination, panel) => {
    stop();
    if (reduce.matches || document.hidden) return Promise.resolve();
    const width = innerWidth, height = innerHeight, tone = toneForPage();
    const source = capture(), mesh = geometry(width, height), defs = makeTone(tone);
    const overlay = document.createElement('div'); overlay.className = 'journal-genjutsu-composite';
    overlay.setAttribute('aria-hidden', 'true'); overlay.inert = true;
    overlay.dataset.fragmentCount = mesh.leaves.length;
    const veins = crackImage(mesh.faults, width, height);
    let resolve, reject;
    const finished = new Promise((done, fail) => { resolve = done; reject = fail; });
    const hostPanel = panel || document.querySelector('dialog[open]');
    const run = active = { overlay, defs, width, height, groups: mesh.groups, destination, panel: hostPanel, resolve, reject, settled: false };
    finished.catch(() => {});
    if (destination) {
      const preview = document.createElement('iframe'); preview.className = 'journal-genjutsu-reality';
      preview.setAttribute('data-journal-transition-preview', ''); preview.setAttribute('aria-hidden', 'true'); preview.tabIndex = -1;
      preview.title = '页面转场';
      run.preview = preview; overlay.append(preview);
      const ready = () => {
        if (active !== run || run.started) return;
        try {
          if (!preview.contentDocument?.body || !preview.contentWindow.journalTransitionPreview) return;
          preview.contentDocument.documentElement.classList.add('journal-transition-preview');
          run.started = true;
          run.frame = requestAnimationFrame(() => { run.frame = requestAnimationFrame(() => begin(run)); });
        } catch { /* The bounded preparation path handles inaccessible destinations. */ }
      };
      preview.addEventListener('load', ready);
      run.controller = new AbortController();
      fetch(destination.href, { signal: run.controller.signal, credentials: 'same-origin' }).then(response => {
        if (!response.ok) throw new Error('Destination unavailable');
        return response.text();
      }).then(html => {
        if (active !== run) return;
        const page = new DOMParser().parseFromString(html, 'text/html');
        // A cached destination must not consume this navigation's arrival marker
        // or start another transition/audio/GPU renderer inside the preview.
        page.querySelectorAll('script').forEach(script => {
          if (/\/(journal-genjutsu(?:-composite)?|journal-petals|music-player|journal-shaders)[.-]/.test(script.getAttribute('src') || '') || script.textContent.includes('journal-petal-arrival')) script.remove();
        });
        // Match the header's static paper layout without starting a second GPU renderer.
        if (!page.querySelector('[data-journal-light="hero"]')) {
          const header = page.querySelector('.station-page-header, .page-header, .post-header');
          if (header) {
            header.classList.add('journal-lit-header');
            if (!header.querySelector('.journal-shader-surface--paper')) {
              const paper = page.createElement('div');
              paper.className = 'journal-shader-surface journal-shader-surface--paper';
              paper.dataset.journalLight = 'paper'; paper.setAttribute('aria-hidden', 'true');
              const canvas = page.createElement('canvas');
              canvas.className = 'journal-shader-canvas'; canvas.setAttribute('aria-hidden', 'true');
              paper.append(canvas); header.append(paper);
            }
          }
        }
        page.querySelectorAll('base').forEach(node => node.remove());
        const base = page.createElement('base'); base.href = destination.href;
        const bootstrap = page.createElement('script');
        const address = JSON.stringify(destination.href).replace(/</g, '\\u003c');
        const theme = JSON.stringify(root.dataset.theme || '').replace(/</g, '\\u003c');
        bootstrap.textContent = `window.journalTransitionPreview=true;window.journalPreviewDestination=${address};document.documentElement.classList.add('journal-transition-preview');document.documentElement.inert=true;document.documentElement.dataset.theme=${theme};document.addEventListener('DOMContentLoaded',function(){var p=document.querySelector('[data-music-player]');if(p)p.hidden=false;});`;
        page.head.prepend(base, bootstrap);
        preview.srcdoc = '<!doctype html>' + page.documentElement.outerHTML;
      }).catch(error => {
        if (active === run && error.name !== 'AbortError') { run.settled = true; run.resolve(); stop(); }
      });
      run.preparation = setTimeout(() => {
        if (active !== run || run.started) return;
        run.settled = true; run.resolve(); stop();
      }, 1800);
    }
    for (const group of mesh.groups) {
      const plate = document.createElement('div'); plate.className = 'journal-genjutsu-plate';
      plate.style.cssText = `left:${group.x}px;top:${group.y}px;width:${group.width + .5}px;height:${group.height + .5}px;`;
      const picture = document.createElement('div'); picture.className = 'journal-genjutsu-picture';
      const mirror = document.createElement('div'); mirror.className = 'journal-genjutsu-view';
      mirror.style.cssText = `left:${-group.x}px;top:${-group.y}px;width:${width}px;height:${height}px;`;
      const copy = source.cloneNode(true); copyCanvases(source, copy); mirror.append(copy); picture.append(mirror);
      const cracks = document.createElement('div'); cracks.className = 'journal-genjutsu-cracks';
      cracks.style.cssText = `left:${-group.x}px;top:${-group.y}px;width:${width}px;height:${height}px;background-image:url("${veins}");`;
      plate.append(picture, cracks); overlay.append(plate);
      group.node = plate; group.veins = cracks;
      group.canvas = document.createElement('canvas');
      const scale = Math.min(1, 300 / Math.max(group.width, group.height));
      group.canvas.width = Math.max(1, Math.round(group.width * scale)); group.canvas.height = Math.max(1, Math.round(group.height * scale));
      group.brush = group.canvas.getContext('2d'); paintMask(group, 0);
    }
    (hostPanel || document.body).append(overlay);
    hostPanel?.addEventListener('close', stop, { once: true });
    root.dataset.journalGenjutsu = 'preparing'; root.classList.add('journal-genjutsu-ready');
    window.journalGenjutsuHandled = true;
    document.dispatchEvent(new CustomEvent('journal:transition-motion'));
    run.timeout = setTimeout(() => { if (active === run) { run.settled = true; run.resolve(); stop(); } }, destination ? 7000 : duration + 1500);
    if (!destination) run.frame = requestAnimationFrame(() => begin(run));
    return finished;
  };
  window.JournalGenjutsu = {
    get active() { return !!active; },
    intro(destination) {
      try {
        const arrival = JSON.parse(sessionStorage.getItem('journal-petal-arrival'));
        if (arrival?.effect === 'genjutsu') { arrival.compatCompleted = true; sessionStorage.setItem('journal-petal-arrival', JSON.stringify(arrival)); }
      } catch { /* Animation and navigation do not require storage. */ }
      try { return compose(destination, null); }
      catch { stop(); return Promise.resolve(); }
    },
    reveal(event) {
      if (root.dataset.journalGenjutsu !== 'pending') return false;
      event.viewTransition?.ready.catch(() => {}); event.viewTransition?.finished.catch(() => {}); event.viewTransition?.skipTransition();
      this.local(); return true;
    },
    local(panel) {
      try { compose(null, panel).catch(() => {}); } catch { stop(); }
    },
    stop
  };
  window.addEventListener('pagehide', stop);
  window.addEventListener('resize', () => {
    if (active) { active.settled = true; active.resolve(); stop(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') stop(); });
  reduce.addEventListener('change', () => { if (reduce.matches) stop(); });
})();
