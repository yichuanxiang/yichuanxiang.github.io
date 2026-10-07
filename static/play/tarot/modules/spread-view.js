import { cardArt } from './card-art.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderSpreadDiagram(spread) {
  const { columns, rows, slots } = spread.layout;
  const width=columns*28+8,height=rows*37+8;
  return `<svg class="spread-diagram" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(spread.shortName)}，${spread.positions.length}张牌的布局预览"><title>${escape(spread.shortName)}布局</title>${slots.map((slot,i)=>{
    const x=(slot.column-1)*28+18,y=(slot.row-1)*37+23;
    const covered=slots.some((other,j)=>j!==i&&other.column===slot.column&&other.row===slot.row&&other.rotate);
    return `<g transform="translate(${x} ${y})"><rect x="-10" y="-15" width="20" height="30" rx="2"${slot.rotate?' transform="rotate(90)"':''}/><text y="${covered?-10:0}" text-anchor="middle" dominant-baseline="central">${i+1}</text></g>`;
  }).join('')}</svg>`;
}

export function renderSpreadBoard(spread, cards=[], theme='forest') {
  const count=spread.positions.length,filled=cards.length;
  const crossed=spread.layout.slots.some(slot=>slot.rotate);
  const board=`<div class="spread-board${count>=7?' spread-board-large':''}${crossed?' spread-board-crossed':''}" style="--spread-columns:${spread.layout.columns};--spread-rows:${spread.layout.rows};--spread-width:${spread.layout.columns*104+(spread.layout.columns-1)*28}px" role="group" aria-label="${escape(spread.shortName)}牌阵，已抽${filled}张，共${count}张">${spread.layout.slots.map((slot,i)=>{
    const card=cards[i],position=spread.positions[i];
    const picture=card?`<button type="button" class="spread-card" data-spread-card="${escape(card.id)}" data-spread-reversed="${card.reversed?'true':'false'}" data-spread-theme="${escape(theme)}" aria-label="放大第${i+1}张，${escape(position)}，${escape(card.name)}，${card.reversed?'逆位':'正位'}"${slot.rotate?' style="transform:rotate(90deg)"':''}>${cardArt(card,card.reversed,theme)}</button>`:`<div class="spread-card"${slot.rotate?' style="transform:rotate(90deg)"':''}><span aria-hidden="true">✧</span></div>`;
    return `<div class="spread-slot${card?' is-filled':''}${i===filled&&!card?' is-next':''}${slot.rotate?' is-crossing':''}" style="grid-column:${slot.column};grid-row:${slot.row};z-index:${slot.layer||1}" title="${escape(position)}：${escape(spread.positionNotes[i])}">${picture}<span class="spread-slot-number" aria-hidden="true">${i+1}</span><span class="sr-only">${i+1}．${escape(position)}：${card?`${escape(card.name)}，${card.reversed?'逆位':'正位'}`:'待抽牌'}</span></div>`;
  }).join('')}</div>`;
  const legend=`<ol class="spread-position-list">${spread.positions.map((position,i)=>{
    const card=cards[i];
    return `<li${i===filled&&!card?' class="next-position"':''}><span class="position-index">${i+1}</span><div><strong>${escape(position)}</strong><span class="position-card-name">${card?`${escape(card.name)} · ${card.reversed?'逆位':'正位'}`:'待抽牌'}</span><small>${escape(spread.positionNotes[i])}</small></div></li>`;
  }).join('')}</ol>`;
  return board+legend;
}
