(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const lesson = [
    { title: 'VT1 的电压方向', text: '阳极接 a 相，阴极接 d1。红线是 ua，蓝线是 ud1，青线是两者的差。', phi: 15, mode: 'ideal' },
    { title: 'VT1 导通', text: '这时 VT1、VT2 导通，d1 跟着 a 相变化。忽略导通压降，VT1 两端的电压为零。', phi: 75, mode: 'ideal' },
    { title: 'VT3 导通', text: 'd1 跟着 b 相变化，VT1 的电压约为 ua − ub，即 uab。VT5 导通时，同理得到 uac。', phi: 135, mode: 'ideal' },
    { title: '课件里的断流段', text: '课件在这里取 ud1 = ud2 = 0，所以 uVT1 = ua。青线和红线重合。', phi: 45, mode: 'ideal' },
    { title: '外接 RC 后的断流段', text: '这份模型中，ux 在相邻两段约为 +Um/2、−Um/2。点“第一段断流”和“第二段断流”，分别比较 ua 与 ux。', phi: 45, mode: 'rc' },
    { title: '两条管压对照', text: '课件示意在断流段取零电位；RC 模型保留了非零 ux。差别来自电路条件，管压都按 ua − ud1 计算。', phi: 45, mode: 'rc', compare: true }
  ];
  try {
    const data = window.THYRISTOR_DATA;
    if (!data || !data.modes) throw new Error('波形资料未加载。请确认网页、data.js 与脚本在同一目录。');
    if (!window.ThyristorCircuit) throw new Error('电路图未加载，请确认 circuit.js 在演示文件夹内。');
    window.ThyristorCircuit.init();
    const peak = data.params.phasePeakV;
    const load = data.params.loadOhm;
    const offset = data.phaseStartDegrees;
    const state = { mode: 'ideal', phi: 15, step: 0, compare: false, playing: false, zoom: false, lo: 0, hi: 360, references: false };
    let geometry, cursor, dots, paths, lastFrame = 0, raf = 0, moving = false;
    const series = mode => data.modes[mode].samples;
    const nearest = (rows, phi) => {
      let lo = 0, hi = rows.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (rows[mid].phi < phi) lo = mid + 1; else hi = mid; }
      return lo > 0 && Math.abs(rows[lo - 1].phi - phi) < Math.abs(rows[lo].phi - phi) ? rows[lo - 1] : rows[lo];
    };
    const point = () => nearest(series(state.mode), state.phi);
    const node = (tag, attrs = {}, text) => {
      const element = document.createElementNS(svgNS, tag);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
      if (text !== undefined) element.textContent = text;
      return element;
    };
    const append = (tag, attrs, text) => { const element = node(tag, attrs, text); $('waveform').append(element); return element; };
    const active = sample => [1, 2, 3, 4, 5, 6].filter(id => Math.abs(sample[`iVT${id}`] || 0) > 0.05);
    const voltage = n => `${(n * peak).toFixed(1)} V`;
    const u = sub => `<i>u</i><sub>${sub}</sub>`;
    function draw() {
      const svg = $('waveform');
      const width = Math.max(230, $('graph-host').clientWidth);
      const height = svg.clientHeight || 410;
      geometry = { width, height, left: width < 450 ? 36 : 48, right: width - 14, top: 24, row: (height - 52) / 3 };
      const g = geometry;
      svg.replaceChildren(); svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.dataset.mode = state.mode;
      const x = phi => g.left + (phi - state.lo) / (state.hi - state.lo) * (g.right - g.left);
      const y = (value, row) => g.top + g.row * row + g.row * 0.52 - value * g.row * 0.23;
      const clip = append('defs');
      const clipPath = node('clipPath', { id: 'plot-clip' }); clipPath.append(node('rect', { x: g.left, y: 0, width: g.right - g.left, height: height - 20 })); clip.append(clipPath);
      const plot = append('g', { 'clip-path': 'url(#plot-clip)' });
      const addPlot = (tag, attrs) => { const element = node(tag, attrs); plot.append(element); return element; };
      const rows = series(state.mode);
      let offStart = null;
      for (let i = 0; i <= rows.length; i++) {
        const off = i < rows.length && active(rows[i]).length === 0;
        if (off && offStart === null) offStart = rows[i].phi;
        if (!off && offStart !== null) {
          const end = i < rows.length ? rows[i].phi : 360;
          if (end > state.lo && offStart < state.hi) addPlot('rect', { x: x(offStart), y: 15, width: Math.max(0, x(end) - x(offStart)), height: height - 45, fill: 'var(--off)' });
          offStart = null;
        }
      }
      for (let row = 0; row < 3; row++) {
        append('text', { x: g.left, y: g.top + row * g.row, class: 'wave-label' }, ['相电压与 d1 电位', '负载电压 ud', 'VT1 两端电压'][row]);
        for (const value of [-1, 0, 1]) {
          addPlot('line', { x1: g.left, x2: g.right, y1: y(value, row), y2: y(value, row), class: value === 0 ? 'zero' : 'grid' });
          append('text', { x: g.left - 9, y: y(value, row) + 3, 'text-anchor': 'end', class: 'tick' }, String(value));
        }
      }
      const spacing = state.zoom ? 15 : width < 500 ? 120 : 60;
      for (let phi = Math.ceil(state.lo / spacing) * spacing; phi <= state.hi; phi += spacing) {
        addPlot('line', { x1: x(phi), x2: x(phi), y1: 17, y2: height - 31, class: 'grid' });
        append('text', { x: x(phi), y: height - 11, 'text-anchor': 'middle', class: 'tick' }, `${Math.round(phi + offset)}°`);
      }
      const curve = (values, key, row, color, dash = '', opacity = 1, thickness = 1.8) => {
        let d = '';
        for (const sample of values) {
          if (sample.phi < state.lo - 1 || sample.phi > state.hi + 1) continue;
          d += `${d ? 'L' : 'M'}${x(sample.phi).toFixed(2)},${y(sample[key], row).toFixed(2)}`;
        }
        return addPlot('path', { d, fill: 'none', stroke: color, 'stroke-width': thickness, 'stroke-dasharray': dash, opacity, 'vector-effect': 'non-scaling-stroke' });
      };
      if (state.references) { curve(rows, 'ub', 0, '#7d776e', '4 5', .65, 1); curve(rows, 'uc', 0, '#7d776e', '4 5', .65, 1); }
      curve(rows, 'ud1', 0, 'var(--node)', '5 3', 1, 2);
      curve(rows, 'ua', 0, 'var(--phase)', '8 4', 1, 1.8);
      curve(rows, 'ud', 1, 'var(--node)', '', 1, 2);
      if (state.compare) curve(series(state.mode === 'ideal' ? 'rc' : 'ideal'), 'uVT1', 2, 'var(--wine)', '6 4', .9, 1.8);
      curve(rows, 'uVT1', 2, 'var(--vt)', '', 1, 2.6);
      cursor = addPlot('line', { x1: 0, x2: 0, y1: 15, y2: height - 31, class: 'cursor' });
      dots = [[0, 'ua', 'var(--phase)'], [0, 'ud1', 'var(--node)'], [1, 'ud', 'var(--node)'], [2, 'uVT1', 'var(--vt)']].map(([row, key, color]) => ({ row, key, element: addPlot('circle', { r: 3.8, fill: color, stroke: 'var(--raised)', 'stroke-width': 1.5 }) }));
      paths = { x, y };
      $('other-legend').hidden = !state.compare;
      update();
    }
    function update() {
      const sample = point();
      if (state.zoom && (state.phi < state.lo || state.phi > state.hi)) { setWindow(); draw(); return; }
      $('angle').value = state.phi;
      $('angle-value').textContent = `ωt = ${(state.phi + offset).toFixed(1).replace('.0', '')}°`;
      $('read-ua').innerHTML = u('a');
      $('value-ua').textContent = voltage(sample.ua);
      $('value-d1').textContent = voltage(sample.ud1);
      $('value-vt1').textContent = voltage(sample.uVT1);
      $('load-current').textContent = `负载电流 id ≈ ${(sample.ud * peak / load).toFixed(2)} A`;
      const conducting = active(sample), upper = conducting.filter(id => [1, 3, 5].includes(id));
      const off = conducting.length === 0;
      window.ThyristorCircuit.update({active: conducting, mode: state.mode, phi: state.phi,
        theta: state.phi + offset, off, currents: Object.fromEntries([1, 2, 3, 4, 5, 6].map(id => [id, sample[`iVT${id}`]]))});
      $('bridge-circuit').dataset.ready = 'true';
      $('bridge-circuit').dataset.active = conducting.join(',');
      $('bridge-circuit').dataset.angle = String(state.phi + offset);
      $('state-dot').style.background = off ? 'var(--wine)' : 'var(--moss)';
      if (off) {
        $('state-title').textContent = 'SCR 断流';
        $('read-d1').innerHTML = state.mode === 'ideal' ? '0' : '≈ ' + u('x');
        $('read-vt1').innerHTML = state.mode === 'ideal' ? u('a') : '≈ ' + u('a') + ' − ' + u('x');
        $('instant-formula').innerHTML = state.mode === 'ideal' ? `${u('a')} − 0 = ${u('a')}` : `${u('x')} ≈ ${(sample.ud1 + sample.ud2) < 0 ? '−' : '+'}<i>U</i><sub>m</sub>/2`;
        $('state-description').textContent = state.mode === 'ideal' ? 'd1 取零，管压就是 a 相电压。' : 'd1、d2 的电位接近 ux。ua 比 ux 小时，VT1 的管压为负。RC 支路仍可能有小电流。';
      } else if (conducting.length === 2 && upper.length === 1) {
        const phase = {1: 'a', 3: 'b', 5: 'c'}[upper[0]], approximate = state.mode === 'rc' ? '≈ ' : '';
        $('read-d1').innerHTML = approximate + u(phase);
        $('read-vt1').innerHTML = approximate + (phase === 'a' ? '0' : u('a' + phase));
        $('instant-formula').innerHTML = `${u('a')} − ${u(phase)} = ${phase === 'a' ? '0' : u('a' + phase)}`;
        $('state-title').textContent = `VT${upper[0]} / VT${conducting.find(id => id !== upper[0])} 导通`;
        $('state-description').textContent = `d1 跟着 ${phase} 相变化。${state.mode === 'rc' ? '上面的符号关系忽略了很小的导通压降。' : ''}`;
      } else {
        $('read-d1').innerHTML = u('d1');
        $('read-vt1').innerHTML = u('a') + ' − ' + u('d1');
        $('instant-formula').innerHTML = '';
        $('state-title').textContent = '开关边沿附近';
        $('state-description').textContent = '这里正在切换。把光标移到区间中间，再看导通关系。';
      }
      if (cursor && paths) {
        const xpos = paths.x(sample.phi);
        cursor.setAttribute('x1', xpos); cursor.setAttribute('x2', xpos);
        for (const dot of dots) { dot.element.setAttribute('cx', xpos); dot.element.setAttribute('cy', paths.y(sample[dot.key], dot.row)); }
      }
    }
    function setWindow() {
      if (state.zoom) { state.lo = Math.max(0, Math.min(280, state.phi - 40)); state.hi = state.lo + 80; }
      else { state.lo = 0; state.hi = 360; }
    }
    function setMode(mode) {
      state.mode = mode;
      for (const button of document.querySelectorAll('button[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      $('scope').textContent = mode === 'ideal' ? '按课件画的示意：断流段取 ud1 = ud2 = 0。' : '保存的仿真波形：每管外接串联 RC（500 Ω、250 nF），直流端浮置。';
      draw();
    }
    function stop() { state.playing = false; $('play').textContent = '▶ 播放'; $('play').setAttribute('aria-pressed', 'false'); cancelAnimationFrame(raf); lastFrame = 0; }
    function frame(now) {
      if (!state.playing) return;
      if (lastFrame) state.phi = (state.phi + Math.min(now - lastFrame, 80) * .035) % 360;
      lastFrame = now; update(); raf = requestAnimationFrame(frame);
    }
    function play() {
      if (state.playing) return stop();
      observe();
      state.playing = true; $('play').textContent = 'Ⅱ 暂停'; $('play').setAttribute('aria-pressed', 'true'); lastFrame = 0; raf = requestAnimationFrame(frame);
    }
    function observe() {
      state.step = -1;
      $('step-count').textContent = '整周期'; $('previous').disabled = true; $('next').disabled = false;
      for (const dot of $('step-dots').children) dot.setAttribute('aria-current', 'false');
      $('step-title').textContent = state.mode === 'ideal' ? '课件示意' : 'RC 仿真';
      $('step-description').textContent = '拖动光标看各段电位，或点“下一步”按顺序看。';
    }
    function selectStep(index) {
      stop(); state.step = Math.max(0, Math.min(lesson.length - 1, index));
      const step = lesson[state.step];
      state.phi = step.phi; state.compare = !!step.compare; $('compare').checked = state.compare; setWindow();
      $('step-title').textContent = step.title; $('step-description').textContent = step.text;
      $('step-count').textContent = `${String(state.step + 1).padStart(2, '0')} / 06`;
      $('previous').disabled = state.step === 0; $('next').disabled = state.step === lesson.length - 1;
      for (const button of $('step-dots').children) button.setAttribute('aria-current', Number(button.dataset.step) === state.step ? 'step' : 'false');
      setMode(step.mode);
    }
    for (let i = 0; i < lesson.length; i++) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.step = i;
      button.setAttribute('aria-label', `第 ${i + 1} 步：${lesson[i].title}`); button.title = lesson[i].title;
      button.addEventListener('click', () => selectStep(i)); $('step-dots').append(button);
    }
    for (const button of document.querySelectorAll('button[data-mode]')) button.addEventListener('click', () => {
      stop(); setMode(button.dataset.mode); observe();
    });
    for (const button of document.querySelectorAll('[data-focus]')) button.addEventListener('click', () => { stop(); observe(); state.phi = Number(button.dataset.focus); setWindow(); draw(); });
    $('angle').addEventListener('input', event => { stop(); observe(); state.phi = Number(event.target.value); update(); });
    $('compare').addEventListener('change', event => { state.compare = event.target.checked; draw(); });
    $('phase-reference').addEventListener('change', event => { state.references = event.target.checked; draw(); });
    $('play').addEventListener('click', play);
    $('previous').addEventListener('click', () => selectStep(state.step - 1)); $('next').addEventListener('click', () => selectStep(state.step + 1));
    $('reset').addEventListener('click', () => { state.zoom = false; $('zoom').setAttribute('aria-pressed', 'false'); $('zoom').textContent = '放大光标附近'; selectStep(0); });
    $('zoom').addEventListener('click', () => { state.zoom = !state.zoom; $('zoom').setAttribute('aria-pressed', String(state.zoom)); $('zoom').textContent = state.zoom ? '恢复完整周期' : '放大光标附近'; setWindow(); draw(); });
    const moveCursor = event => {
      const box = $('waveform').getBoundingClientRect();
      const xpos = (event.clientX - box.left) / box.width * geometry.width;
      state.phi = Math.max(state.lo, Math.min(state.hi, state.lo + (xpos - geometry.left) / (geometry.right - geometry.left) * (state.hi - state.lo)));
      update();
    };
    $('waveform').addEventListener('pointerdown', event => { stop(); observe(); moving = true; $('waveform').setPointerCapture(event.pointerId); moveCursor(event); });
    $('waveform').addEventListener('pointermove', event => { if (moving) moveCursor(event); });
    $('waveform').addEventListener('pointerup', () => { moving = false; }); $('waveform').addEventListener('pointercancel', () => { moving = false; });
    async function fullscreen() {
      try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
      catch { document.body.classList.toggle('presenting'); $('fullscreen').textContent = document.body.classList.contains('presenting') ? '退出演示 ⛶' : '全屏演示 ⛶'; }
    }
    $('fullscreen').addEventListener('click', fullscreen);
    document.addEventListener('fullscreenchange', () => { document.body.classList.toggle('presenting', !!document.fullscreenElement); $('fullscreen').textContent = document.fullscreenElement ? '退出全屏 ⛶' : '全屏演示 ⛶'; });
    document.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || $('circuit-dialog').open || $('share-dialog').open) return;
      if (event.target.matches('input,textarea,select') || event.key === ' ' && event.target.matches('button,a')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); selectStep(state.step + 1); }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); selectStep(state.step - 1); }
      if (event.key === ' ') { event.preventDefault(); play(); }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
      if (event.key === 'Escape') { stop(); if (!document.fullscreenElement) { document.body.classList.remove('presenting'); $('fullscreen').textContent = '全屏演示 ⛶'; } }
    });
    $('circuit-button').addEventListener('click', () => { stop(); $('circuit-dialog').showModal(); }); $('close-circuit').addEventListener('click', () => $('circuit-dialog').close());
    $('share').addEventListener('click', () => { stop(); $('share-dialog').showModal(); }); $('close-share').addEventListener('click', () => $('share-dialog').close());
    $('circuit-dialog').addEventListener('click', event => { if (event.target === $('circuit-dialog')) { const box = event.target.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.target.close(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    if (location.protocol === 'file:' && $('download').hasAttribute('download')) { $('download').removeAttribute('download'); $('download').href = 'https://yichuanxiang.github.io/downloads/thyristor-alpha90-classroom.zip'; $('download').textContent = '在线下载模型资料 ↗'; }
    selectStep(0); new ResizeObserver(draw).observe($('graph-host'));
  } catch (error) {
    $('error').hidden = false; $('error').textContent = error.message; $('scope').textContent = '波形未加载，请使用完整的演示文件夹。';
    console.error(error);
  }
})();
