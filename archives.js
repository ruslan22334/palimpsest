(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ArchiveChapter=factory();})(globalThis,function(){
'use strict';
const index=(x,y)=>y*104+x;
const point=i=>({x:(i%104+.5)*40,y:(Math.floor(i/104)+.5)*40});
const NERA={id:'nera',name:'Нера · архивист',x:1060,y:1180,npc:true};
const INLET=index(21,21),BASIN=[index(21,23),index(21,24),index(21,25)];
const CHANNEL=[index(29,27),index(30,27),index(31,27)],DESK=index(31,24);
const RECORDS=[
 {id:'catalogue',name:'Каталог паводков',x:1060,y:780,text:'Год до разлома. Реки уже меняют направление, хотя ни один город ещё не пал. Старый мир проступает сквозь новый. На полях — схема: синий ромб питает западный зал; три чаши на востоке поднимают груз, но читать его можно лишь на сухом пюпитре.'},
 {id:'testimony',name:'Свидетельство смотрителя',...point(BASIN[1]),text:'День переписи. «Нам приказали залить нижние хранилища, чтобы стереть имена прежних жителей. Я сохранил копию. Переписчик не захватчик: мы сами поручили ему заменить неудобную историю».'},
 {id:'countermand',name:'Невыполненная отмена',...point(DESK),text:'День после переписи. «Остановить замену слоя. Пять печатей должны сохранить оба голоса, а не стереть один из них». Приказ остался под водой. Автоматические стражи продолжали исполнять прежнюю задачу.'}
];
const DRY=['soil','grass','stone','sand','ruin','obsidian','crystal','tree'];
const STAGES=['unmet','recover','interpret','restore','done','legacy'];
function initial(legacy=false){return {stage:legacy?'legacy':'unmet',prepared:false,records:[],surge:0,lift:0};}
function valid(q){return !!(q&&STAGES.includes(q.stage)&&typeof q.prepared==='boolean'&&Array.isArray(q.records)&&new Set(q.records).size===q.records.length&&q.records.every(id=>RECORDS.some(r=>r.id===id))&&Number.isFinite(q.surge)&&q.surge>=0&&q.surge<4&&Number.isFinite(q.lift)&&q.lift>=0&&q.lift<=3&&(!['interpret','restore','done'].includes(q.stage)||q.records.length===3)&&(q.stage!=='unmet'||q.records.length===0));}
function writeTile(sim,i,t){const s=sim.s;if(s.tiles[i]==='barrier'||s.tiles[i]===t)return;delete s.terrainTimers[i];delete s.terrainCredit[i];s.tiles[i]=t;sim.emit('terrain',{index:i});}
function prepare(sim){const s=sim.s,q=s.archive;if(q.prepared||q.stage==='legacy')return;q.prepared=true;
 // Connect story stations to the existing north/south road without deleting constructed walls.
 for(const m of [NERA,...RECORDS,point(INLET),...CHANNEL.map(point)]){let x=26,y=29,tx=Math.floor(m.x/40),ty=Math.floor(m.y/40);while(true){writeTile(sim,index(x,y),'soil');if(x===tx&&y===ty)break;if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);}for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)writeTile(sim,index(tx+dx,ty+dy),'soil');}
 for(const i of [INLET,...BASIN,DESK])writeTile(sim,i,'water');for(const i of CHANNEL)writeTile(sim,i,'soil');
 // A separate shoreline remains a source even when the inlet is sealed.
 for(let y=29;y<=31;y++)writeTile(sim,index(29,y),'water');
}
function powered(s){return CHANNEL.every(i=>s.tiles[i]==='water');}
function ready(s,id){if(id==='catalogue')return true;if(id==='testimony')return s.tiles[INLET]!=='water'&&BASIN.every(i=>DRY.includes(s.tiles[i]));if(id==='countermand')return powered(s)&&s.archive.lift>=3&&DRY.includes(s.tiles[DESK]);return false;}
function hint(s,id){if(id==='testimony')return s.tiles[INLET]==='water'?'Вода возвращается через синий ромб к северу. Измените источник потока, затем осушите три отмеченные клетки зала.':'Поток перекрыт. Осушите все три клетки западного зала; лёд и пар ещё не позволяют читать записи.';if(id==='countermand')return !powered(s)?'Подъёмнику нужна непрерывная вода в трёх отмеченных чашах к югу. Пюпитр с записью должен остаться сухим.':s.archive.lift<3?'Подъёмник поднимает запись. Сохраняйте воду во всех трёх чашах.':'Груз поднят. Осушите пюпитр, не лишая подъёмник воды.';return '';}
function markers(s){const q=s.archive;if(q.stage==='legacy')return [];return [NERA,...(['recover','interpret'].includes(q.stage)?RECORDS.filter(r=>!q.records.includes(r.id)):[])];}
function goals(s){const q=s.archive;if(['done','legacy'].includes(q.stage))return [];if(q.stage==='recover')return markers(s).filter(r=>!r.npc);if(q.stage==='restore')return [{x:1060,y:940,name:'Чаша приливов'}];return [NERA];}
function objective(s){const q=s.archive;return {unmet:['Голоса под водой','Найдите Неру у «Чаши приливов» на северо-западе. Бирюзовые отметки ведут к главе.'],recover:['Вернуть три свидетельства',`Найдено ${q.records.length}/3. Каталог объясняет устройства. Перекройте поток на западе; наполните чаши подъёмника на востоке.`],interpret:['Что произошло с миром?','Вернитесь к Нере и сопоставьте записи. Их полный текст сохранён в дневнике.'],restore:['Приказ, который не услышали','Завершите обряд у «Чаши приливов»: вода 25 + воздух 15.'],done:['Архив снова говорит','Вы сохранили свидетельства обоих слоёв мира. Стражи исполняют старый приказ; следующая зацепка — Сердце горна.']}[q.stage]||null;}
function dialogue(sim,id){const s=sim.s,q=s.archive;if(id==='nera'){
 const echo=s.chapter.choice==='grove'?'Ива пишет, что вы сохранили рощу. Здесь тоже есть память, которую велели вычеркнуть. ':s.chapter.choice==='spring'?'Ива пишет, что вы вернули воду людям. Здесь та же вода скрывает то, что они должны узнать. ':'';
 if(q.stage==='unmet')return {title:'Нера · Голоса под водой',text:echo+'Вода в архиве слушается древних устройств. Сначала прочтите каталог севернее печати. Перекройте поток к западному залу землёй и осушите пол. Восточному подъёмнику, наоборот, нужна вода в трёх чашах; его пюпитр должен быть сухим. Верните три записи — узнаем, кого на самом деле охраняют стражи.',actions:[['archive-accept','Вернуть свидетельства']]};
 if(q.stage==='interpret')return {title:'Нера · Чей это приказ?',text:'Реки изменились ещё до падения городов. Смотритель получил приказ стереть имена, а отмена не дошла до стражей. Что связывает эти свидетельства?',actions:[['archive-invasion','Архив уничтожил внешний враг'],['archive-rewrite','Мир переписали по нашему приказу'],['archive-flood','Это был обычный паводок']]};
 return {title:'Нера · Сохранённые голоса',text:objective(s)[1],actions:[]};
 }const r=RECORDS.find(r=>r.id===id);return r?{title:r.name,text:r.text,actions:[]}:null;
}
function interact(sim,id){const s=sim.s,q=s.archive,m=markers(s).find(m=>m.id===id);if(!m||Math.hypot(s.player.x-m.x,s.player.y-m.y)>68)return false;if(id!=='nera'){
 if(!ready(s,id)){sim.notice(hint(s,id));return true;}q.records.push(id);if(q.records.length===3)q.stage='interpret';sim.emit('save');
 }sim.emit('archiveDialogue',{id});return true;}
function choose(sim,action){const s=sim.s,q=s.archive;if(Math.hypot(s.player.x-NERA.x,s.player.y-NERA.y)>68)return false;
 if(action==='archive-accept'&&q.stage==='unmet')q.stage='recover';else if(q.stage==='interpret'&&action==='archive-rewrite')q.stage='restore';else if(q.stage==='interpret'&&['archive-invasion','archive-flood'].includes(action)){sim.notice(action==='archive-invasion'?'Нера: «В свидетельстве сказано: приказ отдали сами хранители. Сравните его с отменой».':'Нера: «Паводок скрыл записи, но имена стирали намеренно. Причина появилась раньше наводнения».');return false;}else return false;sim.emit('save');return true;}
function update(sim,dt){const s=sim.s,q=s.archive;if(q.stage!=='recover')return;
 if(!q.records.includes('testimony')&&s.tiles[INLET]==='water'){q.surge+=dt;if(q.surge>=4){q.surge=0;for(const i of BASIN)if(DRY.includes(s.tiles[i])||['steam','mud'].includes(s.tiles[i]))writeTile(sim,i,'water');}}else q.surge=0;
 q.lift=powered(s)?Math.min(3,q.lift+dt):0;
}
function shrine(sim){const s=sim.s,q=s.archive;if(['legacy','done'].includes(q.stage))return false;if(q.stage!=='restore'){sim.notice(objective(s)[1]);return true;}if(s.player.mana.water<25||s.player.mana.air<15){sim.notice('Обряд: вода 25 + воздух 15. Соберите воду у берега и воздух движением.');return true;}s.player.mana.water-=25;s.player.mana.air-=15;q.stage='done';s.shrines[1].status='cleared';sim.notice('Приказ отменён. Архив сохранил оба голоса мира.');return false;}
function journal(s){const q=s.archive,o=objective(s);if(!o)return '';return `<div class="card story-journal"><span class="eyebrow">ГЛАВА II · ГОЛОСА ПОД ВОДОЙ</span><h3>${o[0]}</h3><p>${o[1]}</p>${q.records.map(id=>{const r=RECORDS.find(r=>r.id===id);return `<p><b>${r.name}.</b> ${r.text}</p>`;}).join('')}</div>`;}
return {NERA,INLET,BASIN,CHANNEL,DESK,RECORDS,point,initial,valid,prepare,powered,ready,hint,markers,goals,objective,dialogue,interact,choose,update,shrine,journal};
});
