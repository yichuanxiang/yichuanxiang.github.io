(() => {
  const scene = document.querySelector('.journal-scene');
  const dialog = document.querySelector('.journal-panel');
  if (!scene || !dialog || !dialog.showModal) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('[data-desk-panel]').forEach(link => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-controls', dialog.id);
  });
  let scrollFrame = 0;
  const updateScene = () => {
    scrollFrame = 0;
    document.documentElement.style.setProperty('--journal-viewport-width', `${document.documentElement.clientWidth}px`);
    const rect = scene.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)));
    const eased = progress * progress * (3 - 2 * progress);
    scene.style.setProperty('--scene-inset-y', `${18 * (1 - eased)}%`);
    scene.style.setProperty('--scene-inset-x', `${(innerWidth <= 700 ? 6 : 20) * (1 - eased)}%`);
    scene.style.setProperty('--scene-radius', `${32 * (1 - eased)}px`);
    scene.style.setProperty('--scene-hint', `${Math.max(0, 1 - progress * 4)}`);
    scene.dataset.progress = progress.toFixed(3);
  };
  const requestScene = () => { if (!scrollFrame && !reduce.matches) scrollFrame = requestAnimationFrame(updateScene); };
  addEventListener('scroll', requestScene, { passive: true });
  addEventListener('resize', requestScene, { passive: true });
  requestScene();
  document.documentElement.style.setProperty('--journal-viewport-width', `${document.documentElement.clientWidth}px`);

  document.querySelectorAll('.desk-portal').forEach(card => {
    let frame = 0;
    let point;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y');
      card.style.removeProperty('--glow-x'); card.style.removeProperty('--glow-y');
      card.classList.remove('is-hovered');
    };
    card.addEventListener('pointermove', event => {
      if (reduce.matches || !pointer.matches || event.pointerType === 'touch') return;
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));
        card.style.setProperty('--tilt-x', `${(y - .5) * -6}deg`);
        card.style.setProperty('--tilt-y', `${(x - .5) * 6}deg`);
        card.style.setProperty('--glow-x', `${x * 100}%`);
        card.style.setProperty('--glow-y', `${y * 100}%`);
        card.classList.add('is-hovered');
      });
    });
    card.addEventListener('pointerleave', reset);
    card.addEventListener('blur', reset);
    reduce.addEventListener('change', reset);
  });

  const paper = dialog.querySelector('.journal-panel__paper');
  const content = dialog.querySelector('.journal-panel__content');
  const loading = dialog.querySelector('.journal-panel__loading');
  const title = dialog.querySelector('#journal-panel-title');
  const fullPage = dialog.querySelector('[data-panel-page]');
  const closeButton = dialog.querySelector('[data-panel-close]');
  let iframe;
  let trigger;
  let oldOverflow;
  let scrollYBefore;
  let closing = false;
  let entering;
  const preserveScroll = () => {
    const root = document.documentElement;
    const old = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollYBefore);
    root.style.scrollBehavior = old;
  };
  const finishClose = () => {
    dialog.close();
    paper.getAnimations().forEach(animation => animation.cancel());
    iframe?.remove(); iframe = null;
    document.documentElement.style.overflow = oldOverflow;
    dialog.classList.remove('is-closing');
    trigger?.focus({ preventScroll: true });
    preserveScroll();
    closing = false;
    // Same-origin frames share the reading list; refresh the home counter too.
    window.dispatchEvent(new Event('pageshow'));
  };
  const close = async () => {
    if (!dialog.open || closing) return;
    closing = true;
    entering?.cancel();
    dialog.classList.add('is-closing');
    if (!reduce.matches && paper.animate) {
      const exit = paper.animate([{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(18px) scale(.97)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
      try {
        await exit.finished;
      } catch { /* A motion preference change can cancel the exit. */ }
      finally { exit.cancel(); }
    }
    finishClose();
  };
  const open = link => {
    trigger = link;
    scrollYBefore = window.scrollY;
    oldOverflow = document.documentElement.style.overflow;
    title.textContent = link.dataset.deskPanel;
    fullPage.href = link.href;
    loading.hidden = false;
    loading.textContent = '正在翻开这一页…';
    iframe = document.createElement('iframe');
    iframe.setAttribute('data-journal-frame', '');
    iframe.title = link.dataset.deskPanel;
    iframe.hidden = true;
    const url = new URL(link.href);
    url.searchParams.set('panel', '1');
    iframe.addEventListener('load', () => {
      if (!iframe || !dialog.open) return;
      const doc = iframe.contentDocument;
      if (!doc?.querySelector('.main') || doc.querySelector('.not-found')) {
        loading.textContent = '这一页暂时没有打开，可以使用下方的“打开完整页面”。';
        return;
      }
      loading.hidden = true;
      iframe.hidden = false;
      const path = new URL(iframe.contentWindow.location.href);
      path.searchParams.delete('panel');
      fullPage.href = path.href;
      title.textContent = doc.querySelector('h1')?.textContent || link.dataset.deskPanel;
      iframe.title = title.textContent;
    });
    iframe.src = url.href;
    content.append(iframe);
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
    preserveScroll();
    if (!reduce.matches && paper.animate) entering = paper.animate([
      { opacity: 0, transform: 'translateY(32px) scale(.94) rotate(-.5deg)', filter: 'blur(4px)' },
      { opacity: 1, transform: 'translateY(0) scale(1) rotate(0)', filter: 'blur(0)' }
    ], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
  };
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-desk-panel]');
    if (!link || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || dialog.open) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    open(link);
  });
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === iframe?.contentWindow && event.data?.type === 'journal-close') close();
  });
  window.addEventListener('pagehide', () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    if (dialog.open) { entering?.cancel(); finishClose(); }
  });
  window.addEventListener('pageshow', requestScene);
  reduce.addEventListener('change', () => {
    if (reduce.matches) { entering?.cancel(); cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
    else requestScene();
  });
})();
