import {SCENE_DETAILS} from './card-scenes.js';
import {BOTAN_V8_READY} from './botan-v8-ready.js';
export const CARD_THEMES = [
  {id:'forest',name:'森林星月',ready:true},
  {id:'botan',name:'上伊那牡丹 · 群像',ready:true}
];
export const DEFAULT_CARD_THEME = 'botan';
let currentTheme = DEFAULT_CARD_THEME;
export function getCardTheme() {return currentTheme;}
export function setCardTheme(id) {
  if(!CARD_THEMES.some(theme=>theme.id===id&&theme.ready))return false;
  currentTheme=id;
  return true;
}
export const CHARACTERS = [
  {id:'botan',name:'上伊那牡丹',short:'牡丹',japanese:'上伊那ぼたん',english:'Botan Kamiina'},
  {id:'ibuki',name:'砺波伊吹',short:'伊吹',japanese:'砺波いぶき',english:'Ibuki Tonami'},
  {id:'kanade',name:'郡上奏',short:'奏',japanese:'郡上かなで',english:'Kanade Gujyo'},
  {id:'akane',name:'游佐茜',short:'茜',japanese:'遊佐あかね',english:'Akane Yusa'},
  {id:'yaeka',name:'北杜八重花',short:'八重花',japanese:'北杜やえか',english:'Yaeka Kitamori'},
  {id:'chin-lan',name:'张景岚',short:'景岚',japanese:'張景嵐',english:'Chang Chin-lan'}
];
const all = CHARACTERS.map(character=>character.id);
export const SHOWCASE_CARDS = ['major-15','major-6','swords-3'];
export function getCardScene(card,themeId=currentTheme) {
  if(themeId!=='botan')return null;
  const revised=BOTAN_V8_READY[card.id];
  if(revised)return {id:revised.kind,label:revised.sceneLabel,description:revised.sceneDescription};
  return SCENE_DETAILS[card.id]||{id:'daily',label:'日常故事',description:''};
}
const cast = {
  major:[['botan'],['akane'],['ibuki'],['kanade'],['ibuki'],['kanade'],['botan','ibuki'],['yaeka'],['chin-lan'],['ibuki'],all,['chin-lan'],['kanade'],['ibuki','kanade','chin-lan'],['botan','chin-lan'],['akane','yaeka'],['botan','ibuki','chin-lan'],['ibuki','botan'],['botan'],['yaeka','akane'],['kanade','chin-lan'],all],
  cups:[['botan'],['botan','ibuki'],['akane','yaeka','chin-lan'],['ibuki'],['kanade'],['botan','yaeka'],['chin-lan'],['ibuki'],['botan'],all,['botan'],['kanade'],['ibuki'],['chin-lan']],
  swords:[['chin-lan'],['ibuki'],['kanade'],['akane'],['akane','yaeka'],['botan','ibuki'],['chin-lan'],['botan'],['ibuki'],['kanade'],['chin-lan'],['akane'],['kanade'],['ibuki']],
  wands:[['akane'],['yaeka'],['chin-lan'],all,['akane','yaeka'],['botan'],['ibuki'],['botan','yaeka','akane'],['kanade'],['akane'],['botan'],['yaeka'],['akane'],['chin-lan']],
  pentacles:[['kanade'],['chin-lan'],['kanade','ibuki','botan'],['ibuki'],['akane','yaeka'],['chin-lan','botan'],['yaeka'],['akane'],['kanade'],all,['botan'],['ibuki'],['yaeka'],['kanade']]
};
export function getCardCharacters(card,themeId=currentTheme) {
  if(themeId!=='botan')return [];
  const revised=BOTAN_V8_READY[card.id];
  if(revised)return revised.cast.map(id=>CHARACTERS.find(character=>character.id===id)).filter(Boolean);
  if(card.id==='major-15')return ['botan','ibuki','kanade'].map(id=>CHARACTERS.find(character=>character.id===id));
  if(card.id==='major-17')return CHARACTERS.filter(character=>character.id==='botan');
  const ids=cast[card.suit]?.[card.suit==='major'?card.number:card.number-1]||[];
  return ids.map(id=>CHARACTERS.find(character=>character.id===id)).filter(Boolean);
}
