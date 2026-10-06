(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const P = [{ phase: 'a', x: 72, y: 154, upper: 1, lower: 4 }, { phase: 'b', x: 150, y: 184, upper: 3, lower: 6 }, { phase: 'c', x: 228, y: 214, upper: 5, lower: 2 }];
  let host, caption, route, devices = {}, phaseNodes = {}, sourceNodes = {}, desc;
  const el = (tag, attrs = {}, text) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const add = (parent, tag, attrs, text) => { const n = el(tag, attrs, text); parent.append(n); return n; };
  const phasePath = p => {
    let d = `M43 ${p.y}`;
    for (const q of P) {
      if (q.x >= p.x) break;
      d += ` H${q.x - 6} Q${q.x} ${p.y - 8} ${q.x + 6} ${p.y}`;
    }
    return `${d} H${p.x}`;
  };
  const line = (parent, x1, y1, x2, y2, cls = 'bc-wire') => add(parent, 'line', { x1, y1, x2, y2, class: cls });
  function init(container) {
    host = container || document.getElementById('bridge-circuit');
    caption = document.getElementById('circuit-caption');
    if (!host) return false;
    host.replaceChildren(); devices = {}; phaseNodes = {}; sourceNodes = {};
    host.setAttribute('viewBox', '0 0 330 360');
    host.setAttribute('role', 'img');
    host.setAttribute('aria-labelledby', 'bridge-circuit-title bridge-circuit-desc');
    add(host, 'title', { id: 'bridge-circuit-title' }, '三相全控桥：晶闸管导通状态');
    desc = add(host, 'desc', { id: 'bridge-circuit-desc' }, '上桥臂 VT1、VT3、VT5；下桥臂 VT4、VT6、VT2。');
    add(host, 'style', {}, `
      .bc-wire{fill:none;stroke:#a8a39a;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
      .bc-symbol{fill:#fffdf8;stroke:currentColor;stroke-width:1.9;stroke-linejoin:round}
      .bc-device{color:#8c887f}.bc-device.is-on{color:#147c64}.bc-device.is-measured:not(.is-on){color:#0083a2}
      .bc-name{fill:#36332d;font:600 13px system-ui,sans-serif}.bc-state{fill:#827c71;font:12px system-ui,sans-serif}
      .is-on .bc-name,.is-on .bc-state{fill:#147c64}.is-measured .bc-name{fill:#0083a2}
      .bc-label{fill:#5d574c;font:12px system-ui,sans-serif}.bc-node-label{fill:#245bab;font:600 13px system-ui,sans-serif}
      .bc-path{fill:none;stroke:#147c64;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      .bc-direction{fill:none;stroke:#147c64;stroke-width:2;marker-end:url(#bc-arrow)}
      .bc-dot{fill:#7f796f}.bc-dot.is-on{fill:#147c64}.bc-return{fill:#147c64;font:11px system-ui,sans-serif}
      .bc-gate{stroke:currentColor;stroke-width:1.5;fill:none}.bc-rc-note{fill:#9a7133;font:11px system-ui,sans-serif}
    `);
    const defs = add(host, 'defs');
    const marker = add(defs, 'marker', { id: 'bc-arrow', markerWidth: 5, markerHeight: 5, refX: 4, refY: 2.5, orient: 'auto', markerUnits: 'strokeWidth' });
    add(marker, 'path', { d: 'M0 0 L5 2.5 L0 5 Z', fill: '#147c64' });
    add(host, 'text', { x: 16, y: 16, class: 'bc-label' }, '三相电源');
    add(host, 'text', { x: 259, y: 16, class: 'bc-label' }, '电阻负载');
    const wires = add(host, 'g');
    line(wires, 72, 36, 296, 36); line(wires, 72, 316, 296, 316);
    for (const p of P) line(wires, p.x, 36, p.x, 316);
    line(wires, 296, 36, 296, 147); line(wires, 296, 211, 296, 316);
    add(wires, 'rect', { x: 288, y: 147, width: 16, height: 64, class: 'bc-wire', fill: '#fffdf8' });
    add(host, 'text', { x: 313, y: 184, class: 'bc-name', 'text-anchor': 'middle' }, 'R');
    line(wires, 14, 154, 14, 214);
    for (const p of P) {
      line(wires, 14, p.y, 27, p.y);
      sourceNodes[p.phase] = add(wires, 'circle', { cx: 35, cy: p.y, r: 8, class: 'bc-wire', fill: '#fffdf8' });
      add(host, 'text', { x: 35, y: p.y + 4, class: 'bc-label', 'text-anchor': 'middle' }, '~');
      // White under-stroke makes each jump visibly cross without joining another phase.
      add(wires, 'path', { d: phasePath(p), fill: 'none', stroke: '#fffdf8', 'stroke-width': 6 });
      add(wires, 'path', { d: phasePath(p), class: 'bc-wire' });
      phaseNodes[p.phase] = add(wires, 'circle', { cx: p.x, cy: p.y, r: 3, class: 'bc-dot' });
      add(host, 'text', { x: p.x - 9, y: p.y - 10, class: 'bc-name', 'text-anchor': 'end' }, p.phase);
    }
    line(wires, 14, 214, 14, 238);
    line(wires, 6, 238, 22, 238);
    line(wires, 9, 242, 19, 242);
    line(wires, 12, 246, 16, 246);
    add(host, 'text', { x: 24, y: 233, class: 'bc-label' }, 'N');
    add(host, 'text', { x: 265, y: 30, class: 'bc-node-label' }, 'd₁');
    add(host, 'text', { x: 265, y: 333, class: 'bc-node-label' }, 'd₂');
    route = add(host, 'g', { 'aria-hidden': 'true' });
    for (const p of P) {
      for (const [id, y] of [[p.upper, 93], [p.lower, 257]]) {
        const g = add(host, 'g', { class: `bc-device${id === 1 ? ' is-measured' : ''}`, 'data-vt': id });
        // Both SCRs have A below and K above. Main current is upward.
        add(g, 'rect', { x: p.x - 13, y: y - 18, width: 26, height: 37, fill: '#fffdf8' });
        add(g, 'path', { d: `M${p.x} ${y - 18} V${y - 12} M${p.x} ${y + 10} V${y + 19}`, class: 'bc-gate' });
        add(g, 'path', { d: `M${p.x - 9} ${y + 10} L${p.x} ${y - 12} L${p.x + 9} ${y + 10} Z M${p.x - 11} ${y - 12} H${p.x + 11}`, class: 'bc-symbol' });
        add(g, 'path', { d: `M${p.x - 16} ${y + 10} L${p.x - 5} ${y + 2}`, class: 'bc-gate' });
        add(g, 'text', { x: p.x + 15, y: y - 13, class: 'bc-name' }, `VT${id}`);
        const label = add(g, 'text', { x: p.x + 15, y: y + 9, class: 'bc-state' }, '截止');
        devices[id] = { group: g, label, x: p.x, y, phase: p.phase, upper: id === p.upper };
      }
    }
    add(host, 'text', { x: 14, y: 355, class: 'bc-label' }, 'A → K：上、下桥臂均向上');
    update({ active: [], mode: 'ideal', off: true });
    return true;
  }
  function update({ active = [], mode = 'ideal', theta, phi, currents = {} } = {}) {
    if (!host && !init()) return;
    const ids = [...new Set(active.map(Number))].filter(id => devices[id]);
    const set = new Set(ids);
    for (const [id, device] of Object.entries(devices)) {
      const on = set.has(Number(id));
      device.group.classList.toggle('is-on', on);
      device.group.dataset.state = on ? 'conducting' : 'off';
      device.label.textContent = on ? '导通' : '截止';
    }
    for (const p of P) {
      const on = set.has(p.upper) || set.has(p.lower);
      phaseNodes[p.phase].classList.toggle('is-on', on);
      sourceNodes[p.phase].setAttribute('stroke', on ? '#147c64' : '#a8a39a');
    }
    route.replaceChildren();
    const uppers = ids.filter(id => devices[id].upper), lowers = ids.filter(id => !devices[id].upper);
    const pair = ids.length === 2 && uppers.length === 1 && lowers.length === 1 && devices[uppers[0]].phase !== devices[lowers[0]].phase;
    const positive = pair && ids.every(id => Number(currents[id]) > 0.05);
    let text;
    if (positive) {
      const upper = P.find(p => p.upper === uppers[0]), lower = P.find(p => p.lower === lowers[0]);
      const top = `M${upper.x} ${upper.y} V36 H296 V147 M296 211 V316 H${lower.x} V${lower.y}`;
      add(route, 'path', { d: top, class: 'bc-path' });
      add(route, 'rect', { x: 288, y: 147, width: 16, height: 64, class: 'bc-path', fill: '#fffdf8' });
      for (const p of [upper, lower]) {
        add(route, 'path', { d: phasePath(p), fill: 'none', stroke: '#fffdf8', 'stroke-width': 7 });
        add(route, 'path', { d: phasePath(p), class: 'bc-path' });
        line(route, 14, p.y, 27, p.y, 'bc-path');
        add(route, 'circle', { cx: 35, cy: p.y, r: 8, class: 'bc-path' });
      }
      line(route, 14, upper.y, 14, lower.y, 'bc-path');
      line(route, upper.x, 63, upper.x, 48, 'bc-direction');
      line(route, lower.x, 302, lower.x, 287, 'bc-direction');
      line(route, 296, 240, 296, 260, 'bc-direction');
      add(route, 'text', { x: 160, y: 337, class: 'bc-return', 'text-anchor': 'middle' }, `电源回路：${lower.phase} → N → ${upper.phase}`);
      text = `VT${upper.upper}、VT${lower.lower} 导通，其余截止。电流：${upper.phase} 相 → VT${upper.upper} → d₁ → R → d₂ → VT${lower.lower} → ${lower.phase} 相，经电源回到 ${upper.phase} 相。`;
    } else if (ids.length === 0) {
      text = mode === 'rc' ? '六只 SCR 均截止，负载主电流断续。RC／漏电支路仍可有小电流。' : '六只晶闸管均截止，主电流断续。课件在这段取 d₁、d₂ 电位为零。';
      if (mode === 'rc') add(route, 'text', { x: 160, y: 337, class: 'bc-rc-note', 'text-anchor': 'middle' }, 'RC／漏电小电流未画方向');
    } else {
      text = `切换中：${ids.map(id => `VT${id}`).join('、')} 有电流；此处不画唯一的主电流回路。`;
      add(route, 'text', { x: 160, y: 337, class: 'bc-label', 'text-anchor': 'middle' }, '切换中');
    }
    if (mode === 'rc') text += ' 图中省略六组 RC 支路。';
    const angle = Number.isFinite(theta) ? theta : Number.isFinite(phi) ? phi + 120 : null;
    host.dataset.mode = mode;
    host.dataset.active = ids.join(',');
    host.dataset.closedLoop = String(positive);
    desc.textContent = `${angle === null ? '' : `ωt = ${angle.toFixed(1)}°。`}${text}`;
    if (caption) caption.textContent = text;
  }
  window.ThyristorCircuit = { init, update };
})();
