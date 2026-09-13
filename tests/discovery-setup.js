'use strict';
// This fixture is excluded from desktop builds and never touches the normal 127.0.0.1 or file: save.
const key='palimpsest.save.v1',backup=key+'.backup',snapshot='palimpsest.test.stage2.original';
function allowed(){if(location.hostname!=='localhost'){document.getElementById('result').textContent='Откройте эту страницу через localhost, чтобы отделить тест от обычного сохранения.';return false;}if(!localStorage.getItem(snapshot))localStorage.setItem(snapshot,JSON.stringify({save:localStorage.getItem(key),backup:localStorage.getItem(backup)}));return true;}
function prepare(legacy){if(!allowed())return;const s=Arcana.createState(31719),sim=new Simulation(s);s.enemies=[];s.tiles.fill('soil');for(let x=0;x<104;x++){s.tiles[x]='wall';s.tiles[103*104+x]='wall';s.tiles[x*104]='wall';s.tiles[x*104+103]='wall';}s.player.hp=65;s.player.mana.earth=60;s.tutorial=5;for(const dx of [80,160,240]){const e=sim.spawn('crawler',s.player.x+dx,s.player.y);e.hp=30;e.speed=0;e.cool=999;}if(legacy){s.version=1;s.shards=19;s.research=2;s.spells[2]={element:'life',form:'self',mod:'plain'};s.player.mana.life=24;delete s.player.mana.blood;delete s.player.mana.death;for(const k of ['knowledge','eventLedger','worldPopulated','nextEnemyId','terrainCredit'])delete s[k];}localStorage.setItem(key,JSON.stringify(s));localStorage.removeItem(backup);location.assign('../index.html');}
document.getElementById('combat').onclick=()=>prepare(false);
document.getElementById('legacy').onclick=()=>prepare(true);
document.getElementById('corrupt').onclick=()=>{if(allowed()){localStorage.setItem(key,'{broken');location.assign('../index.html');}};
document.getElementById('restore').onclick=()=>{if(!allowed())return;const old=JSON.parse(localStorage.getItem(snapshot));for(const [k,value] of [[key,old.save],[backup,old.backup]])if(value===null)localStorage.removeItem(k);else localStorage.setItem(k,value);localStorage.removeItem(snapshot);location.assign('../index.html');};

// Stage III scene uses only localhost and the same reversible test backup.
document.getElementById('grammar').onclick=()=>{if(!allowed())return;const s=Arcana.createState(31719),sim=new Simulation(s);s.enemies=[];s.tiles.fill('soil');s.player.cap=80;s.player.hp=65;s.research=3;s.tutorial=5;s.player.mana=Object.fromEntries(Arcana.MANA.map(m=>[m.id,80]));s.knowledge.known=Arcana.MANA.map(m=>m.id);const e=sim.spawn('brute',s.player.x+180,s.player.y);e.hp=e.maxHp=500;e.speed=0;e.cool=999;for(let dy=-1;dy<=1;dy++)for(let dx=2;dx<=4;dx++)s.tiles[(53+dy)*104+52+dx]='water';localStorage.setItem(key,JSON.stringify(s));localStorage.removeItem(backup);location.assign('../index.html');};
// Stage V: deterministic solar scenes, restored through the same test backup.
function prepareSky(kind){if(!allowed())return;const s=Arcana.createState(31719);s.worldPopulated=true;s.enemies=[];s.tiles.fill('soil');s.time=kind==='night'?240:80;s.player.x=2020;s.player.y=2067;s.player.mana.air=60;s.player.mana.life=40;s.player.mana.fire=40;s.tutorial=5;s.tiles[50*104+50]='tree';s.tiles[51*104+51]='rift';s.tiles[49*104+54]='wall';s.tiles[52*104+54]='crystal';s.tiles[53*104+53]='fire';if(kind==='legacy'){s.version=3;s.shards=19;s.research=2;s.player.mana.light=37;for(const id of Knowledge.LEGACY_SOURCES)Knowledge.observe(s.knowledge,id);}localStorage.setItem(key,JSON.stringify(s));localStorage.removeItem(backup);location.assign('../index.html');}
document.getElementById('daylight').onclick=()=>prepareSky('day');
document.getElementById('nightlight').onclick=()=>prepareSky('night');
document.getElementById('oldlight').onclick=()=>prepareSky('legacy');
// Stage VI: open ground outside landmark protection with a stationary archer to the east.
function prepareWalls(firing=true){if(!allowed())return;const s=Arcana.createState(31719);s.worldPopulated=true;s.enemies=[];s.tiles.fill('soil');s.time=80;s.player.x=1620;s.player.y=1620;s.player.cap=80;for(const k in s.player.mana)s.player.mana[k]=80;s.research=3;s.tutorial=5;s.spells[0]=Arcana.normalizeSpell({elements:['earth','air'],form:'bolt',mod:'plain'});const sim=new Simulation(s),e=sim.spawn('archer',1950,1620);e.speed=0;e.cool=firing?2:999;e.hp=e.maxHp=500;localStorage.setItem(key,JSON.stringify(s));localStorage.removeItem(backup);location.assign('../index.html');};


document.getElementById('walls').onclick=()=>prepareWalls(true);
document.getElementById('quiet-walls').onclick=()=>prepareWalls(false);
