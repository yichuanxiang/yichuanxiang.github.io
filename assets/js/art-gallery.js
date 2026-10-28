(() => {
  const root = document.querySelector('[data-art-gallery]');
  if (!root) return;
  const grid = root.querySelector('.art-gallery__grid');
  const items = [...grid.children];
  // One mixed shelf: the next visit has a different opening, with no role tabs.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach(item => grid.append(item));
  const more = root.querySelector('[data-art-more]');
  const count = root.querySelector('[data-art-count]');
  let visible = 24, current = 0, opener;
  const showBatch = () => {
    items.forEach((item, index) => { item.hidden = index >= visible; });
    count.textContent = `${Math.min(visible, items.length)} / ${items.length}`;
    more.hidden = visible >= items.length;
  };
  more.addEventListener('click', () => {
    const first = items[visible];
    visible += 24; showBatch();
    if (more.hidden) first?.focus({ preventScroll: true });
  });
  showBatch();
  const dialog = root.querySelector('dialog');
  const image = root.querySelector('[data-art-full]');
  const status = root.querySelector('[data-art-status]');
  const show = index => {
    current = (index + items.length) % items.length;
    const item = items[current];
    image.alt = item.dataset.title;
    status.textContent = '正在载入…';
    image.src = item.href;
    root.querySelector('[data-art-title]').textContent = item.dataset.title;
    root.querySelector('[data-art-series]').textContent = item.dataset.series;
    root.querySelector('[data-art-position]').textContent = `${current + 1} / ${items.length}`;
    root.querySelector('[data-art-original]').href = item.href;
    root.querySelector('[data-art-source]').href = item.dataset.creator || item.dataset.source;
  };
  image.addEventListener('load', () => { status.textContent = ''; });
  image.addEventListener('error', () => { status.textContent = '这张图暂未载入，可以看原图或继续翻下一张。'; });
  grid.addEventListener('click', event => {
    const item = event.target.closest('.art-gallery__item');
    if (!item || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
    event.preventDefault(); opener = item;
    show(items.indexOf(item)); dialog.showModal();
  });
  root.querySelector('[data-art-close]').addEventListener('click', () => dialog.close());
  root.querySelector('[data-art-previous]').addEventListener('click', () => show(current - 1));
  root.querySelector('[data-art-next]').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
})();
