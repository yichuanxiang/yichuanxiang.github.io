(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const lesson = [
    { title: '从阳极和阴极的电位开始', text: 'VT1 的阳极接 a 相，阴极接公共端 d1。先确认电压方向，再用 uVT1 = ua − ud1。零负载电流只约束 d1 与 d2 的电位差。', phi: 15, mode: 'ideal' },
    { title: 'VT1 自己导通：两端电位接近', text: 'VT1 把 d1 钳位到 a 相，所以 ua 与 ud1 重合，管压约为零。含 RC 的器件模型保留了约 0.8 V 的小导通压降。', phi: 75, mode: 'ideal' },
    { title: '另一只上桥臂导通：VT1 承受线电压', text: '这里 VT3 导通，d1 跟随 b 相，于是 uVT1 ≈ ua − ub = uab。VT5 导通时同理得到 uac。下桥臂与上桥臂共同组成负载电流通路。', phi: 135, mode: 'ideal' },
    { title: '课件的断流段：采用零公共电位约定', text: '这幅课件示意在断流段取 ud1 = ud2 = 0，所以 uVT1 = ua，青色管压沿红色相电压变化。这是一条解析示意曲线，不能称为无 RC 完整切换仿真的验证结果。', phi: 45, mode: 'ideal' },
    { title: '加入外接 RC 后：先求公共电位 ux', text: '本模型第一段 ux 约为 +Um/2，第二段约为 −Um/2。两段都要看 ua − ux：165° 时 ua 小于正 ux，225° 时 ua 比负 ux 更负，差值都可以是负的。点击“第一段断流”和“第二段断流”对照。', phi: 45, mode: 'rc' },
    { title: '带着模型条件，回到同一个电位差关系', text: '叠加图展示的是两种条件，不是两次同一电路的仿真。通用关系是 uVT1 = ua − ud1；±半峰公共电位仅是这套对称 RC 电路的稳态近似。实际器件还要按实物参数分析。', phi: 45, mode: 'rc', compare: true }
  ];
  try {
    const data = window.THYRISTOR_DATA;
    if (!data || !data.modes) throw new Error('波形资料未加载。请确认网页、data.js 与脚本在同一目录。');
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
    const norm = n => Math.abs(n) < 0.00005 ? '0.000' : n.toFixed(3);
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
      $('read-ua').textContent = voltage(sample.ua);
      $('read-d1').textContent = voltage(sample.ud1);
      $('read-vt1').textContent = voltage(sample.uVT1);
      $('instant-formula').textContent = `${norm(sample.ua)} − (${norm(sample.ud1)}) = ${norm(sample.uVT1)} Uₘ`;
      $('load-current').textContent = `负载电流 id ≈ ${(sample.ud * peak / load).toFixed(2)} A`;
      const conducting = active(sample), upper = conducting.filter(id => [1, 3, 5].includes(id));
      const off = conducting.length === 0;
      $('state-dot').style.background = off ? 'var(--wine)' : 'var(--moss)';
      if (off) {
        $('state-title').textContent = '主导电流中断';
        $('state-description').textContent = state.mode === 'ideal' ? '按课件约定 d1、d2 的共同电位为零，VT1 管压等于 a 相电压。' : `d1、d2 接近共同电位 ux ≈ ${norm((sample.ud1 + sample.ud2) / 2)} Uₘ。管压由 ua − ud1 求得；RC 和截止漏电仍可能有小电流。`;
      } else if (conducting.length === 2 && upper.length === 1) {
        $('state-title').textContent = `VT${upper[0]} / VT${conducting.find(id => id !== upper[0])} 导通`;
        $('state-description').textContent = upper[0] === 1 ? 'd1 跟随 a 相。VT1 自己导通，管压为零或小导通压降。' : `d1 跟随 ${upper[0] === 3 ? 'b' : 'c'} 相，VT1 的管压接近 ${upper[0] === 3 ? 'uab' : 'uac'}。`;
      } else {
        $('state-title').textContent = '开关边沿附近';
        $('state-description').textContent = '当前位于状态切换附近。移动光标到区间内部，可以更清楚地看出节点钳位与断流电位。';
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
      for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      $('scope').textContent = mode === 'ideal' ? '课件约定：全截止段 ud1 = ud2 = 0。这是解析示意；无 RC 的完整切换仿真尚未通过校验。' : '指定电路仿真：六条外接 RC（500 Ω / 250 nF），直流端未接中性点；曲线来自已保存的 Simscape 传感器数据。';
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
      state.playing = true; $('play').textContent = 'Ⅱ 暂停'; $('play').setAttribute('aria-pressed', 'true'); lastFrame = 0; raf = requestAnimationFrame(frame);
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
    for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
      stop(); setMode(button.dataset.mode); state.step = -1;
      $('step-count').textContent = '自由观察'; $('previous').disabled = true; $('next').disabled = false;
      for (const dot of $('step-dots').children) dot.setAttribute('aria-current', 'false');
      $('step-title').textContent = state.mode === 'ideal' ? '课件约定：从各段的 d1 电位判断' : '外接 RC 模型：观察电路求得的 d1 电位';
      $('step-description').textContent = state.mode === 'ideal' ? '上桥臂导通时 d1 跟随相应相电压；全截止段按课件取零公共电位。拖动光标比较同一时刻的 ua、ud1 与管压，也可以点“下一步”回到指图讲解。' : '导通时 d1 被上桥臂钳位，断流时要保留本网络求得的公共电位。两种模式采用不同条件；这里的曲线是已有仿真数据，不是实物测量。';
    });
    for (const button of document.querySelectorAll('[data-focus]')) button.addEventListener('click', () => { stop(); state.phi = Number(button.dataset.focus); setWindow(); draw(); });
    $('angle').addEventListener('input', event => { stop(); state.phi = Number(event.target.value); update(); });
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
    $('waveform').addEventListener('pointerdown', event => { stop(); moving = true; $('waveform').setPointerCapture(event.pointerId); moveCursor(event); });
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
