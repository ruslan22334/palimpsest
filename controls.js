(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./spellcraft.js'));else root.ArcaneControls=factory(root.Arcana,root.Spellcraft);})(globalThis,function(A,S){
'use strict';
const DEFAULTS={up:'KeyW',left:'KeyA',down:'KeyS',right:'KeyD',select1:'Digit1',select2:'Digit2',select3:'Digit3',select4:'Digit4',earth:'KeyQ',water:'KeyR',fire:'KeyF',air:'KeyZ',life:'KeyX',light:'KeyC',shadow:'KeyV',space:'KeyB',blood:'KeyN',death:'KeyG',toggle:'KeyT',undo:'Backspace',clear:'Delete',recall:'Enter',modifier:'KeyH',editor:'Tab',journal:'KeyJ',map:'KeyM',interact:'KeyE',dash:'Space'};
const LABELS={up:'Вперёд',left:'Влево',down:'Назад',right:'Вправо',select1:'Ячейка / форма 1',select2:'Ячейка / форма 2',select3:'Ячейка / форма 3',select4:'Ячейка / форма 4',toggle:'Режим магии',undo:'Удалить последний аспект',clear:'Очистить рецепт',recall:'Вернуть последний каст',modifier:'Следующий модификатор',editor:'Конструктор',journal:'Дневник',map:'Карта',interact:'Взаимодействовать',dash:'Рывок'};
function allowed(code){return typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Tab|Backspace|Delete|Enter|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|Minus|Equal)$/.test(code);}
function label(code){return ({Space:'Пробел',Backspace:'⌫',Delete:'Del',Enter:'Enter',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backslash:'\\',Minus:'−',Equal:'='})[code]||code.replace(/^Key|^Digit/,'');}
function preferences(raw){const value={mode:raw?.mode==='live'?'live':'slots',bindings:{...DEFAULTS}};const b=raw?.bindings;if(b&&Object.keys(DEFAULTS).every(k=>allowed(b[k]))&&new Set(Object.keys(DEFAULTS).map(k=>b[k])).size===Object.keys(DEFAULTS).length)for(const k of Object.keys(DEFAULTS))value.bindings[k]=b[k];return value;}
class Controller{
 constructor(raw){this.preferences=preferences(raw);this.elements=[];this.form='bolt';this.mod='plain';this.last=null;}
 action(code){return Object.keys(DEFAULTS).find(k=>this.preferences.bindings[k]===code);}
 key(action){return label(this.preferences.bindings[action]);}
 resetJourney(){this.elements=[];this.form='bolt';this.mod='plain';this.last=null;}
 rebind(action,code){if(!Object.hasOwn(DEFAULTS,action)||!allowed(code))return false;const other=this.action(code),old=this.preferences.bindings[action];if(other)this.preferences.bindings[other]=old;this.preferences.bindings[action]=code;return true;}
 toggle(){this.preferences.mode=this.preferences.mode==='live'?'slots':'live';}
 append(element){if(!S.IDS.includes(element)||this.elements.length>=5)return false;this.elements.push(element);return true;}
 choose(index,research){const f=A.FORMS[index];if(!f||f.level>research)return false;this.form=f.id;return true;}
 cycle(research){const mods=A.MODS.filter(m=>m.level<=research);this.mod=mods[(mods.findIndex(m=>m.id===this.mod)+1)%mods.length].id;}
 recipe(research){if(!A.FORMS.some(f=>f.id===this.form&&f.level<=research)||!A.MODS.some(m=>m.id===this.mod&&m.level<=research))return null;return S.normalize({elements:[...this.elements],form:this.form,mod:this.mod});}
 recall(research){if(!this.last||!A.FORMS.some(f=>f.id===this.last.form&&f.level<=research)||!A.MODS.some(m=>m.id===this.last.mod&&m.level<=research))return false;const s=S.normalize(this.last);this.elements=s.elements;this.form=s.form;this.mod=s.mod;return true;}
 cast(sim,target){const live=this.preferences.mode==='live',recipe=live?this.recipe(sim.s.research):S.normalize(sim.s.spells[sim.s.selected]);if(!recipe)return false;const applied=sim.cast(target,false,recipe);if(applied)this.last=S.normalize(recipe);return applied;}
 vector(keys){const b=this.preferences.bindings;return {x:Number(keys.has(b.right)||keys.has('ArrowRight'))-Number(keys.has(b.left)||keys.has('ArrowLeft')),y:Number(keys.has(b.down)||keys.has('ArrowDown'))-Number(keys.has(b.up)||keys.has('ArrowUp'))};}
}
return {DEFAULTS,LABELS,allowed,label,preferences,Controller};
});
