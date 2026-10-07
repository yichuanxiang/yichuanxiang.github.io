import {getCardTheme,getCardScene} from './deck-themes.js';
import {BOTAN_V8_READY} from './botan-v8-ready.js';
const themes = { major: ['#192e3e','#b6c4be','#d6bc7b'], cups: ['#284d58','#adc2c1','#e4c995'], wands: ['#614638','#d6b985','#eee0bc'], swords: ['#354754','#b2bcc4','#e0caa1'], pentacles: ['#2d4f42','#a9b7a0','#e6ca8c'] };
const ILLUSTRATED_READY = true;
const ILLUSTRATED_SUITS = new Set(['major','cups','swords','wands','pentacles']);
const REVISED_MAJORS = new Set(Array.from({length:22},(_,i)=>i));
const REVISED_SUITS = new Set(['cups','swords','wands','pentacles']);
const PRESERVED_CHARIOT = 7;
const WINE_VARIANTS = new Set(['major-9','major-17']);
const REVISED_ROWS = {cups:[0,351,710,1088,1536],swords:[0,384,768,1152,1536],wands:[0,384,768,1152,1536],pentacles:[0,384,768,1152,1536]};
const DAILY_MAJORS = new Set([4,10,16]);
const CURRENT_SINGLES = new Set(['major-0','major-4','major-10','major-14','major-15','major-16','cups-2','pentacles-3','pentacles-10','wands-4']);
const CURRENT_FILES = {'major-0':'major-0-final','cups-2':'cups-2-hand','pentacles-3':'pentacles-3-final','pentacles-10':'pentacles-10-final','wands-4':'wands-4-final'};
const CURRENT_SUITS = new Set(['cups','swords','wands','pentacles']);
const CURRENT_ROWS = {cups:[0,351,710,1088,1536],swords:[0,384,768,1152,1536],wands:[0,384,768,1152,1536],pentacles:[0,384,768,1152,1536]};
// Uniform whole-deck revisions: individual cards, numeric atlases, and larger court cells.
const FINAL_MAJORS = new Set(["major-1","major-2","major-3","major-5","major-8","major-9","major-11","major-12","major-17","major-18","major-19","major-20","major-21"]);
const WHOLE_FILES = {'major-6':'major-6','major-7':'major-7','major-13':'major-13','pentacles-3':'pentacles-3','cups-6':'cups-6-final'};
const WHOLE_COURTS = new Set(['cups','wands','swords','pentacles']);
const WHOLE_SUITS = new Set(['cups','wands','swords','pentacles']);
const WHOLE_ROWS = {cups:[0,351,710,1088,1536],swords:[0,384,768,1152,1536],wands:[0,384,768,1152,1536],pentacles:[0,384,768,1152,1536]};
const DAILY_ROWS = {cups:[0,351,710,1088,1536],swords:[0,384,768,1152,1536],wands:[0,384,768,1152,1536],pentacles:[0,384,768,1152,1536]};
const star = (x,y,r=5) => `<path d="M${x} ${y-r}l${r/3} ${r*.67} ${r*.67} ${r/3}-${r*.67} ${r/3}-${r/3} ${r*.67}-${r/3}-${r*.67}-${r*.67}-${r/3} ${r*.67}-${r/3}Z"/>`;
const sun = `<circle cx="100" cy="96" r="27"/><g fill="none" stroke-width="1.5">${Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return `<path d="M${100+Math.cos(a)*34} ${96+Math.sin(a)*34}l${Math.cos(a)*12} ${Math.sin(a)*12}"/>`;}).join('')}</g>`;
const moon = `<path d="M113 59a38 38 0 1 0 20 65 36 36 0 0 1-20-65Z"/>`;
const cup = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-13 0h26c0 15-5 23-13 23S-13 15-13 0ZM0 23v10m-10 0h20" fill="none" stroke-width="2"/><path d="M-13 4h-7c0 13 5 15 12 15M13 4h7c0 13-5 15-12 15" fill="none" stroke-width="1.5"/></g>`;
const sword = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="m0-20-4 9 3 33h2l3-33Z"/><path d="M-10 22h20M0 22v10m-4 0h8" fill="none" stroke-width="2"/></g>`;
const wand = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-2-20 2 30M-1-5q-18-13-13-20Q1-23-1-5ZM1 9q20-11 16-20Q2-7 1 9Z" fill="none" stroke-width="2"/></g>`;
const coin = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle r="15" fill="none" stroke-width="1.5"/><path d="m0-11 6 20-16-12h20L-6 9Z" fill="none" stroke-width="1.3"/></g>`;
const motifs = [
  `<path d="m63 185 26-67 24 21 13 46Z" fill="none" stroke-width="2"/><circle cx="90" cy="106" r="8"/><path d="M92 129l-30 12m31-13 28-25m-58 38-12-27" fill="none" stroke-width="2"/>${sun}`,
  `${star(100,85,23)}<path d="M58 145h84m-72 0v39m60-39v39M100 123v22" fill="none" stroke-width="2"/>${cup(79,152,.5)}${wand(124,163,.55)}`,
  `${moon}<path d="M51 152V80h12v105M137 185V80h12v72M65 170q35-43 70 0" fill="none" stroke-width="2"/>`,
  `<path d="M68 179V114q32-35 64 0v65ZM73 106l-7-26 24 12 10-25 10 25 24-12-7 26" fill="none" stroke-width="2"/>${star(100,143,14)}`,
  `<path d="M60 184V112h80v72M77 108l-5-33 28 15 28-15-5 33M100 125v40m-14-20h28" fill="none" stroke-width="2"/>`,
  `<path d="M65 180V73h14v107m42 0V73h14v107M100 82v83m-16-60h32m-23 60h14" fill="none" stroke-width="2"/>${star(100,69,7)}`,
  `<path d="M100 124c-38-44-67-5-34 23l34 29 34-29c33-28 4-67-34-23Z" fill="none" stroke-width="2"/>${star(100,79,12)}`,
  `<path d="M61 135h78v44H61ZM70 179l-8 13m68-13 8 13M76 135V98l24-19 24 19v37" fill="none" stroke-width="2"/><circle cx="73" cy="180" r="10"/><circle cx="127" cy="180" r="10"/>`,
  `<path d="M71 125c-25 0-30 39 1 43h53c33-6 29-44 6-46-1-30-47-33-49-7M81 162v26m34-26v26" fill="none" stroke-width="2"/><path d="M80 86c15-21 25 21 40 0s-25-21-40 0Z" fill="none" stroke-width="2"/>`,
  `<path d="m73 183 16-60 12-9 22 69ZM92 112V88m0 0 16-17 7 17-7 17ZM124 112v75" fill="none" stroke-width="2"/>${star(108,88,6)}`,
  `<circle cx="100" cy="125" r="47" fill="none" stroke-width="2"/><circle cx="100" cy="125" r="34" fill="none"/><path d="M53 125h94m-47-47v94m-33-80 66 66m-66 0 66-66" fill="none"/>${star(100,125,13)}`,
  `<path d="M100 79v104m-32 0h64M61 106h78m-57 0-19 41h38Zm36 0-19 41h38Z" fill="none" stroke-width="2"/>${star(100,71,8)}`,
  `<path d="M60 82h80m-40 0v48m0 0-19 30 25 0m-6-30 22 18m-18 18v19" fill="none" stroke-width="2"/><circle cx="105" cy="194" r="8"/>`,
  `<path d="M70 183q30-65 60 0M77 155q23-62 46 0M85 128q15-42 30 0M100 107V74" fill="none" stroke-width="2"/><path d="M89 82h22" fill="none" stroke-width="2"/>${star(70,101,6)}${star(138,130,5)}`,
  `${cup(70,103,.85)}${cup(128,144,.85)}<path d="M77 128q21 25 40 25M80 184h48" fill="none" stroke-width="2"/>${star(111,90,10)}`,
  `<path d="M74 123q-23-43-3-43l13 27h32l13-27q20 0-3 43l9 57H65Z" fill="none" stroke-width="2"/>${star(100,145,15)}`,
  `<path d="M80 185V105h40v80M74 105h52m-26-34-20 39 23-9-3 29 26-40-25 7Z" fill="none" stroke-width="2"/>${star(65,143,7)}${star(140,130,8)}`,
  `${star(100,89,26)}${star(54,115,7)}${star(142,128,8)}${star(66,73,6)}<path d="M55 187q45-35 90 0m-75-24q30-20 60 0" fill="none" stroke-width="1.5"/>`,
  `${moon}${star(54,78,5)}${star(144,76,5)}<path d="M50 168q25-14 50 0t50 0M45 185q27-14 55 0t55 0M70 153l30-25 30 25" fill="none" stroke-width="1.5"/>`,
  `${sun}<path d="M45 176q55-46 110 0M52 183h96M74 160v23m52-23v23" fill="none" stroke-width="2"/>`,
  `<path d="M68 89h55l17-8v39l-17-8H68ZM80 113l12 24m-35 48 26-43 17 19 17-19 27 43Z" fill="none" stroke-width="2"/>${star(100,67,8)}`,
  `<ellipse cx="100" cy="130" rx="47" ry="62" fill="none" stroke-width="2"/><path d="M73 183q27-90 54 0M78 78q22 35 44 0" fill="none" stroke-width="1.5"/>${star(100,129,18)}`
];
function xml(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function illustratedCard(card,reversed,themeId) {
  const botan=themeId==='botan';
  const v8Card=botan?BOTAN_V8_READY[card.id]:null;
  const major=card.suit==='major';
  const second=major&&card.number>=16;
  const revised=botan&&(major?REVISED_MAJORS.has(card.number):REVISED_SUITS.has(card.suit));
  const roleVariant=botan&&getCardScene(card,themeId)?.id==='fantasy';
  const preservedChariot=botan&&major&&card.number===PRESERVED_CHARIOT;
  const wineVariant=botan&&WINE_VARIANTS.has(card.id);
  const finalMajor=botan&&FINAL_MAJORS.has(card.id);
  const wholeSingle=botan&&Object.hasOwn(WHOLE_FILES,card.id);
  const wholeCourt=botan&&!major&&card.number>=11&&WHOLE_COURTS.has(card.suit);
  const wholeSuit=botan&&!major&&card.number<=10&&WHOLE_SUITS.has(card.suit)&&!CURRENT_SINGLES.has(card.id);
  const currentRevision=botan&&(CURRENT_SINGLES.has(card.id)||!major&&card.number<=10&&CURRENT_SUITS.has(card.suit));
  const dailyRevision=botan&&(major?DAILY_MAJORS.has(card.number):card.number<=10&&REVISED_SUITS.has(card.suit));
  const single=botan&&(v8Card||finalMajor||wholeSingle||CURRENT_SINGLES.has(card.id)||wineVariant||second||revised&&major);
  const columns=single?1:wholeCourt?2:second?3:4,rows=single?1:wholeCourt?2:second?2:4;
  const index=single?0:wholeCourt?card.number-11:major?(second?card.number-16:card.number):card.number-1;
  const col=index%columns,row=Math.floor(index/columns);
  const source=v8Card?v8Card.source:finalMajor?`/play/tarot/assets/botan-v7/${card.id}.webp`:wholeSingle?`/play/tarot/assets/botan-v6/${WHOLE_FILES[card.id]}.webp`:wholeCourt?`/play/tarot/assets/botan-v6/${card.suit}-courts.webp`:wholeSuit?`/play/tarot/assets/botan-v6/${card.suit}.webp`:currentRevision?`/play/tarot/assets/botan-v5/${CURRENT_SINGLES.has(card.id)?CURRENT_FILES[card.id]||card.id:card.suit}.webp`:wineVariant?`/play/tarot/assets/botan-wine/${card.id}.webp`:preservedChariot?`/play/tarot/assets/fantasy/major-${card.number}.webp`:dailyRevision?`/play/tarot/assets/botan-v4/${major?`major-${card.number}`:card.suit}.webp`:revised?`/play/tarot/assets/botan-v3/${major?`major-${card.number}`:card.suit}.webp`:botan?`/play/tarot/assets/botan/${major?`major-${second?card.number:'a'}`:card.suit}.webp`:major?`/play/tarot/assets/deck-major-${second?'b':'a'}.webp`:`/play/tarot/assets/deck-${card.suit}.webp`;
  // Use measured source rows, including the unequal Cups rows, without altering the original image.
  const pixelRows=wholeCourt?[0,768,1536]:wholeSuit?WHOLE_ROWS[card.suit]:currentRevision&&!single?CURRENT_ROWS[card.suit]:dailyRevision&&!major?DAILY_ROWS[card.suit]:revised&&!major?REVISED_ROWS[card.suit]:botan?[0,363,733,1126,1536]:[0,370,742,1124,1536];
  const measuredAtlas=!single&&!wineVariant&&(wholeCourt||revised&&!major||card.suit==='pentacles');
  const cellWidth=wholeCourt?512:256;
  const crop=measuredAtlas?`${col*cellWidth} ${pixelRows[row]} ${cellWidth} ${pixelRows[row+1]-pixelRows[row]}`:`${col*200} ${row*300} 200 300`;
  const sourceWidth=measuredAtlas?1024:columns*200;
  const sourceHeight=measuredAtlas?1536:rows*300;
  const label=major?['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][card.number]:card.number<=10?String(card.number):['PAGE','KNIGHT','QUEEN','KING'][card.number-11];
  const frame=roleVariant?'#d9c492':botan?'#e3c5ce':'#dac9a4',line=roleVariant?'#ae9159':botan?'#c999a9':'#b29c6f',paper=roleVariant?'#fbf3df':botan?'#fff8f7':'#f5ebd5',ink=roleVariant?'#655539':botan?'#735765':'#3b4837';
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" class="card-art illustrated-art${botan?' botan-art':''}${reversed?' reversed-art':''}" aria-hidden="true"><rect width="200" height="300" rx="9" fill="${frame}"/><svg x="5" y="5" width="190" height="290" viewBox="${crop}" preserveAspectRatio="none"><image href="${source}" x="0" y="0" width="${sourceWidth}" height="${sourceHeight}" preserveAspectRatio="none"/></svg><rect x="8" y="8" width="184" height="284" rx="3" fill="none" stroke="${line}" stroke-width="1.1"/><rect x="78" y="13" width="44" height="19" rx="9" fill="${paper}" fill-opacity=".94"/><text x="100" y="26" text-anchor="middle" fill="${ink}" font-family="Georgia,serif" font-size="10" letter-spacing="1">${label}</text><path d="M9 247h182v44H9Z" fill="${paper}" fill-opacity=".96"/><path d="M29 252h142" stroke="${line}" stroke-width=".6"/><text x="100" y="270" text-anchor="middle" fill="${ink}" font-family="'Microsoft YaHei',serif" font-size="14" letter-spacing="2">${xml(card.name)}</text><text x="100" y="284" text-anchor="middle" fill="${botan?'#9e7d8a':'#8d7952'}" font-family="Georgia,serif" font-size="7.5" letter-spacing=".7">${xml(card.english.toUpperCase())}</text></svg>`;
}
export function cardArt(card, reversed=false,themeId=getCardTheme()) {
  return ILLUSTRATED_READY&&ILLUSTRATED_SUITS.has(card.suit)?illustratedCard(card,reversed,themeId):geometricCardArt(card,reversed);
}
export function geometricCardArt(card,reversed=false) {
  const [bg,accent,gold]=themes[card.suit]||themes.major;
  const n=card.number||0;
  let motif=motifs[n]||motifs[17];
  if(card.suit!=='major') {
    const symbol={cups:cup,swords:sword,wands:wand,pentacles:coin}[card.suit];
    const count=n<=10?n:1;
    motif=Array.from({length:count},(_,i)=>{const rows=Math.ceil(count/3),cols=Math.min(count,3);return symbol(100+(i%cols-(cols-1)/2)*37,115+(Math.floor(i/cols)-(rows-1)/2)*38,count>3?.65:1.25);}).join('');
    if(n>10)motif+=`<path d="m71 78-7-20 23 8 13-21 13 21 23-8-7 20Z" fill="none" stroke-width="1.5"/><path d="M60 177h80m-70 7h60" fill="none"/>`;
  }
  const label=card.suit==='major'?['0','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'][n]:n<=10?String(n):['PAGE','KNIGHT','QUEEN','KING'][n-11];
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" class="card-art${reversed?' reversed-art':''}" aria-hidden="true"><rect width="200" height="300" rx="9" fill="#eee4ce"/><rect x="8" y="8" width="184" height="284" rx="5" fill="${bg}"/><g stroke="${gold}" fill="none" opacity=".65"><rect x="15" y="15" width="170" height="270" rx="3"/><path d="M24 66V35h30m92 0h30v31M24 234v31h30m92 0h30v-31"/></g><text x="100" y="44" fill="${gold}" font-family="Georgia,serif" font-size="12" text-anchor="middle" letter-spacing="3">${label}</text><path d="M27 214q35-31 73 0t73 0v31H27Z" fill="${accent}" opacity=".22"/><g stroke="${gold}" fill="${gold}">${motif}</g><g fill="${gold}" opacity=".6">${star(34,91,3)}${star(167,195,3)}${star(41,193,2)}${star(166,67,2)}</g><path d="M42 245h116" stroke="${gold}" opacity=".5"/><text x="100" y="268" fill="${gold}" font-family="Georgia,serif" font-size="10" text-anchor="middle" letter-spacing="1">${card.english.replace(/[<>&"]/g,'')}</text></svg>`;
}
export function cardBack(themeId=getCardTheme()) {
  const botan=themeId==='botan';
  return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" class="card-art illustrated-back${botan?' botan-art':''}" aria-hidden="true"><rect width="200" height="300" rx="9" fill="${botan?'#e3c5ce':'#d4be90'}"/><image href="${botan?'/play/tarot/assets/botan/back.webp':'/play/tarot/assets/deck-back.webp'}" x="4" y="4" width="192" height="292" preserveAspectRatio="xMidYMid slice"/><rect x="8" y="8" width="184" height="284" rx="4" fill="none" stroke="${botan?'#c999a9':'#cebb86'}" stroke-width=".7"/></svg>`;
}
