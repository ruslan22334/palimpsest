const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../core.js'),F=require('../fortifications.js'),Simulation=require('../simulation.js');
const recipe=(form='bolt',mod='plain')=>({elements:['earth','air'],form,mod});
function setup(){const s=A.createState(31719);s.worldPopulated=true;s.enemies=[];s.tiles.fill('soil');s.player.x=1620;s.player.y=1620;s.player.cap=80;for(const k in s.player.mana)s.player.mana[k]=80;s.research=3;return new Simulation(s);}
function step(sim,time){for(let i=0;i<Math.ceil(time/.025);i++)sim.update(.025);}
function center(i){return {x:(i%104+.5)*40,y:(Math.floor(i/104)+.5)*40};}
test('earth and air build paid walls in all four forms without changing ready slots',()=>{
 for(const form of ['bolt','burst','field','self']){const sim=setup(),p=sim.s.player,slots=JSON.stringify(sim.s.spells),target={x:p.x+160,y:p.y};assert.ok(sim.cast(target,false,recipe(form)),form);const cost=A.cost(recipe(form));assert.equal(p.mana.earth,80-cost.earth);assert.equal(p.mana.air,80-cost.air);step(sim,.6);assert.ok(Object.keys(sim.s.walls).length>0,form);assert.ok(Object.keys(sim.s.walls).length<=3);assert.equal(JSON.stringify(sim.s.spells),slots);assert.ok(sim.s.knowledge.facts.includes('reaction:barrier'));assert.ok(A.validSave(sim.s));}
});
test('occupied sites, landmarks, unsupported ground and missing resources cannot be built over',()=>{
 const sim=setup(),p=sim.s.player;for(const target of [{x:2100,y:2140},{x:2140,y:1900}])assert.equal(F.plan(sim.s,target).cells.length,0);sim.s.tiles.fill('water');const before={...p.mana};assert.equal(sim.cast({x:p.x+160,y:p.y},false,recipe()),false);assert.deepEqual(p.mana,before);sim.s.tiles.fill('soil');sim.cooldown=0;p.mana.air=0;assert.equal(sim.cast({x:p.x+160,y:p.y},false,recipe()),false);assert.equal(Object.keys(sim.s.walls).length,0);
 const enemy=sim.spawn('crawler',1780,1620);assert.equal(F.plan(sim.s,enemy).cells.length,0);
});
test('a wall cannot close the only corridor to an already reachable shrine',()=>{
 const sim=setup(),s=sim.s;s.tiles.fill('wall');for(let x=25;x<=70;x++)s.tiles[40*104+x]='soil';s.shrines[0].x=65;s.shrines[0].y=40;const plan=F.plan(s,{x:1820,y:1620});assert.equal(plan.cells.length,0);assert.match(plan.reason,/проход/);
});
test('dash and large knockback steps stop at walls rather than tunneling',()=>{
 const sim=setup(),p=sim.s.player;sim.placeWall({x:1700,y:1620});sim.move(p,200,0);assert.ok(p.x<1680);p.x=1620;sim.dash(1,0);assert.ok(p.x<1680);
});
test('a fast enemy projectile damages the wall, not the player behind it',()=>{
 const sim=setup(),p=sim.s.player;sim.placeWall({x:1700,y:1620});const i=40*104+42;sim.projectiles.push({x:1800,y:1620,vx:-4000,vy:0,life:1,r:6,enemy:true,damage:15});step(sim,.05);assert.equal(p.hp,100);assert.equal(sim.projectiles.length,0);assert.equal(sim.s.walls[i].hp,65);
});
test('friendly projectiles stop at walls before damaging enemies behind them',()=>{
 const sim=setup(),p=sim.s.player;sim.placeWall({x:1700,y:1620});const enemy=sim.spawn('crawler',1740,1620);enemy.speed=0;const hp=enemy.hp;sim.projectiles.push({x:p.x,y:p.y,vx:4000,vy:0,life:1,r:7,enemy:false,power:1,spell:{element:'earth',form:'bolt',mod:'plain'},color:'#fff'});step(sim,.05);assert.equal(enemy.hp,hp);assert.ok(sim.s.walls[40*104+42].hp<80);
});
test('fire hardens, water softens, pressure breaks and material cycles never repair damage',()=>{
 const sim=setup();sim.placeWall({x:1740,y:1620});const i=40*104+43,w=sim.s.walls[i];sim.strikeWall(i,{element:'earth',weight:1});const ratio=w.hp/w.maxHp;sim.strikeWall(i,{element:'fire',weight:1});assert.equal(w.material,'brick');assert.equal(w.maxHp,120);assert.equal(w.hp/w.maxHp,ratio);sim.strikeWall(i,{element:'water',weight:1});assert.equal(w.material,'mud');assert.equal(w.hp/w.maxHp,ratio);sim.strikeWall(i,{element:'air',weight:2});assert.equal(sim.s.walls[i],undefined);assert.equal(sim.s.tiles[i],'stone');
});
test('free air sparks can dismantle a wall without rewarding blood or death',()=>{
 const sim=setup(),p=sim.s.player;sim.placeWall({x:1740,y:1620});const i=40*104+43;for(const k in p.mana)p.mana[k]=0;for(let n=0;n<6;n++)sim.transform(center(i).x,center(i).y,1,'air');assert.ok(!sim.s.walls[i]);assert.equal(p.mana.blood,0);assert.equal(p.mana.death,0);assert.equal(sim.s.stats.kills,0);
});
test('melee creatures deliberately break a nearby wall while ranged attacks stay blocked',()=>{
 const sim=setup();sim.placeWall({x:1740,y:1620});const e=sim.spawn('brute',1781,1620);e.speed=0;e.cool=999;const i=40*104+43;step(sim,4);assert.ok(!sim.s.walls[i]);assert.equal(sim.s.player.hp,100);
});
test('wall damage, material and shadows survive save loading and end on destruction',()=>{
 let sim=setup();sim.s.time=80;sim.placeWall({x:1740,y:1620});const i=40*104+43;sim.strikeWall(i,{element:'water',weight:1});sim.strikeWall(i,{element:'earth',weight:1});const old=structuredClone(sim.s.walls);sim=new Simulation(A.migrateSave(sim.s));assert.deepEqual(sim.s.walls,old);const shadow=A.daylight.shadow('barrier',43,40,A.daylight.sky(80)),point={x:shadow.ex,y:shadow.ey};assert.ok(A.daylight.exposure(sim.s.tiles,point,80).shaded);for(const key of Object.keys(sim.s.walls))sim.strikeWall(+key,{element:'earth',weight:20});assert.equal(A.daylight.exposure(sim.s.tiles,point,80).shaded,false);
});
test('field repeats cannot repair or rebuild its destroyed wall',()=>{
 const sim=setup();sim.cast({x:1780,y:1620},false,recipe('field'));step(sim,.1);assert.ok(Object.keys(sim.s.walls).length);for(const i of Object.keys(sim.s.walls))sim.strikeWall(+i,{element:'earth',weight:20});step(sim,2);assert.equal(Object.keys(sim.s.walls).length,0);
});
test('v4 migration preserves campaign and rejects inconsistent wall metadata',()=>{
 const s=setup().s;s.version=4;delete s.walls;s.shards=27;const next=A.migrateSave(s);assert.equal(next.version,5);assert.deepEqual(next.walls,{});assert.equal(next.shards,27);for(const change of [s=>s.tiles[400]='barrier',s=>s.walls[400]={hp:80,maxHp:80,material:'earth'},s=>{s.tiles[400]='barrier';s.walls[400]={hp:-1,maxHp:80,material:'earth'};}]){const bad=structuredClone(next);change(bad);assert.equal(A.migrateSave(bad),null);}
});
test('a summoned creature never appears embedded in an existing wall',()=>{
 const sim=setup();sim.placeWall({x:1740,y:1620});const e=sim.spawn('shade',1740,1620,99);assert.equal(sim.blocked(e.x,e.y,18),false);assert.equal(e.homeX,e.x);assert.equal(e.homeY,e.y);
});
test('construction cap rejects another wall and existing walls cannot be repaired by recasting',()=>{
 const sim=setup();sim.placeWall({x:1740,y:1620});const i=40*104+43;sim.strikeWall(i,{element:'earth',weight:1});const hp=sim.s.walls[i].hp;assert.equal(sim.placeWall({x:1740,y:1620}),0);assert.equal(sim.s.walls[i].hp,hp);
 for(let n=0;Object.keys(sim.s.walls).length<F.LIMIT;n++){const id=10*104+10+n;sim.s.tiles[id]='barrier';sim.s.walls[id]={hp:80,maxHp:80,material:'earth'};}const plan=F.plan(sim.s,{x:1860,y:1620});assert.equal(plan.cells.length,0);assert.match(plan.reason,/много стен/);
});
