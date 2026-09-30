(() => {
  const catalogue = JSON.parse(document.getElementById('station-posts').textContent);
  const byPath = new Map(catalogue.map(post => [post.path, post]));
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  if (searchInput && searchResults) {
    const status = document.createElement('p');
    status.className = 'station-search-status';
    status.setAttribute('role', 'status');
    searchInput.after(status);
    const update = () => {
      const count = searchResults.children.length;
      status.textContent = !searchInput.value.trim() ? '输入关键词，找找想看的内容。' : count ? `找到 ${count} 篇相关内容` : '暂时没有找到，换个关键词试试。';
    };
    new MutationObserver(update).observe(searchResults, { childList: true });
    let searchTimer;
    searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(update, 300); });
    update();
  }
  const key = 'yichuanxiang-reading-v1';
  const template = document.getElementById('station-save-template');
  const reading = document.querySelector('[data-station-kind="reading"]');
  let saved = new Set();
  let filter = 'all';
  const readSaved = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      saved = new Set(Array.isArray(value) ? value.filter(path => byPath.has(path)) : []);
    } catch { saved = new Set(); }
  };
  const makeSave = path => {
    const button = template.content.firstElementChild.cloneNode(true);
    button.dataset.bookmark = path;
    return button;
  };
  document.querySelectorAll('.main > .post-entry').forEach(card => {
    const link = card.querySelector('.entry-link');
    if (!link) return;
    const path = new URL(link.href).pathname;
    if (!byPath.has(path)) return;
    card.dataset.postPath = path;
    const button = makeSave(path);
    button.classList.add('station-card-save');
    card.appendChild(button);
  });
  if (byPath.has(location.pathname)) {
    const header = document.querySelector('.post-header');
    if (header) {
      const toolbar = document.createElement('div');
      toolbar.className = 'station-article-actions';
      toolbar.appendChild(makeSave(location.pathname));
      const link = document.createElement('a');
      link.href = new URL('reading/', new URL('../..', location.href)).href;
      link.textContent = '查看阅读清单 →';
      toolbar.appendChild(link);
      header.appendChild(toolbar);
    }
  }
  const rows = [...document.querySelectorAll('[data-post-path]')];
  const render = () => {
    document.querySelectorAll('[data-bookmark]').forEach(button => {
      const active = saved.has(button.dataset.bookmark);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('span').textContent = active ? '已收藏' : (button.classList.contains('station-card-save') ? '收藏' : '收藏文章');
      button.setAttribute('aria-label', `${active ? '取消收藏' : '收藏'}：${document.querySelector(`[data-post-path="${CSS.escape(button.dataset.bookmark)}"] h2`)?.textContent || document.querySelector('.post-title')?.textContent.trim() || '文章'}`);
    });
    document.querySelectorAll('.station-saved-count').forEach(node => { node.textContent = saved.size; });
    let visible = 0;
    rows.forEach(row => {
      const post = byPath.get(row.dataset.postPath);
      const show = reading ? saved.has(post.path) : filter === 'all' || post.tags.includes(filter);
      row.hidden = !show;
      if (show) visible++;
    });
    document.querySelectorAll('[data-post-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.postFilter === filter)));
    document.querySelectorAll('[data-filter-count]').forEach(count => {
      count.textContent = rows.filter(row => count.dataset.filterCount === 'all' || byPath.get(row.dataset.postPath).tags.includes(count.dataset.filterCount)).length;
    });
    document.querySelectorAll('.station-filter-status').forEach(node => { node.textContent = `${visible} 篇手记`; });
    const empty = document.querySelector('[data-station-empty]');
    if (empty && rows.length) empty.hidden = visible > 0;
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-bookmark]');
    if (button) {
      event.preventDefault();
      const path = button.dataset.bookmark;
      if (!byPath.has(path)) return;
      readSaved();
      const next = new Set(saved);
      next.has(path) ? next.delete(path) : next.add(path);
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
        saved = next;
        render();
      } catch {
        const notice = document.querySelector('.station-storage-message');
        notice.textContent = '收藏暂时无法保存，请允许此浏览器保存网站数据。';
        notice.hidden = false;
      }
      return;
    }
    const tab = event.target.closest('[data-post-filter]');
    if (tab) { filter = tab.dataset.postFilter; render(); }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = document.getElementById('searchInput');
      if (input) input.focus();
      else location.assign(document.querySelector('.header a[href$="/search/"]').href);
    }
  });
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { readSaved(); render(); } });
  window.addEventListener('pageshow', () => { readSaved(); render(); });
  readSaved();
  render();
})();
