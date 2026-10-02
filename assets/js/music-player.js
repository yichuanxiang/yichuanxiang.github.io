(() => {
  'use strict';
  const player = document.querySelector('[data-music-player]');
  if (!player || player.dataset.musicReady || document.documentElement.classList.contains('journal-embedded')) return;
  let tracks;
  try { tracks = JSON.parse(player.querySelector('[data-music-tracks]').textContent); } catch { return; }
  if (!Array.isArray(tracks) || !tracks.length) return;
  player.dataset.musicReady = 'true';

  const audio = player.querySelector('[data-music-audio]');
  const playButton = player.querySelector('[data-music-play]');
  const expandButton = player.querySelector('[data-music-expand]');
  const detail = player.querySelector('[data-music-detail]');
  const title = player.querySelector('[data-music-title]');
  const artist = player.querySelector('[data-music-artist]');
  const status = player.querySelector('[data-music-status]');
  const seek = player.querySelector('[data-music-seek]');
  const currentLabel = player.querySelector('[data-music-current]');
  const durationLabel = player.querySelector('[data-music-duration]');
  const volume = player.querySelector('[data-music-volume]');
  const volumeOutput = player.querySelector('[data-music-volume-output]');
  const trackSelect = player.querySelector('[data-music-track]');
  const source = player.querySelector('[data-music-source]');
  const license = player.querySelector('[data-music-license]');
  const storageKey = 'journal-music-preferences';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let selected = 0;
  let hadError = false;
  let requestId = 0;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < tracks.length) selected = saved.index;
    if (Number.isFinite(saved.volume) && saved.volume >= 0 && saved.volume <= 1) audio.volume = saved.volume;
    else audio.volume = .5;
  } catch { audio.volume = .5; }

  function savePreferences() {
    try { localStorage.setItem(storageKey, JSON.stringify({ index: selected, volume: audio.volume })); } catch { /* Playback works without storage. */ }
  }

  function formatTime(seconds) {
    const value = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  }

  function setState(state, message) {
    player.dataset.state = state;
    status.textContent = message;
    playButton.setAttribute('aria-label', state === 'playing' || state === 'loading' ? '暂停音乐' : state === 'error' ? '重试播放音乐' : '播放音乐');
  }

  function updateProgress() {
    const duration = audio.duration;
    const hasDuration = Number.isFinite(duration) && duration > 0;
    seek.disabled = !hasDuration;
    seek.value = hasDuration ? String(Math.min(100, audio.currentTime / duration * 100)) : '0';
    currentLabel.textContent = formatTime(audio.currentTime);
    durationLabel.textContent = hasDuration ? formatTime(duration) : '--:--';
    seek.setAttribute('aria-valuetext', hasDuration ? `${formatTime(audio.currentTime)}，共 ${formatTime(duration)}` : '尚未载入音乐');
  }

  function updateVolume() {
    volume.value = String(Math.round(audio.volume * 100));
    volumeOutput.textContent = `${volume.value}%`;
    volume.setAttribute('aria-valuetext', `${volume.value}%`);
  }

  function loadTrack(index) {
    requestId += 1;
    audio.pause();
    selected = index;
    const track = tracks[selected];
    hadError = false;
    audio.src = track.url;
    title.textContent = track.title;
    title.title = track.title;
    artist.textContent = track.artist || '';
    artist.hidden = !track.artist;
    source.hidden = !track.sourceURL;
    if (track.sourceURL) source.href = track.sourceURL;
    else source.removeAttribute('href');
    license.textContent = track.license || '';
    license.hidden = !track.license;
    if (trackSelect) trackSelect.value = String(selected);
    setState('idle', '点一下，听首音乐');
    seek.disabled = true;
    seek.value = '0';
    seek.setAttribute('aria-valuetext', '尚未载入音乐');
    currentLabel.textContent = '0:00';
    durationLabel.textContent = '--:--';
    savePreferences();
  }

  async function playMusic() {
    const thisRequest = ++requestId;
    if (hadError) { hadError = false; audio.load(); }
    setState('loading', '正在载入…');
    try {
      await audio.play();
    } catch (error) {
      if (thisRequest !== requestId || error.name === 'AbortError') return;
      hadError = true;
      setState('error', error.name === 'NotAllowedError' ? '再点一次播放试试' : '暂时无法播放，点一下重试');
    }
  }

  playButton.addEventListener('click', () => {
    if (!audio.paused || player.dataset.state === 'loading') {
      requestId += 1;
      audio.pause();
      setState('paused', '已暂停');
    } else playMusic();
  });

  function setExpanded(expanded) {
    player.dataset.expanded = String(expanded);
    detail.hidden = !expanded;
    expandButton.setAttribute('aria-expanded', String(expanded));
    expandButton.setAttribute('aria-label', expanded ? '收起音乐播放器' : '展开音乐播放器');
    if (expanded && !reducedMotion.matches && detail.animate) {
      detail.animate([{ opacity: 0, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' });
    }
  }
  expandButton.addEventListener('click', () => setExpanded(player.dataset.expanded !== 'true'));
  player.addEventListener('keydown', event => {
    if (event.key === 'Escape' && player.dataset.expanded === 'true') {
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      expandButton.focus();
    }
  });

  seek.addEventListener('input', () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = audio.duration * Number(seek.value) / 100;
    updateProgress();
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    updateVolume();
    savePreferences();
  });
  if (trackSelect) trackSelect.addEventListener('change', () => {
    const next = Number(trackSelect.value);
    if (!Number.isInteger(next) || next < 0 || next >= tracks.length) return;
    const wasPlaying = !audio.paused;
    loadTrack(next);
    if (wasPlaying) playMusic();
  });

  audio.addEventListener('playing', () => { hadError = false; setState('playing', '正在播放'); });
  audio.addEventListener('waiting', () => { if (!audio.paused) setState('loading', '正在缓冲…'); });
  audio.addEventListener('pause', () => { if (!hadError) setState('paused', '已暂停'); });
  audio.addEventListener('ended', () => { setState('paused', '这首听完了'); updateProgress(); });
  audio.addEventListener('error', () => { hadError = true; setState('error', '暂时无法播放，点一下重试'); });
  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked'].forEach(event => audio.addEventListener(event, updateProgress));
  audio.addEventListener('volumechange', updateVolume);
  window.addEventListener('pagehide', () => { requestId += 1; audio.pause(); });

  loadTrack(selected);
  updateVolume();
  player.hidden = false;
})();
