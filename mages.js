(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./spellcraft.js'));else root.MageRules=factory(root.Spellcraft);})(globalThis,function(S){
'use strict';
const spell=(elements,form='bolt')=>S.normalize({elements,form,mod:'plain'});
const SCHOOLS={earth:{name:'Землеписец',color:'#c9ad7c',attack:spell(['earth']),close:spell(['earth'],'burst')},frost:{name:'Ткач инея',color:'#93d4e5',attack:spell(['water','air']),fallback:spell(['water'])},ember:{name:'Угольный маг',color:'#edab79',attack:spell(['fire']),close:spell(['fire'],'burst')}};
const SHIELD=spell(['earth'],'self');
const SITES=[{x:1300,y:2100,school:'earth'},{x:1260,y:1260,school:'frost'},{x:2780,y:1380,school:'ember'}];
function initial(school='earth'){const mana=Object.fromEntries(S.IDS.map(id=>[id,0]));mana.earth=18;for(const id of S.sequence(SCHOOLS[school].attack))mana[id]=18;return {school,mana,cap:60,shield:0};}
function valid(e){return Object.hasOwn(SCHOOLS,e.school)&&e.cap===60&&S.IDS.every(id=>Number.isFinite(e.mana?.[id])&&e.mana[id]>=0&&e.mana[id]<=e.cap)&&Number.isFinite(e.shield)&&e.shield>=0&&e.shield<=100;}
function allowed(e,input){const s=S.normalize(input),type=SCHOOLS[e.school];return !!s&&[type.attack,type.close,type.fallback,SHIELD].filter(Boolean).some(x=>JSON.stringify(x)===JSON.stringify(s));}
return {SCHOOLS,SITES,SHIELD,initial,valid,allowed};
});
