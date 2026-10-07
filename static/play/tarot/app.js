import { DECK, SPREADS, CATEGORIES } from './modules/deck.js';
import { generateReading, validateReading } from './modules/reading.js';
import { normalizeApiConfig, requestApiReading } from './modules/api-client.js';
import { cardArt, cardBack } from './modules/card-art.js';
import { CARD_THEMES, DEFAULT_CARD_THEME, CHARACTERS, SHOWCASE_CARDS, getCardTheme, setCardTheme, getCardCharacters, getCardScene } from './modules/deck-themes.js';
import { BOTAN_V8_READY } from './modules/botan-v8-ready.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CARD_MAP = new Map(DECK.map(card => [card.id, card]));
const JOURNAL_KEY = 'moonlit.public.journal.v1';
const DAILY_KEY = 'moonlit.public.daily.v1';
const THEME_KEY = 'moonlit.public.card-theme.v1';
const API_PREFERENCES_KEY = 'moonlit.public.api-preferences.v1';
const state = { page:'reading',category:'general',spread:'three',question:'',deck:[],drawn:[],selected:new Set(),busy:false,controller:null,session:null,readingMode:'offline',apiConfig:null,apiStatus:'unverified',librarySuit:'all',libraryCharacter:'all',libraryScene:'all' };
let toastTimer;
let libraryImageObserver;
let journal = loadJournal();

function toast(message, action) {
  const el = $('#toast');
  clearTimeout(toastTimer);
  el.replaceChildren(document.createTextNode(message));
  if (action) { const btn=document.createElement('button');btn.textContent=action.label;btn.onclick=()=>{action.run();el.hidden=true;};el.append(btn); }
  el.hidden=false;
  toastTimer=setTimeout(()=>{el.hidden=true;},action?9000:3500);
}
function loadJournal() {
  try {
    const data=JSON.parse(localStorage.getItem(JOURNAL_KEY)||'[]');
    if(!Array.isArray(data))return [];
    return data.filter(item=>item&&typeof item.id==='string'&&typeof item.question==='string'&&item.question.length<=500&&Object.hasOwn(SPREADS,item.spread)&&CATEGORIES.some(c=>c.id===item.category)&&['offline','ai'].includes(item.mode)&&Number.isFinite(Date.parse(item.date))&&Array.isArray(item.cards)&&item.cards.length===SPREADS[item.spread].positions.length&&new Set(item.cards.map(c=>c?.id)).size===item.cards.length&&item.cards.every(c=>c&&CARD_MAP.has(c.id)&&typeof c.reversed==='boolean')&&validateReading(item.reading,{cards:item.cards})).slice(0,50);
  }catch{return [];}
}
function storeJournal(next) {
  try {localStorage.setItem(JOURNAL_KEY,JSON.stringify(next));journal=next;$('#journal-count').textContent=String(journal.length);return true;}
  catch {toast('浏览器暂时无法保存，请检查存储空间或隐私设置。');return false;}
}
function randomInt(max) {
  const limit=Math.floor(0x100000000/max)*max;
  const a=new Uint32Array(1);
  do{crypto.getRandomValues(a);}while(a[0]>=limit);
  return a[0]%max;
}
function sessionId() {
  if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function shuffledDeck() {
  const cards=[...DECK];
  for(let i=cards.length-1;i>0;i--){const j=randomInt(i+1);[cards[i],cards[j]]=[cards[j],cards[i]];}
  return cards.slice(0,12).map(card=>({id:card.id,reversed:randomInt(2)===1}));
}
function resolveCards(cards) {return cards.map(c=>({...CARD_MAP.get(c.id),reversed:c.reversed}));}
function say(message) {$('#luna-message').textContent=message;}
function showPage(page) {
  if(state.busy&&page!=='reading')cancelReading();
  state.page=page;
  $$('.page').forEach(el=>{el.hidden=el.id!==`page-${page}`;});
  $$('.nav-item').forEach(btn=>{const active=btn.dataset.page===page;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});
  const labels={reading:'占卜空间',journal:'占卜手记',library:'塔罗图鉴'};
  $('#page-label').textContent=labels[page];
  if(page==='journal')renderJournal();
  if(page==='library')renderLibrary();
  window.scrollTo({top:0,behavior:'instant'});
}
function scrollTo(el) {el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
function renderCategories() {
  const symbols={general:'✧',love:'♡',career:'♧',growth:'❋'};
  const labels={general:'综合指引',love:'感情关系',career:'事业学业',growth:'自我成长'};
  $('#categories').innerHTML=CATEGORIES.map(c=>`<button type="button" data-category="${c.id}" class="${c.id===state.category?'active':''}" aria-pressed="${c.id===state.category}"><span>${symbols[c.id]}</span>${labels[c.id]}</button>`).join('');
}
function renderSpreads() {
  const descriptions={single:'一个问题，一点启发',three:'处境 · 关注 · 行动',relationship:'需要 · 互动 · 方向'};
  const names={single:'单牌指引',three:'三牌探索',relationship:'关系镜像'};
  $('#spreads').innerHTML=Object.values(SPREADS).map(s=>`<label class="spread-option"><input type="radio" name="spread" value="${s.id}" ${s.id===state.spread?'checked':''}><span class="mini-spread ${s.id}">${s.positions.map(()=>'<i></i>').join('')}</span><strong>${names[s.id]}</strong><small>${descriptions[s.id]}</small></label>`).join('');
}
function beginDraw(event) {
  event?.preventDefault();
  const question=$('#question').value.trim();
  if(!question){$('#question').value='';$('#question').reportValidity();$('#question').focus();return;}
  state.controller?.abort();
  Object.assign(state,{question,deck:shuffledDeck(),drawn:[],selected:new Set(),busy:false,session:null});
  $('#question-form').hidden=true;$('#draw-section').hidden=false;$('#result').hidden=true;
  $('#reading-error').hidden=true;$('#reading-status').textContent='';
  $('#use-local-reading').hidden=true;
  $('#draw-question').textContent=question;
  $('#draw-title').textContent=`跟随直觉，选择 ${SPREADS[state.spread].positions.length} 张牌`;
  renderSlots();renderDeck();updateProgress();
  say('慢慢来，选你想停留的那张牌。我会陪你一起看。');
  scrollTo($('#workspace'));
  $('#deck button')?.focus({preventScroll:true});
}
function renderSlots() {
  $('#card-slots').innerHTML=SPREADS[state.spread].positions.map((position,i)=>{const drawn=state.drawn[i],card=drawn&&CARD_MAP.get(drawn.id);return `<div class="card-slot ${drawn?'selected':''}"><div>${card?cardArt(card,drawn.reversed):'✧'}</div><small>${escape(position)}</small>${card?`<strong>${escape(card.name)}<span class="orientation">${drawn.reversed?'逆位':'正位'}</span></strong>`:''}</div>`;}).join('');
}
function renderDeck() {
  $('#deck').innerHTML=state.deck.map((_,i)=>`<button type="button" class="deck-card" data-deck-index="${i}" aria-label="选择第 ${i+1} 张牌">${cardBack()}</button>`).join('');
}
function updateProgress() {
  const total=SPREADS[state.spread].positions.length,complete=state.drawn.length===total;
  $('#draw-progress').textContent=complete?'你的牌已经就位。准备好听听露娜的解读了吗？':`已选择 ${state.drawn.length} / ${total} 张 · 下一张：${SPREADS[state.spread].positions[state.drawn.length]}`;
  $('#interpret').disabled=!complete||state.busy;
  if(!state.busy)$('#interpret').firstElementChild.textContent=state.readingMode==='ai'?'AI 解读这组牌':state.session?.mode==='offline'?'再次解读这组牌':'解读这组牌';
  $$('#deck button').forEach(btn=>{const selected=state.selected.has(Number(btn.dataset.deckIndex));btn.disabled=selected||complete||state.busy;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});
}
function pickCard(index) {
  if(state.busy||state.selected.has(index)||state.drawn.length>=SPREADS[state.spread].positions.length)return;
  state.selected.add(index);state.drawn.push(state.deck[index]);renderSlots();updateProgress();
  const last=CARD_MAP.get(state.drawn.at(-1).id);
  const complete=state.drawn.length===SPREADS[state.spread].positions.length;
  say(complete?`「${last.name}」也来到你身边了。让我们把这组牌连起来看看吧。`:`你选择了「${last.name}」。保持这个节奏，再选下一张。`);
  if(complete)$('#interpret').focus({preventScroll:true});else $('#deck button:not(:disabled)')?.focus({preventScroll:true});
}
async function interpret() {
  if(state.busy||state.drawn.length!==SPREADS[state.spread].positions.length)return;
  const mode=state.readingMode;
  if(mode==='ai'&&!state.apiConfig){openSettings();return;}
  state.busy=true;state.controller=new AbortController();
  state.session=null;$('#result').hidden=true;
  const controller=state.controller;
  const input={question:state.question,category:state.category,spread:state.spread,cards:state.drawn.map(c=>({...c}))};
  const cardTheme=getCardTheme();
  setReadingBusy(true);
  updateProgress();$('#back-question').disabled=true;$('#reading-error').hidden=true;
  $('#use-local-reading').hidden=true;
  $('#interpret').classList.add('pending');$('#interpret').firstElementChild.textContent=mode==='ai'?'AI 正在解读，请稍等':'露娜正在整理牌面的线索';
  $('#reading-status').textContent=mode==='ai'?'正在请求你配置的 API，最多等待 60 秒。':'正在浏览器中整理本地牌义。';
  say('每张牌都有一个不同的视角。我正在把它们连成你的故事。');
  try {
    await new Promise(resolve=>requestAnimationFrame(resolve));
    if(state.controller!==controller||controller.signal.aborted)return;
    const reading=mode==='ai'?await requestApiReading({config:state.apiConfig,input,cards:resolveCards(input.cards),signal:controller.signal}):generateReading({...input,cards:resolveCards(input.cards)});
    if(state.controller!==controller||controller.signal.aborted)return;
    if(!validateReading(reading,{cards:input.cards}))throw new Error('解读格式不完整，请重新尝试。');
    state.session={id:sessionId(),date:new Date().toISOString(),...input,cardTheme,mode,reading};
    if(mode==='ai'){state.apiStatus='ok';updateApiStatus();}
    $('#result').innerHTML=renderReading(state.session,false);$('#result').hidden=false;
    $('#reading-status').textContent=mode==='ai'?'本次由你配置的 API 生成 AI 解读。手记只有点击保存才会留在当前浏览器。':'本次使用免费本地牌义解读，问题与抽牌结果不会上传。';
    say('解读准备好了。先看看哪一句最让你有感触？');
    scrollTo($('#result'));$('#result').focus({preventScroll:true});
  }catch(error) {
    if(state.controller!==controller)return;
    if(mode==='ai'){state.apiStatus='error';updateApiStatus();}
    $('#reading-error').hidden=false;
    $('#reading-error').textContent=error.message||'这次解读暂时无法完成，请重试。';
    $('#reading-status').textContent='抽好的牌已保留。可以重试，也可以选择下面的本地牌义。';
    $('#use-local-reading').hidden=mode!=='ai';
    say('这次解读暂时没有完成。你的牌还在，我们可以再试一次。');
  }finally{
    if(state.controller===controller){state.busy=false;setReadingBusy(false);updateProgress();}
  }
}
function renderReading(session,fromJournal) {
  const reading=session.reading;
  return `<div class="result-head"><div><span class="result-label">LUNA'S READING · ${escape(SPREADS[session.spread].name)}</span><h2 id="${fromJournal?'saved-result-title':'result-title'}">${escape(reading.title)}</h2></div><span class="result-mode">✧ ${session.mode==='ai'?'AI 解读':'本地牌义解读'}</span></div>${fromJournal?`<p class="draw-question">${escape(session.question)}</p><div class="card-slots">${resolveCards(session.cards).map((c,i)=>`<div class="card-slot selected"><div>${cardArt(c,c.reversed,session.cardTheme||'forest')}</div><small>${escape(SPREADS[session.spread].positions[i])}</small><strong>${escape(c.name)}<span class="orientation">${c.reversed?'逆位':'正位'}</span></strong></div>`).join('')}</div>`:''}<div class="luna-reading"><img src="/play/tarot/assets/luna-companion.webp" class="luna-avatar" alt="露娜"><div><b>露娜 · 给你的解读</b><p>${escape(reading.intro)}</p></div></div><div class="reading-cards ${reading.cards.length===1?'single':''}">${reading.cards.map((c,i)=>`<article class="reading-card"><span class="position">${String(i+1).padStart(2,'0')} / ${escape(SPREADS[session.spread].positions[i])}</span><h3>${escape(c.title)}</h3><p>${escape(c.text)}</p></article>`).join('')}</div><div class="guidance"><h3>✧ 可以从这些小事开始</h3><ul>${reading.guidance.map(item=>`<li>${escape(item)}</li>`).join('')}</ul></div><p class="reflection">${escape(reading.reflection)}</p>${fromJournal?'':`<div class="result-actions"><button class="secondary-button" data-action="new-reading">开始新的占卜 ↗</button><button class="primary-button" data-action="save" ${journal.some(item=>item.id===session.id)?'disabled':''}><span>${journal.some(item=>item.id===session.id)?'已保存到手记':'保存到占卜手记'}</span><span>▤</span></button></div>`}`;
}
function resetQuestion() {
  state.controller?.abort();state.controller=null;state.busy=false;state.session=null;
  setReadingBusy(false);
  $('#back-question').disabled=false;$('#question-form').hidden=false;$('#draw-section').hidden=true;$('#result').hidden=true;
  $('#interpret').classList.remove('pending');$('#interpret').firstElementChild.textContent='解读这组牌';
  $('#use-local-reading').hidden=true;
  say('每个问题，都可以有新的角度。今天还想一起聊些什么？');
  scrollTo($('#workspace'));$('#question').focus({preventScroll:true});
}
function setReadingBusy(busy) {
  for(const id of ['card-theme','reading-mode','back-question','save-api-settings','clear-api-settings'])$(`#${id}`).disabled=busy;
  $('#cancel-reading').hidden=!busy;
  if(!busy)$('#interpret').classList.remove('pending');
}
function cancelReading() {
  if(!state.busy)return;
  state.controller?.abort();state.controller=null;state.busy=false;
  setReadingBusy(false);updateProgress();
  $('#reading-error').hidden=true;
  $('#reading-status').textContent='已取消等待，抽好的牌还在。';
  $('#use-local-reading').hidden=state.readingMode!=='ai';
}
function saveSession() {
  if(!state.session||journal.some(item=>item.id===state.session.id))return;
  if(storeJournal([{...state.session},...journal].slice(0,50))){const btn=$('[data-action="save"]');btn.firstElementChild.textContent='已保存到手记';btn.disabled=true;toast('已保存，可以在「占卜手记」中回看。');}
}
const suitLabels={all:'全部',major:'大阿尔卡那',wands:'权杖',cups:'圣杯',swords:'宝剑',pentacles:'星币'};
function libraryCardArt(card) {
  return cardArt(card).replace(/<image href=/g,'<image data-src=');
}
function observeLibraryImages() {
  libraryImageObserver?.disconnect();
  const cards=$$('#library-grid .library-card');
  const load=card=>card.querySelectorAll('image[data-src]').forEach(img=>{
    img.setAttribute('href',img.dataset.src);
    img.removeAttribute('data-src');
  });
  if(!('IntersectionObserver' in window)){cards.forEach(load);return;}
  libraryImageObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    load(entry.target);libraryImageObserver.unobserve(entry.target);
  }),{rootMargin:'200px 0px'});
  cards.forEach(card=>libraryImageObserver.observe(card));
}
function renderLibrary() {
  const botan=getCardTheme()==='botan';
  const revisedCount=Object.keys(BOTAN_V8_READY).length;
  if(revisedCount===78&&state.libraryScene==='revised')state.libraryScene='all';
  $('#theme-description').textContent=botan?(revisedCount===78?'78 张角色塔罗：经典构图、人物关系，交织日常与幻想。':`塔罗与角色融合 · 已更新 ${revisedCount}/78 张，其余卡面正在制作。`):'78 张牌，78 个看见自己的角度。';
  $('#library-character-filters').hidden=!botan;
  $('#library-character-filters').innerHTML=botan?[{id:'all',short:'全员'},...CHARACTERS].map(character=>`<button type="button" data-character="${character.id}" class="${state.libraryCharacter===character.id?'active':''}" aria-pressed="${state.libraryCharacter===character.id}">${escape(character.short)}</button>`).join(''):'';
  $('#library-scene-filters').hidden=!botan;
  $('#library-scene-filters').innerHTML=botan?Object.entries({all:'全部场景',showcase:'融合设计',...(revisedCount<78?{revised:`已更新 · ${revisedCount}`} : {}),fantasy:'幻想 Cos',daily:'日常故事'}).map(([id,label])=>`<button type="button" data-scene="${id}" class="${state.libraryScene===id?'active':''}" aria-pressed="${state.libraryScene===id}">${label}</button>`).join(''):'';
  $('#library-grid').classList.toggle('showcase-grid',botan&&state.libraryScene==='showcase');
  $('#library-filters').innerHTML=Object.entries(suitLabels).map(([id,label])=>`<button data-suit="${id}" class="${state.librarySuit===id?'active':''}" aria-pressed="${state.librarySuit===id}">${label}</button>`).join('');
  const query=$('#library-search').value.trim().toLowerCase();
  const cards=DECK.filter(c=>{const characters=getCardCharacters(c),scene=getCardScene(c);return (state.librarySuit==='all'||c.suit===state.librarySuit)&&(state.libraryCharacter==='all'||characters.some(character=>character.id===state.libraryCharacter))&&(state.libraryScene==='all'||state.libraryScene==='showcase'&&SHOWCASE_CARDS.includes(c.id)||state.libraryScene==='revised'&&Object.hasOwn(BOTAN_V8_READY,c.id)||scene?.id===state.libraryScene)&&`${c.name} ${c.english} ${c.keywords.join(' ')} ${characters.map(character=>`${character.name} ${character.japanese} ${character.english}`).join(' ')} ${scene?.label||''}`.toLowerCase().includes(query);});
  $('#library-count').textContent=`共 ${cards.length} 张牌`;
  $('#library-grid').innerHTML=cards.length?cards.map(c=>`<button class="library-card" data-card-id="${c.id}" aria-label="查看${escape(c.name)}牌义">${libraryCardArt(c)}<strong>${escape(c.name)}</strong>${botan?`<span class="card-cast">${escape(getCardCharacters(c).map(character=>character.short).join(' · '))}</span>${getCardScene(c).description?`<span class="card-scene">${escape(getCardScene(c).label)}</span>`:''}`:''}<small>${escape(c.keywords.join(' · '))}</small></button>`).join(''):'<div class="empty-state">没有找到这张牌，试试其他名字或关键词。</div>';
  observeLibraryImages();
}
function showCard(id,daily=false) {
  const card=CARD_MAP.get(id);if(!card)return;
  $('#detail-content').innerHTML=`<p class="eyebrow">${daily?'YOUR DAILY CARD':'TAROT ENCYCLOPEDIA'}</p><div class="detail-layout"><div class="detail-art">${cardArt(card)}</div><div class="detail-copy"><span class="english">${escape(card.english)}</span><h2>${escape(card.name)}</h2><div class="detail-keywords">${escape(card.keywords.join(' · '))}</div><h3>${daily?'露娜的小提醒':'正位 · 看见这一面'}</h3><p>${escape(card.upright)}</p>${daily?'':`<h3>逆位 · 换个角度</h3><p>${escape(card.reversed)}</p>`}<h3>✧ 今天可以尝试</h3><p>${escape(card.advice)}</p></div></div>`;
  $('#detail-dialog').showModal();
  const characters=getCardCharacters(card);
  if(characters.length){const cast=document.createElement('p');cast.className='detail-cast';cast.textContent=`卡面角色 · ${characters.map(character=>character.name).join(' / ')}`;$('.detail-copy h2').after(cast);}
  const scene=getCardScene(card);
  if(scene?.description){const caption=document.createElement('p');caption.className='detail-scene';caption.textContent=scene.description;$('.detail-keywords').before(caption);}
}
function renderJournal() {
  $('#journal-list').innerHTML=journal.length?journal.map(item=>`<article class="journal-entry"><div class="journal-mini-cards">${resolveCards(item.cards).map(c=>cardArt(c,c.reversed,item.cardTheme||'forest')).join('')}</div><div class="journal-content"><time datetime="${escape(item.date)}">${escape(new Date(item.date).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</time><h3>${escape(item.question)}</h3><p>${escape(SPREADS[item.spread].name)} · ${item.mode==='ai'?'AI 解读':'本地牌义解读'} · ${item.cards.map(c=>escape(CARD_MAP.get(c.id).name)).join(' / ')}</p></div><div class="journal-actions"><button class="secondary-button" data-entry-id="${escape(item.id)}">回看 ↗</button><button class="remove-entry" data-remove-id="${escape(item.id)}" aria-label="删除这条手记">删除</button></div></article>`).join(''):'<div class="empty-state"><span>☾</span><h2>你的星光，还在等待落笔</h2><p>完成一次占卜后，点击「保存到占卜手记」。<br>这些记录会留在当前浏览器里，陪你回看自己的变化。</p><button class="secondary-button" data-go-reading>开始第一次占卜 ↗</button></div>';
}
function removeEntry(id) {
  const item=journal.find(i=>i.id===id);if(!item)return;
  if(storeJournal(journal.filter(i=>i.id!==id))){renderJournal();toast('手记已删除。',{label:'撤销',run:()=>{if(storeJournal([item,...journal].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,50)))renderJournal();}});}
}
function initDaily() {
  let daily;
  const refresh=()=>{
    const day=new Date().toLocaleDateString('en-CA');
    if(daily?.day===day)return;
    try{daily=JSON.parse(localStorage.getItem(DAILY_KEY)||'null');}catch{}
    if(!daily||daily.day!==day||!CARD_MAP.has(daily.id)){daily={day,id:DECK[randomInt(DECK.length)].id,opened:false};try{localStorage.setItem(DAILY_KEY,JSON.stringify(daily));}catch{}}
  };
  const render=()=>{$('#daily-card').innerHTML=daily.opened?cardArt(CARD_MAP.get(daily.id)):cardBack();$('#daily-card').setAttribute('aria-label',daily.opened?`查看今日一牌：${CARD_MAP.get(daily.id).name}`:'翻开今日一牌');$('#daily-name').textContent=daily.opened?`${CARD_MAP.get(daily.id).name} · ${CARD_MAP.get(daily.id).keywords.join(' / ')}`:'今天，会有什么小小的启发？';$('#daily-open').firstChild.textContent=daily.opened?'再看看今日的指引 ':'翻开今日的指引 ';};
  const open=()=>{refresh();daily.opened=true;try{localStorage.setItem(DAILY_KEY,JSON.stringify(daily));}catch{}render();showCard(daily.id,true);say(`今天的提醒是「${CARD_MAP.get(daily.id).name}」。或许有一句话，正好说到你心里。`);};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();render();}});
  document.addEventListener('card-theme-change',render);
  const schedule=()=>{const midnight=new Date();midnight.setHours(24,0,1,0);setTimeout(()=>{refresh();render();schedule();},midnight.getTime()-Date.now());};
  $('#daily-card').addEventListener('click',open);$('#daily-open').addEventListener('click',open);refresh();render();schedule();
}
function updateApiStatus() {
  const ai=state.readingMode==='ai'&&state.apiConfig;
  const connection=state.apiStatus==='ok'?'已完成一次解读':state.apiStatus==='error'?'上次调用未完成':'尚未验证连接';
  $('#mode-badge').textContent=ai?`我的 API · ${state.apiStatus==='ok'?'已连接':state.apiStatus==='error'?'调用失败':'待验证'}`:'免费本地牌义试玩';
  $('#mode-badge').classList.toggle('ai',!!ai&&state.apiStatus==='ok');
  $('#sidebar-mode').textContent=ai?'使用我的 API':'免费本地牌义试玩';
  $('#settings-status').textContent=state.apiConfig?`已填写模型 ${state.apiConfig.model}，${connection}。点击抽牌后的 AI 解读才会调用。`:'可以直接免费抽牌，也可以填写自己的 API，让 AI 结合问题解读。';
  $('#reading-mode-note').textContent=ai?'问题和牌会发给你的 API；费用按服务商规则计算。':'在浏览器中整理牌义，不上传问题。';
  $('#reading-mode').value=state.readingMode;
}
function initApiSettings() {
  try {
    const prefs=JSON.parse(localStorage.getItem(API_PREFERENCES_KEY)||'null');
    if(prefs&&typeof prefs.baseUrl==='string'&&typeof prefs.model==='string'){
      $('#api-base-url').value=prefs.baseUrl.slice(0,2048);$('#api-model').value=prefs.model.slice(0,200);
    }
  }catch{}
  $('#api-settings-form').addEventListener('submit',event=>{
    event.preventDefault();if(state.busy)return;
    try {
      const config=normalizeApiConfig({baseUrl:$('#api-base-url').value,model:$('#api-model').value,apiKey:$('#api-key').value});
      state.apiConfig=config;state.apiStatus='unverified';state.readingMode='ai';
      let remembered=true;
      try{localStorage.setItem(API_PREFERENCES_KEY,JSON.stringify({baseUrl:config.baseUrl,model:config.model}));}catch{remembered=false;}
      $('#api-settings-status').textContent=remembered?'设置已应用，尚未发起调用。刷新后需要重新填写 Key。':'设置已应用；此浏览器暂时无法记住地址和模型。';
      updateApiStatus();updateProgress();$('#settings-dialog').close();
      toast('已切换到 AI 解读。抽好牌后才会请求 API。');
    }catch(error){$('#api-settings-status').textContent=error.message||'请检查接口设置。';}
  });
  $('#clear-api-settings').addEventListener('click',()=>{
    if(state.busy)return;
    state.apiConfig=null;state.apiStatus='unverified';state.readingMode='offline';
    for(const id of ['api-base-url','api-model','api-key'])$(`#${id}`).value='';
    let removed=true;try{localStorage.removeItem(API_PREFERENCES_KEY);}catch{removed=false;}
    $('#api-settings-status').textContent=removed?'API 设置已清除，继续使用免费本地牌义。':'当前页面的 Key 已清除；浏览器未能删除保存的地址和模型。';
    $('#use-local-reading').hidden=true;updateApiStatus();updateProgress();
  });
  $('#reading-mode').addEventListener('change',()=>{
    if(state.busy)return;
    if($('#reading-mode').value==='ai'&&!state.apiConfig){$('#reading-mode').value='offline';openSettings();return;}
    state.readingMode=$('#reading-mode').value;
    $('#reading-error').hidden=true;$('#reading-status').textContent='';$('#use-local-reading').hidden=true;
    updateApiStatus();updateProgress();
  });
  $('#cancel-reading').addEventListener('click',cancelReading);
  $('#use-local-reading').addEventListener('click',()=>{
    if(state.busy)return;
    state.readingMode='offline';updateApiStatus();interpret();
  });
  updateApiStatus();
}
function openSettings() {updateApiStatus();$('#settings-dialog').showModal();}

function initThemes() {
  let selected=DEFAULT_CARD_THEME;
  try{selected=localStorage.getItem(THEME_KEY)||selected;}catch{}
  if(!setCardTheme(selected))setCardTheme(DEFAULT_CARD_THEME);
  const picker=$('#card-theme');
  picker.innerHTML=CARD_THEMES.filter(theme=>theme.ready).map(theme=>`<option value="${theme.id}">${escape(theme.name)}</option>`).join('');
  picker.value=getCardTheme();
  document.body.dataset.cardTheme=getCardTheme();
  picker.addEventListener('change',()=>{
    if(state.busy||!setCardTheme(picker.value)){picker.value=getCardTheme();return;}
    try{localStorage.setItem(THEME_KEY,getCardTheme());}catch{toast('已切换卡面；当前浏览器暂时无法记住这个选择。');}
    document.body.dataset.cardTheme=getCardTheme();
    state.libraryCharacter='all';
    state.libraryScene='all';
    if(state.session)state.session.cardTheme=getCardTheme();
    renderLibrary();renderSlots();renderDeck();updateProgress();
    document.dispatchEvent(new Event('card-theme-change'));
  });
}

$$('.nav-item').forEach(btn=>btn.addEventListener('click',()=>showPage(btn.dataset.page)));
$('#question-form').addEventListener('submit',beginDraw);
$('#question').addEventListener('input',()=>{$('#question-length').textContent=`${$('#question').value.length} / 500`;});
$('#categories').addEventListener('click',event=>{const btn=event.target.closest('[data-category]');if(!btn)return;state.category=btn.dataset.category;renderCategories();$('#question').placeholder={general:'比如：最近总觉得犹豫，我可以先从哪件小事开始？',love:'比如：在这段关系里，我可以怎样更清楚地表达需要？',career:'比如：面对目前的工作状态，我可以怎样找到新的方向？',growth:'比如：最近容易自我怀疑，我可以怎样照顾自己的感受？'}[state.category]; say({general:'想问什么都可以。我们从你最在意的事开始。',love:'关系中的心情，值得被认真听见。先聊聊你的感受吧。',career:'前方的路，可以一步一步看。哪件事让你犹豫了？',growth:'你不需要立刻成为更好的谁。我们先照顾此刻的你。'}[state.category]);});
$('#spreads').addEventListener('change',event=>{state.spread=event.target.value;});
$$('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{$('#question').value=btn.dataset.prompt;$('#question').dispatchEvent(new Event('input'));$('#question').focus();}));
$('#deck').addEventListener('click',event=>{const btn=event.target.closest('[data-deck-index]');if(btn)pickCard(Number(btn.dataset.deckIndex));});
$('#back-question').addEventListener('click',resetQuestion);$('#interpret').addEventListener('click',interpret);
$('#result').addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action==='new-reading')resetQuestion();if(action==='save')saveSession();});
$('#library-filters').addEventListener('click',event=>{const btn=event.target.closest('[data-suit]');if(btn){state.librarySuit=btn.dataset.suit;renderLibrary();}});
$('#library-search').addEventListener('input',renderLibrary);
$('#library-character-filters').addEventListener('click',event=>{const btn=event.target.closest('[data-character]');if(btn){state.libraryCharacter=btn.dataset.character;renderLibrary();}});
$('#library-scene-filters').addEventListener('click',event=>{const btn=event.target.closest('[data-scene]');if(btn){state.libraryScene=btn.dataset.scene;renderLibrary();}});
$('#library-grid').addEventListener('click',event=>{const id=event.target.closest('[data-card-id]')?.dataset.cardId;if(id)showCard(id);});
$('#journal-list').addEventListener('click',event=>{const open=event.target.closest('[data-entry-id]'),remove=event.target.closest('[data-remove-id]');if(open){const item=journal.find(i=>i.id===open.dataset.entryId);if(item){$('#detail-content').innerHTML=renderReading(item,true);$('#detail-dialog').showModal();}}if(remove)removeEntry(remove.dataset.removeId);if(event.target.closest('[data-go-reading]'))showPage('reading');});
$$('.close-dialog').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}));
$('#open-settings').addEventListener('click',openSettings);$('#mode-badge').addEventListener('click',openSettings);$('#refresh-status').addEventListener('click',()=>$('#settings-dialog').close());
$('#journal-count').textContent=String(journal.length);
initThemes();renderCategories();renderSpreads();initDaily();initApiSettings();
