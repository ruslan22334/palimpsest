(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./knowledge.js'));else root.Arcana=factory(root.Knowledge);})(globalThis,function(K){
'use strict';
const SIZE=104,TILE=40;
const MANA=[
{id:'earth',name:'Земля',color:'#d3b17c',glyph:'◆',source:'Стойте на почве, песке или камне. Движение прерывает сбор.'},
{id:'water',name:'Вода',color:'#78c8e4',glyph:'≈',source:'Войдите в воду или подойдите к берегу. Вода замедляет движение.'},
{id:'fire',name:'Огонь',color:'#f29567',glyph:'✦',source:'Подойдите к огню или лаве. Собирать с берега безопаснее.'},
{id:'air',name:'Воздух',color:'#d3e9da',glyph:'⌁',source:'Двигайтесь: воздух накапливается только во время бега.'},
{id:'life',name:'Жизнь',color:'#9bd68b',glyph:'❧',source:'Находитесь рядом с живыми деревьями. Магия жизни выращивает рощи.'},
{id:'light',name:'Свет',color:'#f0d995',glyph:'☼',source:'Стойте у золотых кристаллов или восстановленных печатей.'},
{id:'shadow',name:'Тень',color:'#ba9cdb',glyph:'☾',source:'Находитесь на руинах или рядом с фиолетовым разломом.'},
{id:'space',name:'Пространство',color:'#90e4cf',glyph:'◇',source:'Подойдите к разлому или обсидиану. Охлаждайте лаву водой.'},
{id:'blood',name:'Кровь',color:'#ed8295',glyph:'♢',source:'Ранения живых противников и раны от врагов. Щит и самоурон не дают маны.'},
{id:'death',name:'Смерть',color:'#bbc4d8',glyph:'†',source:'Побеждайте противников рядом. Каждое существо даёт награду лишь однажды.'}
];
const FORMS=[{id:'bolt',name:'Снаряд',desc:'Прицельный выстрел • 340 дальность',glyph:'↗',level:0},{id:'burst',name:'Кольцо',desc:'Удар вокруг мага • радиус 125',glyph:'◎',level:0},{id:'field',name:'Печать',desc:'Область у курсора • длится 4 с',glyph:'△',level:1},{id:'self',name:'Воплощение',desc:'Лечение, защита или перемещение',glyph:'◈',level:0}];
const MODS=[{id:'plain',name:'Чистая',desc:'Без дополнительной стоимости',level:0},{id:'power',name:'Усиление',desc:'+65% сила • +50% основная мана',level:0},{id:'reach',name:'Протяжение',desc:'+65% дальность и радиус • 4 воздуха',level:1},{id:'echo',name:'Эхо',desc:'Повтор через 0,35 с • 5 пространства',level:2},{id:'chain',name:'Связь',desc:'Две дополнительные цели • 5 света',level:3},{id:'siphon',name:'Жатва',desc:'Возвращает 7 маны стихии окружения • 4 тени',level:2}];
const EFFECTS={blood:'Ранит живых и возвращает часть урона здоровьем. Воплощение: лечение.',death:'Сдерживает живых и духов. Воплощение: щит и кольцо замедления.',earth:'Крушит камни, поднимает сушу из воды. Воплощение: каменный щит.',water:'Тушит огонь, охлаждает лаву в обсидиан, создаёт воду. Замедляет врагов.',fire:'Поджигает рощи и горючих врагов, испаряет воду. Воплощение: огненный венец.',air:'Отбрасывает врагов, развеивает огонь. Воплощение: ускорение.',life:'Выращивает деревья на почве. Губительна для нежити, почти не ранит живых и механизмы. Воплощение: лечение на 30 здоровья.',light:'Очищает разломы в кристаллы. Дополнительный урон порождениям тени.',shadow:'Разрушает кристаллы и камень, оставляя разломы. Пугает живых врагов; сила страха зависит от их стойкости.',space:'Притягивает врагов. Воплощение: телепорт к курсору сквозь препятствия.'};
const TERRAINS={soil:{color:'#263e35',name:'Земля'},grass:{color:'#2d4a3c',name:'Луг'},water:{color:'#173e51',name:'Вода'},stone:{color:'#38474a',name:'Камень'},wall:{color:'#455457',name:'Скала'},tree:{color:'#244c3d',name:'Роща'},sand:{color:'#615b43',name:'Песок'},lava:{color:'#693c32',name:'Лава'},fire:{color:'#62402f',name:'Огонь'},crystal:{color:'#4c574b',name:'Светокристалл'},ruin:{color:'#353444',name:'Руины'},rift:{color:'#40384e',name:'Разлом'},obsidian:{color:'#254b4e',name:'Обсидиан'},steam:{color:'#36505a',name:'Пар'}};
const SHRINES=[{name:'Корни памяти',x:27,y:48,element:'earth',second:'life',biome:'Сады памяти',text:'Камень помнит шаги тех, кто прошёл до нас. Корни помнят их имена.'},{name:'Чаша приливов',x:26,y:23,element:'water',second:'air',biome:'Затопленные архивы',text:'Они пытались остановить реку. Река сохранила лишь то, что умело меняться.'},{name:'Сердце горна',x:76,y:24,element:'fire',second:'earth',biome:'Пепельный предел',text:'Первый огонь был подарком. Второй — оружием. Третий мы ещё можем выбрать.'},{name:'Зеркало рассвета',x:80,y:75,element:'light',second:'water',biome:'Стеклянные поля',text:'Свет не уничтожает тень. Он даёт ей форму, которую можно понять.'},{name:'Шов мироздания',x:28,y:81,element:'shadow',second:'space',biome:'Безмолвный шов',text:'Мир не был сломан. Он был написан поверх другого. Теперь оба просят голоса.'}];
const RELICS=[{id:'reservoir',name:'Сосуд приливов',desc:'+20 к вместимости всех видов маны.'},{id:'roots',name:'Память корней',desc:'Сбор маны из окружения на 35% быстрее.'},{id:'heart',name:'Живое сердце',desc:'+30 максимального здоровья и полное лечение.'},{id:'lens',name:'Линза рассвета',desc:'+20% к урону всех заклинаний.'},{id:'stride',name:'Нить странника',desc:'Рывок стоит 3 воздуха вместо 7. Скорость +12%.'}];
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function cost(spell){const c={};c[spell.element]=spell.form==='field'?13:spell.form==='burst'?11:spell.form==='self'?10:6;if(spell.mod==='power')c[spell.element]=Math.ceil(c[spell.element]*1.5);const extras={reach:['air',4],echo:['space',5],chain:['light',5],siphon:['shadow',4]};if(extras[spell.mod]){const [e,v]=extras[spell.mod];c[e]=(c[e]||0)+v;}return c;}
function spellName(s){return MANA.find(m=>m.id===s.element).name+' · '+FORMS.find(f=>f.id===s.form).name;}
function canPay(mana,c){return Object.entries(c).every(([k,v])=>mana[k]>=v);}
function pay(mana,c){if(!canPay(mana,c))return false;for(const k in c)mana[k]-=c[k];return true;}
function terrainReaction(t,e){
if(e==='earth'){if(['water','steam'].includes(t))return 'soil';if(t==='wall')return 'stone';if(t==='lava')return 'stone';}
if(e==='water'){if(t==='lava')return 'obsidian';if(['fire','soil','sand'].includes(t))return 'water';}
if(e==='fire'){if(t==='tree'||t==='grass')return 'fire';if(t==='water')return 'steam';}
if(e==='air'&&t==='fire')return 'soil';
if(e==='life'&&['soil','grass','sand'].includes(t))return 'tree';
if(e==='light'&&t==='rift')return 'crystal';
if(e==='shadow'&&['crystal','wall'].includes(t))return 'rift';
return t;}
function biome(x,y){if(x<46&&y<38)return 1;if(x>59&&y<43)return 2;if(x>59&&y>58)return 3;if(x<47&&y>66)return 4;return 0;}
function makeWorld(seed=31719){const r=rng(seed),tiles=[];for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const b=biome(x,y),v=r();let t='grass';if(b===0)t=v<.14?'tree':v<.19?'wall':v<.24?'stone':'grass';if(b===1)t=v<.55?'water':v<.63?'tree':v<.68?'wall':'sand';if(b===2)t=v<.24?'lava':v<.4?'wall':v<.46?'fire':'stone';if(b===3)t=v<.14?'crystal':v<.20?'wall':v<.28?'water':'sand';if(b===4)t=v<.13?'rift':v<.24?'wall':'ruin';if(x===0||y===0||x===SIZE-1||y===SIZE-1)t='wall';tiles.push(t);}
// Each destination has a traversable three-tile road from the sanctuary.
const carve=(x,y,t='soil')=>{if(x>0&&y>0&&x<SIZE-1&&y<SIZE-1)tiles[y*SIZE+x]=t;};
for(const s of [...SHRINES,{x:53,y:48}]){let x=52,y=53;while(x!==s.x||y!==s.y){for(let d=-1;d<=1;d++){carve(x+d,y);carve(x,y+d);}if(x!==s.x)x+=Math.sign(s.x-x);else y+=Math.sign(s.y-y);}}
for(const s of [...SHRINES,{x:52,y:53},{x:53,y:47}])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=19)carve(s.x+dx,s.y+dy,s.element==='shadow'?'ruin':'soil');
// Reliable, renewable sources around the initial camp and each attunement.
for(const [dx,dy,t] of [[-5,-2,'tree'],[-5,-1,'tree'],[-5,0,'tree'],[4,-2,'water'],[5,-2,'water'],[4,-1,'water'],[4,3,'fire'],[-3,5,'crystal'],[3,5,'rift']])carve(52+dx,53+dy,t);
for(const s of SHRINES){const source={earth:'tree',water:'water',fire:'lava',light:'crystal',shadow:'rift'}[s.element];for(let d=-1;d<=1;d++)carve(s.x+5,s.y+d,source);}
return tiles;}
function createState(seed=31719,difficulty='normal'){return {version:2,knowledge:K.initial(),worldPopulated:false,eventLedger:{},terrainCredit:{},nextEnemyId:1,seed,difficulty,tiles:makeWorld(seed),time:0,player:{x:52.5*TILE,y:53.5*TILE,hp:100,maxHp:100,mana:Object.fromEntries(MANA.map(m=>[m.id,K.BASIC.includes(m.id)?24:0])),cap:60,shield:0},spells:[{form:'bolt',element:'earth',mod:'plain'},{form:'bolt',element:'water',mod:'plain'},{form:'burst',element:'air',mod:'plain'},{form:'self',element:'earth',mod:'plain'}],selected:0,shrines:SHRINES.map(s=>({...s,status:'dormant'})),relics:[],shards:0,research:0,enemies:[],pickups:[],discovered:new Array(SIZE*SIZE).fill(0),stats:{kills:0,casts:0,transforms:0,deaths:0,collected:0},checkpoint:{x:52.5*TILE,y:53.5*TILE},tutorial:0,boss:null,won:false,started:true};}
function validEnemy(e){return !!(e&&Number.isSafeInteger(e.id)&&e.id>0&&Number.isFinite(e.hp)&&e.hp>=0&&Number.isFinite(e.maxHp)&&e.maxHp>0&&Number.isFinite(e.x)&&Number.isFinite(e.y));}
function validLedger(ledger){return !!(ledger&&typeof ledger==='object'&&!Array.isArray(ledger)&&Object.entries(ledger).every(([id,v])=>/^(enemy:[1-9][0-9]*|boss)$/.test(id)&&v&&Number.isFinite(v.out)&&v.out>=0&&Number.isFinite(v.incoming)&&v.incoming>=0&&typeof v.dead==='boolean'));}
function migrateSave(input){
if(!input||![1,2].includes(input.version))return null;
let s;try{s=JSON.parse(JSON.stringify(input));}catch{return null;}
if(s.version===1){
 if(!s.player?.mana||!Array.isArray(s.spells)||!s.spells.every(x=>x&&typeof x==='object')||!Array.isArray(s.enemies)||!s.enemies.every(validEnemy))return null;
 s.version=2;s.player.mana.blood=0;s.player.mana.death=0;s.knowledge=K.initial();
 for(const spell of s.spells)if(MANA.some(m=>m.id===spell.element)&&!s.knowledge.known.includes(spell.element))s.knowledge.known.push(spell.element);
 s.terrainCredit={};s.worldPopulated=true;s.nextEnemyId=1+Math.max(0,...s.enemies.map(e=>Number.isSafeInteger(e.id)?e.id:0));s.eventLedger={};
 // Existing wounds were dealt before event mana existed and cannot be harvested twice.
 for(const e of s.enemies)if(Number.isSafeInteger(e.id)&&e.id>0)s.eventLedger['enemy:'+e.id]={out:Math.max(0,(e.maxHp||0)-(e.hp||0)),incoming:0,dead:!!e.dead||e.hp<=0};
 if(s.boss)s.eventLedger.boss={out:Math.max(0,s.boss.maxHp-s.boss.hp),incoming:0,dead:false};
}
return validSave(s)?s:null;
}
function validSave(s){return !!(s&&s.version===2&&K.valid(s.knowledge,MANA.map(m=>m.id))&&typeof s.worldPopulated==='boolean'&&Number.isSafeInteger(s.nextEnemyId)&&s.nextEnemyId>0&&validLedger(s.eventLedger)&&s.terrainCredit&&typeof s.terrainCredit==='object'&&!Array.isArray(s.terrainCredit)&&Object.entries(s.terrainCredit).every(([i,v])=>/^\d+$/.test(i)&&Number(i)<SIZE*SIZE&&v===true)&&Array.isArray(s.tiles)&&s.tiles.length===SIZE*SIZE&&s.tiles.every(t=>TERRAINS[t])&&s.player&&Number.isFinite(s.player.x)&&Number.isFinite(s.player.y)&&s.player.x>=TILE&&s.player.x<(SIZE-1)*TILE&&s.player.y>=TILE&&s.player.y<(SIZE-1)*TILE&&Number.isFinite(s.player.hp)&&s.player.hp>0&&Number.isFinite(s.player.cap)&&s.player.cap>=60&&MANA.every(m=>Number.isFinite(s.player.mana?.[m.id])&&s.player.mana[m.id]>=0)&&Array.isArray(s.spells)&&s.spells.length===4&&s.spells.every(p=>p&&MANA.some(m=>m.id===p.element)&&FORMS.some(f=>f.id===p.form)&&MODS.some(m=>m.id===p.mod))&&Array.isArray(s.shrines)&&s.shrines.length===5&&s.shrines.every(x=>x&&['dormant','active','cleared','restored'].includes(x.status))&&Array.isArray(s.enemies)&&s.enemies.every(validEnemy)&&Array.isArray(s.pickups)&&Array.isArray(s.discovered)&&s.discovered.length===SIZE*SIZE&&Array.isArray(s.relics)&&s.stats&&Number.isFinite(s.research)&&Number.isFinite(s.time));}
function manaRates(tiles,p,moving,restored=[]){const tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE),on=tiles[ty*SIZE+tx],near=new Set();for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)near.add(tiles[(ty+dy)*SIZE+tx+dx]);const rates=Object.fromEntries(MANA.map(m=>[m.id,0]));if(!moving&&['soil','grass','stone','sand','tree'].includes(on))rates.earth=3.6;if(near.has('water'))rates.water=3;if(near.has('fire')||near.has('lava'))rates.fire=3.4;if(moving)rates.air=2.7;if(near.has('tree'))rates.life=2.8;if(near.has('crystal')||restored.some(s=>Math.hypot(p.x-(s.x+.5)*TILE,p.y-(s.y+.5)*TILE)<160))rates.light=3.2;if(on==='ruin'||near.has('rift'))rates.shadow=2.6;if(near.has('rift')||near.has('obsidian'))rates.space=2.8;return rates;}
function reachable(tiles,start,end){const seen=new Set([start]),q=[start];for(let i=0;i<q.length;i++){const id=q[i];if(id===end)return true;const x=id%SIZE,y=Math.floor(id/SIZE);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*SIZE+nx;if(nx>0&&ny>0&&nx<SIZE-1&&ny<SIZE-1&&!seen.has(n)&&tiles[n]!=='wall'){seen.add(n);q.push(n);}}}return false;}
return {SIZE,TILE,MANA,FORMS,MODS,EFFECTS,TERRAINS,SHRINES,RELICS,rng,clamp,dist,cost,spellName,canPay,pay,terrainReaction,biome,makeWorld,createState,validSave,migrateSave,manaRates,reachable};
});
