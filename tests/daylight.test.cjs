const test=require('node:test'),assert=require('node:assert/strict');
const D=require('../daylight.js'),A=require('../core.js'),K=require('../knowledge.js'),Simulation=require('../simulation.js');
function scene(time=80){const s=A.createState(31719);s.worldPopulated=true;s.enemies=[];s.tiles.fill('soil');s.time=time;s.player.x=2020;s.player.y=2067;return new Simulation(s);}
function step(sim,n=1){for(let i=0;i<n;i++)sim.update(.025);}
test('eight minute sky cycle has exact sunrise, sunset and repeatable direction',()=>{
 assert.equal(D.sky(0).clock,'08:00');assert.equal(D.sky(80).clock,'12:00');assert.equal(D.sky(199.999).daylight,true);assert.equal(D.sky(200).daylight,false);assert.equal(D.sky(439.999).daylight,false);assert.equal(D.sky(440).daylight,true);assert.equal(D.sky(480).day,2);assert.equal(D.sky(480).clock,'08:00');assert.equal(D.sky(480).dx,D.sky(0).dx);
 assert.ok(D.sky(0).dx<0);assert.ok(D.sky(160).dx>0);assert.ok(D.sky(80).stretch<D.sky(0).stretch);assert.equal(D.sky(240).phase,'Ночь');
});
test('a point in the projected tree shadow collects shadow instead of sunlight',()=>{
 const sim=scene(),s=sim.s,p=s.player;s.tiles[50*104+50]='tree';const shape=D.shadow('tree',50,50,D.sky(80));p.x=(shape.x+shape.ex)/2;p.y=(shape.y+shape.ey)/2;assert.ok(D.contains(p,shape));assert.equal(D.exposure(s.tiles,p,s.time).shaded,true);step(sim);assert.equal(sim.rates.light,0);assert.equal(sim.rates.shadow,2.6);assert.ok(s.knowledge.facts.includes('source:shadow:cast'));assert.ok(!s.knowledge.facts.includes('source:light:sun'));
 p.x+=80;step(sim);assert.ok(sim.rates.light>0);assert.equal(sim.rates.shadow,0);assert.ok(s.knowledge.facts.includes('source:light:sun'));
});
test('rendered capsule geometry and resource sampling agree across a moving sun',()=>{
 const tiles=Array(104*104).fill('soil');tiles[50*104+50]='wall';for(const time of [0,40,80,120,160,199]){const sun=D.sky(time),shape=D.shadow('wall',50,50,sun);for(let y=1940;y<=2180;y+=9)for(let x=1860;x<=2180;x+=11){const p={x,y},inside=D.contains(p,shape),rates=A.manaRates(tiles,p,false,[],time);assert.equal(D.exposure(tiles,p,time).shaded,inside);assert.equal(rates.shadow>0,inside);assert.equal(rates.light>0,!inside);}}
});
test('paid terrain magic creates and removes a usable mana shadow',()=>{
 const sim=scene(),p=sim.s.player;p.y=2060;p.mana.life=30;p.mana.fire=30;const target={x:2020,y:2027};assert.ok(sim.cast(target,false,{elements:['life'],form:'burst',mod:'plain'}));step(sim);assert.equal(sim.rates.shadow,2.6);assert.equal(sim.rates.light,0);assert.ok(p.mana.life<30);
 sim.cooldown=0;assert.ok(sim.cast(target,false,{elements:['fire'],form:'burst',mod:'plain'}));step(sim);assert.equal(sim.rates.shadow,0);assert.ok(sim.rates.light>0);assert.ok(sim.s.knowledge.facts.includes('source:shadow:cast'));
});
test('night has no universal dark mana and only nearby rifts yield shadow',()=>{
 const sim=scene(240),s=sim.s,p=s.player;for(const tile of ['soil','ruin','crystal','tree']){s.tiles.fill('soil');s.tiles[Math.floor(p.y/40)*104+Math.floor(p.x/40)]=tile;const rates=A.manaRates(s.tiles,p,false,[{x:50,y:51}],s.time);assert.equal(rates.light,0);assert.equal(rates.shadow,0);}
 s.tiles.fill('soil');s.tiles[51*104+51]='rift';step(sim);assert.equal(sim.rates.shadow,2.6);assert.ok(s.knowledge.facts.includes('source:shadow:night-rift'));assert.ok(!s.knowledge.facts.includes('source:shadow:cast'));
 s.time=80;step(sim);assert.equal(sim.rates.shadow,0);assert.ok(sim.rates.light>0);
});
test('sunset stops solar gathering on the transition tick and sunrise resumes it',()=>{
 const sim=scene(199.975),p=sim.s.player;step(sim);assert.equal(sim.rates.light,0);assert.equal(sim.rates.shadow,0);sim.s.time=439.975;step(sim);assert.ok(sim.rates.light>0);assert.equal(sim.rates.shadow,0);p.x+=80;assert.ok(D.sky(80).intensity>D.sky(0).intensity);
});
test('clock and shade survive save loading without advancing in pause',()=>{
 const sim=scene(10),s=sim.s;s.tiles[51*104+50]='tree';step(sim);const before=s.time,exposure=D.exposure(s.tiles,s.player,s.time);sim.active=false;step(sim,500);assert.equal(s.time,before);const loaded=A.migrateSave(JSON.parse(JSON.stringify(s))),next=new Simulation(loaded);assert.equal(next.s.time,before);assert.deepEqual(next.exposure,exposure);assert.ok(A.validSave(loaded));
});
test('v3 migration removes obsolete source claims, retaining knowledge, mana and campaign',()=>{
 const sim=scene(271),s=sim.s;s.version=3;s.shards=19;s.research=2;s.player.mana.light=37;s.player.mana.shadow=29;s.shrines[0].status='restored';for(const id of K.LEGACY_SOURCES)K.observe(s.knowledge,id);const before=JSON.stringify(s),next=A.migrateSave(s);assert.equal(JSON.stringify(s),before);assert.equal(next.version,7);assert.equal(next.time,271);assert.deepEqual(next.player,s.player);assert.deepEqual(next.spells,s.spells);assert.equal(next.shards,19);assert.equal(next.shrines[0].status,'restored');assert.ok(next.knowledge.known.includes('light'));assert.ok(next.knowledge.known.includes('shadow'));assert.ok(!next.knowledge.facts.some(id=>K.LEGACY_SOURCES.includes(id)));assert.ok(!next.knowledge.facts.includes('source:light:sun'));assert.deepEqual(A.migrateSave(next),next);
});
test('negative clocks and malformed old observations cannot enter the new save format',()=>{
 let s=A.createState();s.time=-1;assert.equal(A.migrateSave(s),null);s=A.createState();s.version=3;s.knowledge.facts.push('unknown');assert.equal(A.migrateSave(s),null);
});
test('new world has reachable daylight and nighttime sources near the observatory',()=>{
 for(let seed=0;seed<12;seed++){const s=A.createState(seed),found=new Set();for(let y=48;y<=59;y++)for(let x=47;x<=58;x++){if(s.tiles[y*104+x]==='wall')continue;const p={x:x*40+20,y:y*40+20};if(!A.reachable(s.tiles,53*104+52,y*104+x))continue;for(const time of [0,240]){const r=A.manaRates(s.tiles,p,false,[],time);if(r.light>0)found.add('sun');if(r.shadow>0)found.add(time===0?'shade':'rift');}}assert.equal(found.size,3,'seed '+seed);}
});
