(() => {
  const page = document.querySelector('[data-corner]');
  if (!page) return;
  const kind = page.dataset.corner;
  const items = [...page.querySelectorAll('[data-corner-item]')];
  const filters = [...page.querySelectorAll('[data-corner-filter]')];
  const applyFilter = value => {
    let count = 0;
    items.forEach(item => { item.hidden = value !== 'all' && item.dataset.cornerItem !== value; if (!item.hidden) count++; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.cornerFilter === value)));
    const status = page.querySelector('[data-corner-count]');
    if (status) status.textContent = `${count} ${kind === 'interests' ? '部作品' : '条动态'}`;
  };
  filters.forEach(button => button.addEventListener('click', () => { applyFilter(button.dataset.cornerFilter); window.StationMotion?.reveal(items); }));
  if (items.length) applyFilter('all');

  if (kind === 'guestbook') {
    const list = page.querySelector('[data-guest-list]');
    const status = page.querySelector('[data-guest-status]');
    const refresh = page.querySelector('[data-guest-refresh]');
    const load = async () => {
      refresh.disabled = true;
      status.textContent = '正在翻开留言簿…';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch('https://api.github.com/repos/yichuanxiang/yichuanxiang.github.io/issues?labels=guestbook&state=all&sort=created&direction=desc&per_page=20', { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal });
        if (!response.ok) throw new Error('Unavailable');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid feed');
        const messages = data.filter(issue => !issue.pull_request && Number.isInteger(issue.number) && issue.number > 0);
        const nodes = messages.map(issue => {
          const article = document.createElement('article');
          article.className = 'guest-message';
          const meta = document.createElement('p');
          meta.className = 'corner-hint';
          const date = new Date(issue.created_at);
          meta.textContent = `${issue.user?.login || '访客'} · ${Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN')}`;
          const heading = document.createElement('h3');
          const link = document.createElement('a');
          link.href = `https://github.com/yichuanxiang/yichuanxiang.github.io/issues/${issue.number}`;
          link.target = '_blank'; link.rel = 'noopener noreferrer';
          link.textContent = String(issue.title || '一条留言').replace(/^\[留言\]\s*/, '') || '一条留言';
          heading.append(link);
          const body = document.createElement('p');
          body.className = 'guest-message-body';
          const text = String(issue.body || '').replace(/^### 想说的话\s*/, '').trim();
          body.textContent = text.length > 400 ? `${text.slice(0, 400)}…` : text;
          const replies = document.createElement('a');
          replies.href = link.href; replies.target = '_blank'; replies.rel = 'noopener noreferrer';
          replies.className = 'corner-text-link';
          replies.textContent = `读完整留言 / ${Number(issue.comments) || 0} 条回复 ↗`;
          article.append(meta, heading, body, replies);
          return article;
        });
        list.replaceChildren(...nodes);
        status.textContent = messages.length ? `最近 ${messages.length} 条留言，点开可以继续回复。` : '留言簿还是空白的，欢迎留下第一个招呼。';
      } catch {
        status.textContent = '暂时没能取到留言。可以重试，或到 GitHub 直接查看和留言。';
      } finally {
        clearTimeout(timeout);
        refresh.disabled = false;
      }
    };
    refresh.addEventListener('click', load);
    load();
  }

  if (kind !== 'focus') return;
  const clock = page.querySelector('[data-focus-clock]');
  const progress = page.querySelector('[data-focus-progress]');
  const start = page.querySelector('[data-focus-start]');
  const status = page.querySelector('[data-focus-status]');
  const minutes = page.querySelector('#focus-minutes');
  const presets = [...page.querySelectorAll('[data-focus-minutes]')];
  const custom = page.querySelector('[data-focus-custom]');
  const total = page.querySelector('[data-focus-total]');
  const prefKey = 'yichuanxiang-focus-v1';
  let duration = 25 * 60, remaining = duration, deadline = 0, running = false, completed = 0;
  let preferredMinutes = 25;
  try {
    const saved = JSON.parse(localStorage.getItem(prefKey) || '{}');
    if (Number.isInteger(saved.minutes) && saved.minutes >= 1 && saved.minutes <= 180) preferredMinutes = saved.minutes;
    if (Number.isSafeInteger(saved.completed) && saved.completed >= 0) completed = saved.completed;
  } catch { /* The timer also works when browser storage is unavailable. */ }
  const save = () => { try { localStorage.setItem(prefKey, JSON.stringify({ minutes: duration / 60, completed })); } catch { /* No storage dependency. */ } };
  const render = () => {
    const seconds = Math.ceil(remaining);
    clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    progress.value = 1 - remaining / duration;
    start.textContent = running ? '暂停一下' : remaining === duration ? '开始专注' : remaining === 0 ? '再来一段' : '继续专注';
    presets.forEach(button => { button.disabled = running; button.setAttribute('aria-pressed', String(Number(button.dataset.focusMinutes) === duration / 60)); });
    minutes.disabled = running; custom.disabled = running;
    total.textContent = completed;
  };
  const setDuration = value => {
    duration = value * 60; remaining = duration; running = false;
    minutes.value = value;
    status.textContent = '准备好了，就开始吧。';
    save(); render();
  };
  const tick = () => {
    if (!running) return;
    remaining = Math.max(0, (deadline - Date.now()) / 1000);
    if (remaining === 0) {
      running = false; completed++; save();
      status.textContent = '这一段完成了。伸个懒腰，休息一会儿吧。';
    }
    render();
  };
  presets.forEach(button => button.addEventListener('click', () => setDuration(Number(button.dataset.focusMinutes))));
  custom.addEventListener('click', () => {
    if (!minutes.reportValidity()) return;
    const value = Number(minutes.value);
    if (!Number.isInteger(value)) { status.textContent = '请输入 1 到 180 之间的整数分钟。'; return; }
    setDuration(value);
  });
  start.addEventListener('click', () => {
    tick();
    if (running) { running = false; status.textContent = '先停一会儿，准备好再继续。'; }
    else {
      if (remaining === 0) remaining = duration;
      deadline = Date.now() + remaining * 1000; running = true;
      status.textContent = '这一刻，慢慢做好眼前的事。';
    }
    render();
  });
  page.querySelector('[data-focus-reset]').addEventListener('click', () => setDuration(duration / 60));
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('pageshow', tick);
  setInterval(tick, 250);
  setDuration(preferredMinutes);

  const sounds = [...page.querySelectorAll('[data-sound]')];
  const volume = page.querySelector('[data-focus-volume]');
  const soundStatus = page.querySelector('[data-sound-status]');
  let context, source, gain, activeSound = 'off';
  const stopSound = () => {
    if (source) { source.stop(); source.disconnect(); source = null; }
    if (gain) { gain.disconnect(); gain = null; }
  };
  const updateSounds = () => sounds.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sound === activeSound)));
  sounds.forEach(button => button.addEventListener('click', async () => {
    sounds.forEach(item => { item.disabled = true; });
    stopSound(); activeSound = 'off'; updateSounds();
    try {
      const choice = button.dataset.sound;
      if (choice === 'off') {
        if (context) await context.suspend();
        soundStatus.textContent = '现在是安静的。';
        return;
      }
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) throw new Error('Audio unavailable');
      context ||= new AudioEngine();
      await context.resume();
      const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
      const values = buffer.getChannelData(0);
      for (let i = 0; i < values.length; i++) values[i] = Math.random() * 2 - 1;
      source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
      gain = context.createGain(); gain.gain.value = Number(volume.value) / 100 * 0.18;
      if (choice === 'rain') {
        const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1600; filter.Q.value = 0.5;
        source.connect(filter); filter.connect(gain);
      } else source.connect(gain);
      gain.connect(context.destination); source.start(); activeSound = choice;
      updateSounds(); soundStatus.textContent = choice === 'rain' ? '正在播放轻柔的合成雨声。' : '正在播放白噪声。';
    } catch {
      stopSound(); soundStatus.textContent = '当前浏览器暂时无法播放环境声，计时仍然可以使用。';
    } finally { sounds.forEach(item => { item.disabled = false; }); }
  }));
  volume.addEventListener('input', () => {
    page.querySelector('[data-volume-value]').textContent = `${volume.value}%`;
    if (gain) gain.gain.setTargetAtTime(Number(volume.value) / 100 * 0.18, context.currentTime, 0.05);
  });
  window.addEventListener('pagehide', () => {
    running = false; remaining = duration;
    status.textContent = '准备好了，就开始吧。'; render();
    stopSound(); activeSound = 'off'; updateSounds();
    soundStatus.textContent = '现在是安静的。';
    if (context) context.suspend().catch(() => {});
  });
})();
