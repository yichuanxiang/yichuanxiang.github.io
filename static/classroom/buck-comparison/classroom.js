(() => {
  'use strict';
  const image = document.getElementById('comparison-image');
  const note = document.getElementById('scope-note');
  const dialog = document.getElementById('image-dialog');
  const modeCopy = {
    dcm: {
      label: '断续工况',
      rleTitle: '断流后，uo 回到 EM',
      rle: '电感和负载电流都是 io。归零时 VT、VD 均截止，电阻、电感压降接近零，整个负载两端 uo≈EM，管压 uVT≈Ed−EM。',
      lcTitle: 'iL 归零，负载仍有电流',
      lc: 'uo 测输出电容两端。归零区间 iL≈0，而 iR>0、iC≈−iR，电容继续向电阻供电；us≈uo，管压 uVT≈Ed−uo。',
      alt: '两种 Buck 的断续波形：L-R-EM 断流后 uo≈EM；LC 型 iL 归零时由电容继续给负载供电。'
    },
    ccm: {
      label: '连续工况',
      rleTitle: '同一条电流，按指数变化',
      rle: 'io 就是电感电流，下个周期开始前仍为正。VT 导通时 uo≈Ed、io 上升；VT 截止后由 VD 续流，uo≈0、io 下降。电阻压降随电流变化，各段是指数曲线。',
      lcTitle: '电感近似三角波，输出只有小纹波',
      lc: '电容使一周期内的 uo 变化很小。导通时电感电压约为 Ed−uo，续流时约为 −uo，iL 的两段斜率近似不变。电感电流分到电阻和电容，iL=iR+iC。',
      alt: '两种 Buck 的连续波形：L-R-EM 电流按指数变化；LC 型电感电流近似三角波，输出电压保持小纹波。'
    }
  };
  const fromHash = location.hash.slice(1).split('-');
  let mode = fromHash[0] === 'ccm' ? 'ccm' : 'dcm';
  let view = fromHash[1] === 'native' ? 'native' : 'symbols';
  const render = () => {
    const copy = modeCopy[mode];
    const src = `images/${mode}-${view}.png`;
    image.src = src;
    image.alt = `${view === 'native' ? '原生 Simulink 电路与 Scope 截图。' : ''}${copy.alt}`;
    image.height = view === 'native' ? 2205 : 2520;
    document.getElementById('original-link').href = src;
    document.getElementById('zoom-image').src = src;
    document.getElementById('zoom-image').alt = image.alt;
    document.getElementById('download-image').href = src;
    document.getElementById('dialog-title').textContent = `${copy.label} · ${view === 'native' ? '原生截图' : '符号波形'}`;
    note.textContent = `${copy.label} · ${view === 'native' ? '上方为原生主电路，下方为运行后的 Scope；LC 输出纹波放大显示。' : '曲线来自实际传感器数据，幅值按各行独立缩放。'}`;
    document.getElementById('rle-title').textContent = copy.rleTitle;
    document.getElementById('rle-explanation').textContent = copy.rle;
    document.getElementById('lc-title').textContent = copy.lcTitle;
    document.getElementById('lc-explanation').textContent = copy.lc;
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    history.replaceState(null, '', `#${mode}-${view}`);
  };
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; render(); }));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; render(); }));
  window.addEventListener('hashchange', () => {
    const next = location.hash.slice(1).split('-');
    mode = next[0] === 'ccm' ? 'ccm' : 'dcm';
    view = next[1] === 'native' ? 'native' : 'symbols';
    render();
  });
  document.getElementById('open-image').addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.getElementById('fullscreen').addEventListener('click', async () => {
    const status = document.getElementById('status');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else status.textContent = '此浏览器不支持页面全屏，可以点击对比图放大。';
    } catch { status.textContent = '此浏览器未允许全屏，可以点击对比图放大。'; }
  });
  document.addEventListener('fullscreenchange', () => { document.getElementById('fullscreen').textContent = document.fullscreenElement ? '退出全屏 ⛶' : '全屏演示 ⛶'; });
  image.addEventListener('error', () => { note.textContent = '图片暂未载入，可以刷新或下载下方资料包查看。'; });
  render();
})();
