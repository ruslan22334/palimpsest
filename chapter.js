(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GardenChapter=factory();})(globalThis,function(){
'use strict';
const IVA={id:'iva',name:'Ива · хранительница',x:1940,y:2140,npc:true};
const CLUES=[{id:'letter',name:'Обрывок письма',x:1740,y:2140,text:'«Учитель велел сохранить сад прежним. Но вода уже не доходит до домов. Я открыл затвор. Если корни почернеют — это моя вина». Подпись: Лев.'},{id:'channel',name:'Сломанный затвор',x:1460,y:2140,text:'На затворе нет следов нападения. Корни раздавили старый канал, а поток вынес горячие камни из глубины. Лев пытался вернуть воду людям; пожар начался после обвала.'}];
const START={x:1380,y:1980},END={x:1380,y:2140},PATCH=[51*104+26,51*104+27,51*104+28];
const STAGES=['unmet','investigate','rescue','escort','choice','restore','done','legacy'];
function initial(legacy=false){return {stage:legacy?'legacy':'unmet',prepared:false,clues:[],choice:null,lev:{...START}};}
function valid(q){return !!(q&&STAGES.includes(q.stage)&&typeof q.prepared==='boolean'&&Array.isArray(q.clues)&&new Set(q.clues).size===q.clues.length&&q.clues.every(id=>CLUES.some(c=>c.id===id))&&[null,'grove','spring'].includes(q.choice)&&q.lev&&q.lev.x===START.x&&Number.isFinite(q.lev.y)&&q.lev.y>=START.y&&q.lev.y<=END.y&&(!['rescue','escort','choice','restore','done'].includes(q.stage)||q.clues.length===2)&&(!['restore','done'].includes(q.stage)||q.choice!==null)&&(!['choice','restore','done'].includes(q.stage)||q.lev.y===END.y));}
function prepare(sim){const s=sim.s,q=s.chapter;if(q.prepared||q.stage==='legacy')return;q.prepared=true;
 // Clear only natural obstructions at story sites; existing player walls remain breakable.
 for(const p of [IVA,...CLUES,START,END]){const tx=Math.floor(p.x/40),ty=Math.floor(p.y/40);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const i=(ty+dy)*104+tx+dx;if(['wall','lava','fire'].includes(s.tiles[i]))s.tiles[i]='soil';}}
 for(let y=49;y<=53;y++){const i=y*104+34;if(s.tiles[i]!=='barrier'){s.tiles[i]=y>49&&y<53?'fire':'soil';delete s.terrainTimers[i];delete s.terrainCredit[i];}}
}
function markers(s){const q=s.chapter;if(q.stage==='legacy')return [];const out=[IVA];if(q.stage==='investigate')out.push(...CLUES.filter(c=>!q.clues.includes(c.id)));if(['rescue','escort','choice','restore','done'].includes(q.stage))out.push({id:'lev',name:q.stage==='escort'?'Лев · проводите к дороге':'Лев · ученик',...q.lev,npc:true});return out;}
function goals(s){const q=s.chapter;if(q.stage==='legacy'||q.stage==='done')return [];if(q.stage==='investigate')return markers(s).filter(m=>!m.npc);if(q.stage==='rescue'||q.stage==='escort')return markers(s).filter(m=>m.id==='lev');if(q.stage==='restore')return [{x:1100,y:1940,name:'Корни памяти'}];return [IVA];}
function objective(s){const q=s.chapter;const texts={unmet:['Голос у дороги','Поговорите с Ивой к западу от обсерватории. Бирюзовая отметка на карте указывает цель.'],investigate:['Следы ученика',`Исследуйте письмо и затвор на западной дороге: ${q.clues.length}/2. Подойдите к отметке и нажмите действие.`],rescue:['По ту сторону огня','Лев к северу от затвора. Поговорите с ним, затем расчистите путь к дороге водой или воздухом.'],escort:['Вывести Льва',s.chapter.lev.y<END.y?'Держитесь рядом. Лев останавливается перед огнём, лавой и стенами. Вода и воздушная искра тушат огонь.':'Вернитесь к Иве.'],choice:['Чья память останется?','Лев в безопасности. Вернитесь к Иве и решите, чем станет сад.'],restore:['Новая жизнь сада','У печати «Корни памяти» завершите обряд: земля 25 + вода 15. Выбор: '+(q.choice==='grove'?'роща памяти.':'источник для поселения.')],done:['Сад снова живёт',consequence(s)]};return texts[q.stage]||null;}
function consequence(s){return s.chapter.choice==='grove'?'Вы сохранили рощу памяти. У печати выросли деревья; Лев будет ухаживать за каналом, не вырывая корней.':s.chapter.choice==='spring'?'Вы отвели воду к поселению. У печати появился открытый родник; Ива перенесла имена предков на камень.':'История этой печати завершена в прежнем путешествии.';}
function dialogue(sim,id){const q=sim.s.chapter;if(id==='iva'){
 const data=q.stage==='unmet'?{text:'Я Ива, хранительница сада. Ученик Лев ушёл открыть старый канал и не вернулся. На западе виден дым. Учитель сказал бы: не трогай корни. Но я прошу тебя сначала найти человека. Следы остались на дороге.',actions:[['accept','Найти Льва']]}:q.stage==='choice'?{text:'Лев жив. Значит, мы ещё можем спорить о саде. Его письмо и затвор показали: он спасал поселение от засухи. Вернуть всё как было нельзя. Оставим рощу с именами умерших — или дадим воде новое русло? Роща вернёт деревья и тень у печати. Родник даст открытый берег и воду. Оба решения сохранят печать.',actions:[['grove','Сохранить рощу памяти'],['spring','Открыть родник поселению']]}:q.stage==='done'?{text:consequence(sim.s),actions:[]}:{text:objective(sim.s)[1],actions:[]};return {title:'Ива · Корни памяти',...data};
 }if(id==='lev')return {title:'Лев · Не тот огонь',text:q.stage==='rescue'?'Я открыл затвор ради домов ниже по течению. Поток обрушил стену, а под ней оказался жар… Нога не держит. Защитная нить укроет меня, пока мы идём; она не пустит меня в огонь. Расчисти тропу к дороге и держись рядом. Даже воздушная искра гасит пламя.':q.stage==='escort'?'Не уходи далеко. Если я остановился, проверь следующий участок тропы: огонь тушится, стену можно разрушить.':'Спасибо. Я останусь у дороги, пока Ива решает судьбу сада. Расскажите ей правду о затворе.',actions:q.stage==='rescue'?[['escort','Я проведу тебя']]:[]};
 const c=CLUES.find(c=>c.id===id);return c?{title:c.name,text:c.text,actions:[]}:null;
}
function interact(sim,id){const s=sim.s,q=s.chapter;if(q.stage==='legacy')return false;const m=markers(s).find(m=>m.id===id);if(!m||Math.hypot(s.player.x-m.x,s.player.y-m.y)>68)return false;
 if(CLUES.some(c=>c.id===id)&&q.stage==='investigate'&&!q.clues.includes(id)){q.clues.push(id);if(q.clues.length===2)q.stage='rescue';sim.emit('save');}
 sim.emit('storyDialogue',{id});return true;
}
function choose(sim,action){const s=sim.s,q=s.chapter,p=s.player;const near=m=>Math.hypot(p.x-m.x,p.y-m.y)<=68;
 if(action==='accept'&&q.stage==='unmet'&&near(IVA))q.stage='investigate';
 else if(action==='escort'&&q.stage==='rescue'&&near(q.lev))q.stage='escort';
 else if(['grove','spring'].includes(action)&&q.stage==='choice'&&near(IVA)){q.choice=action;q.stage='restore';}
 else return false;sim.emit('save');return true;
}
function update(sim,dt){const q=sim.s.chapter;if(q.stage!=='escort'||Math.hypot(sim.s.player.x-q.lev.x,sim.s.player.y-q.lev.y)>210)return;
 const y=Math.min(END.y,q.lev.y+44*dt),ahead=Math.min(END.y,y+13);if(sim.blocked(q.lev.x,y,11)||['fire','lava'].includes(sim.tile(q.lev.x,ahead)))return;q.lev.y=y;
 if(y===END.y){q.stage='choice';sim.notice('Лев добрался до дороги. Вернитесь к Иве: пора решить судьбу сада.');sim.emit('save');}
}
function shrine(sim){const s=sim.s,q=s.chapter;if(q.stage==='legacy'||q.stage==='done')return false;
 if(q.stage!=='restore'){sim.notice(objective(s)[1]);return true;}
 if(s.player.mana.earth<25||s.player.mana.water<15){sim.notice('Для обряда нужны земля 25 + вода 15. Их собирают на почве и у воды.');return true;}
 s.player.mana.earth-=25;s.player.mana.water-=15;
 for(const i of PATCH){delete s.walls[i];delete s.terrainTimers[i];delete s.terrainCredit[i];s.tiles[i]=q.choice==='grove'?'tree':'water';sim.emit('terrain',{index:i});}
 q.stage='done';s.shrines[0].status='cleared';sim.notice(consequence(s));return false;
}
return {IVA,CLUES,START,END,PATCH,initial,valid,prepare,markers,goals,objective,consequence,dialogue,interact,choose,update,shrine};
});
