(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Spellcraft = factory();
})(globalThis, function() {
  'use strict';
  const IDS = ['earth','water','fire','air','life','light','shadow','space','blood','death'];
  const MAX_ASPECTS = 5;
  const REACTIONS = {
    steam: { pair:['water','fire'], name:'Паровой выброс', color:'#bddce2', text:'Вода → огонь: горячий пар ранит и замедляет, не поджигая. На открытой почве и воде остаётся пар.' },
    quench: { pair:['fire','water'], name:'Термический удар', color:'#efa997', text:'Огонь → вода: резкое охлаждение особенно опасно для каменных тел; тушит горение, охлаждает лаву.' },
    frost: { pair:['water','air'], name:'Иней', color:'#abe6f5', text:'Вода → воздух: иней замедляет и ненадолго сковывает врага. Вода замерзает в проходимый лёд, который затем тает.' },
    mire: { pair:['earth','water'], name:'Топь', color:'#b3b887', text:'Земля → вода: вязкая топь удерживает наземных врагов и замедляет движение. Позже почва высыхает.' },
    bark: { pair:['life','earth'], name:'Живая кора', color:'#b8d396', text:'Жизнь → земля: живая кора лечит и защищает мага при воплощении; боевые формы удерживают наземных врагов и выращивают рощи.' },
    eclipse: { pair:['light','shadow'], name:'Затмение', color:'#c4b1eb', text:'Свет → тень: затмение пугает живых и ненадолго глушит остальных. Область поглощает вражеские снаряды.' }
  };
  function sequence(spell) { return spell?.elements === undefined ? [spell?.element] : spell.elements; }
  function valid(spell) {
    const a=sequence(spell);
    return !!(spell && Array.isArray(a) && a.length>=1 && a.length<=MAX_ASPECTS && a.every(e=>IDS.includes(e)) &&
      (spell.element===undefined||spell.element===a[0]) && ['bolt','burst','field','self'].includes(spell.form??'bolt') &&
      ['plain','power','reach','echo','chain','siphon'].includes(spell.mod??'plain'));
  }
  function normalize(spell) { if(!valid(spell))return null;const elements=[...sequence(spell)];return {element:elements[0],elements,form:spell.form??'bolt',mod:spell.mod??'plain'}; }
  function cost(spell) {
    if(!valid(spell))return null;
    const c={},base={bolt:6,burst:11,field:13,self:10}[spell.form??'bolt'],unit=spell.mod==='power'?Math.ceil(base*1.5):base;
    for(const e of sequence(spell))c[e]=(c[e]||0)+unit;
    const extra={reach:['air',4],echo:['space',5],chain:['light',5],siphon:['shadow',4]}[spell.mod];
    if(extra)c[extra[0]]=(c[extra[0]]||0)+extra[1];return c;
  }
  function compile(input) {
    const spell=normalize(input);if(!spell)return null;
    const seen={},weights=spell.elements.map((e,i)=>{const repeated=seen[e]||0;seen[e]=repeated+1;return [1,.7,.5,.4,.3][i]/(1+.25*repeated);}),nodes=[];
    // A pair consumes its two adjacent tokens. It never also executes their raw effects.
    for(let i=0;i<spell.elements.length;i++){
      const match=Object.entries(REACTIONS).find(([,r])=>r.pair[0]===spell.elements[i]&&r.pair[1]===spell.elements[i+1]);
      if(match){nodes.push({kind:'reaction',id:match[0],elements:[...match[1].pair],weight:weights[i]+weights[i+1]});i++;}
      else nodes.push({kind:'aspect',element:spell.elements[i],weight:weights[i]});
    }
    const merged=[];for(const node of nodes){node.tokens=node.kind==='reaction'?2:1;const previous=merged.at(-1);if(node.kind==='aspect'&&previous?.kind==='aspect'&&previous.element===node.element){previous.weight+=node.weight;previous.tokens+=node.tokens;}else merged.push(node);}
    return {spell,nodes:merged,cost:cost(spell),cooldown:(spell.form==='bolt'?.43:.78)+.08*(spell.elements.length-1)};
  }
  return {IDS,MAX_ASPECTS,REACTIONS,sequence,valid,normalize,cost,compile};
});
