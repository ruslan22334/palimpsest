(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SeamChapter=factory();})(globalThis,function(){
'use strict';
const idx=(x,y)=>y*104+x,near=(a,b,r=38)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
const TAM={id:'tam',name:'Там · хранитель переходов',x:1140,y:3460,npc:true};
const LINKS=[
 {id:'step',name:'I · Разорванная дорога',from:{x:940,y:3140},to:{x:1140,y:3140}},
 {id:'shore',name:'II · Остывший берег',from:{x:1140,y:2980},to:{x:1340,y:2980}},
 {id:'pulse',name:'III · Дыхание шва',from:{x:1340,y:2820},to:{x:1140,y:2820}}
];
const COURT=[idx(27,84),idx(28,84),idx(29,84),idx(27,85),idx(28,85),idx(29,85)];
const STAGES=['unmet','cross','choice','restore','done','legacy'];
function initial(legacy=false){return {stage:legacy?'legacy':'unmet',prepared:false,crossed:0,phase:0,choice:null};}
function valid(q){return !!(q&&STAGES.includes(q.stage)&&typeof q.prepared==='boolean'&&Number.isInteger(q.crossed)&&q.crossed>=0&&q.crossed<=3&&Number.isFinite(q.phase)&&q.phase>=0&&q.phase<8&&[null,'weave','border'].includes(q.choice)&&(q.stage!=='unmet'||q.crossed===0)&&(!['choice','restore','done'].includes(q.stage)||q.crossed===3)&&(q.stage!=='cross'||q.crossed<3)&&(!['restore','done'].includes(q.stage)||q.choice!==null)&&(!['unmet','cross','choice','legacy'].includes(q.stage)||q.choice===null));}
function write(sim,i,t){if(sim.s.tiles[i]==='barrier')return;sim.s.tiles[i]=t;delete sim.s.terrainTimers[i];delete sim.s.terrainCredit[i];sim.emit('terrain',{index:i});}
function tile(p){return idx(Math.floor(p.x/40),Math.floor(p.y/40));}
function prepare(sim){const q=sim.s.seam;if(q.prepared||q.stage==='legacy')return;q.prepared=true;
 for(let y=68;y<=88;y++)for(let x=21;x<=36;x++)write(sim,idx(x,y),'ruin');
 for(const [x,y] of [[26,78],[31,74],[30,70]])for(let d=-1;d<=1;d++)write(sim,idx(x,y+d),'wall');
 for(const link of LINKS){write(sim,tile(link.from),'obsidian');write(sim,tile(link.to),'ruin');}
 write(sim,tile(LINKS[1].to),'lava');
 for(const [x,y,t] of [[23,79,'rift'],[28,75,'water'],[33,71,'rift'],[27,86,'tree'],[29,86,'tree'],[30,87,'water'],[26,87,'rift']])write(sim,idx(x,y),t);
}
function window(s){return {open:s.seam.phase<5,left:Math.ceil((s.seam.phase<5?5:8)-s.seam.phase)};}
function shoreReady(s){return ['obsidian','stone'].includes(s.tiles[tile(LINKS[1].to)]);}
function hint(s){const q=s.seam,link=LINKS[q.crossed];if(!link)return 'Все переходы закреплены. Вернитесь к Таму.';if(q.crossed===1&&!shoreReady(s))return 'Берег раскалён. Охладите лаву водой до обсидиана или укрепите землёй до камня, затем перейдите воплощением пространства.';if(q.crossed===2){const w=window(s);return w.open?'Шов открыт ещё '+w.left+' с. Перейдите с исходной руны на ответную воплощением пространства.':'Шов закрыт ещё '+w.left+' с. Дождитесь зелёной связи.';}return 'Встаньте на исходную руну и направьте воплощение пространства на ответную. Простого шага или рывка недостаточно.';}
function markers(s){return s.seam.stage==='legacy'?[]:[TAM];}
function goals(s){const q=s.seam;if(['done','legacy'].includes(q.stage))return [];if(q.stage==='cross'){const l=LINKS[q.crossed];return [{...l.from,name:l.name},{...l.to,name:'Ответная руна'}];}return q.stage==='restore'?[{x:1140,y:3260,name:'Шов мироздания'}]:[TAM];}
function consequence(s){return s.seam.choice==='border'?'Вы сохранили два самостоятельных берега. Между ними остались согласованные переходы: никто больше не исчезает ради чужого дома.':'Вы связали оба слоя общей дорогой. Новые соседи учатся жить рядом; ни один голос больше не стирается ради другого.';}
function memories(s){const lines=[];
 if(s.chapter.stage==='done')lines.push(s.chapter.choice==='spring'?'Родник Ивы питает дорогу между поселениями.':'Роща Ивы хранит имена тех, кого мир едва не забыл.');
 if(s.archive.stage==='done')lines.push('Свидетельства Неры позволяют отличить приказ Переписчика от воли жителей.');
 if(s.forge.stage==='done')lines.push('Сохранённый горн Орина даёт мастерам инструменты для восстановления обоих берегов.');
 if(s.mirror.stage==='done')lines.push(s.mirror.choice==='shelter'?'В тихой роще Серы прежние жители обрели убежище.':'В светлом дворе Серы жители двух слоёв встречаются впервые.');
 return lines;
}
function objective(s){const q=s.seam;return {unmet:['Дорога для двух миров','Найдите Тама у Шва мироздания на юго-западе.'],cross:['Свяжите три перехода',`Закреплено ${q.crossed}/3. ${hint(s)}`],choice:['Общая дорога или два берега?','Вернитесь к Таму и решите, как сосуществовать двум слоям мира.'],restore:['Закрепите новый договор','Обряд у Шва мироздания: тень 25 + пространство 15.'],done:['Пять голосов готовы',consequence(s)+' Вернитесь к Первому разлому к северу от обсерватории.']}[q.stage]||null;}
function dialogue(sim){const s=sim.s,q=s.seam;
 if(q.stage==='unmet')return {title:'Там · Дорога для двух миров',text:'Здесь расстояние не совпадает с дорогой. Закрепите три перехода севернее печати по порядку: с исходной руны на ответную, воплощением пространства. Первый проходит сквозь скалу; второй требует сначала охладить берег водой или укрепить землёй; третий открывается на пять секунд из восьми. Руны показывают направление и состояние. Если переход не засчитан, вернитесь на исходную руну и попробуйте ещё раз. Местность можно менять; отмеченную исходную руну окружает обсидиан.',actions:[['seam-accept','Проложить переходы']]};
 if(q.stage==='choice')return {title:'Там · Два берега',text:memories(s).join(' ')+' Оба мира заслуживают будущего. Свяжем их общей дорогой или сохраним отдельные берега с согласованными переходами? Решение изменит двор шва и останется в последней странице.',actions:[['seam-weave','Связать общей дорогой'],['seam-border','Сохранить два берега']]};
 return {title:'Там · Хранитель переходов',text:objective(s)?.[1]||'Дорога помнит вас.',actions:[]};
}
function interact(sim){if(!near(sim.s.player,TAM,68))return false;sim.emit('seamDialogue');return true;}
function choose(sim,action){const s=sim.s,q=s.seam;if(!near(s.player,TAM,68))return false;
 if(action==='seam-accept'&&q.stage==='unmet')q.stage='cross';else if(q.stage==='choice'&&['seam-weave','seam-border'].includes(action)){q.choice=action==='seam-weave'?'weave':'border';q.stage='restore';COURT.forEach((i,n)=>write(sim,i,q.choice==='weave'?(n%3===1?'rift':'soil'):(n<3?'crystal':'tree')));}else return false;sim.emit('save');return true;
}
// Called only for a paid player self-spell that actually moved through the space aspect.
function crossed(sim,from,to){const s=sim.s,q=s.seam;if(q.stage!=='cross')return false;const l=LINKS[q.crossed];if(!near(from,l.from)||!near(to,l.to))return false;
 if(q.crossed===1&&!shoreReady(s)||q.crossed===2&&!window(s).open){sim.notice(hint(s));return false;}
 q.crossed++;if(q.crossed===3)q.stage='choice';sim.notice(q.crossed===3?'Три перехода закреплены. Вернитесь к Таму.':`Переход закреплён: ${q.crossed}/3. Следующая пара отмечена на карте.`);sim.ring(to.x,to.y,65,'#90e4cf');sim.emit('save');return true;
}
function update(sim,dt){if(sim.s.seam.stage==='cross')sim.s.seam.phase=(sim.s.seam.phase+dt)%8;}
function shrine(sim){const s=sim.s,q=s.seam;if(['legacy','done'].includes(q.stage))return false;if(q.stage!=='restore'){sim.notice(objective(s)[1]);return true;}if(s.player.mana.shadow<25||s.player.mana.space<15){sim.notice('Обряд: тень 25 + пространство 15.');return true;}s.player.mana.shadow-=25;s.player.mana.space-=15;q.stage='done';s.shrines[4].status='cleared';return false;}
function journal(s){const o=objective(s);return o?`<div class="card story-journal"><span class="eyebrow">ГЛАВА V · ДОРОГА ДЛЯ ДВУХ МИРОВ</span><h3>${o[0]}</h3><p>${o[1]}</p><p>Переходы: ${s.seam.crossed}/3. ${s.seam.choice?'Ваш выбор: '+(s.seam.choice==='weave'?'общая дорога':'два берега')+'.':''}</p>${memories(s).map(t=>'<p>'+t+'</p>').join('')}</div>`:'';}
return {TAM,LINKS,COURT,initial,valid,prepare,tile,window,shoreReady,hint,markers,goals,consequence,memories,objective,dialogue,interact,choose,crossed,update,shrine,journal};
});
