const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../core.js'),S=require('../spellcraft.js'),Simulation=require('../simulation.js');
const spell=(elements,form='bolt',mod='plain')=>({elements,form,mod});
function setup(){const s=A.createState(42),sim=new Simulation(s);s.enemies=[];s.tiles.fill('soil');s.player.cap=80;for(const e of S.IDS)s.player.mana[e]=80;return sim;}
function step(sim,seconds){for(let i=0;i<Math.ceil(seconds/.025);i++)sim.update(.025);}
function target(sim,kind='crawler',dx=100,dy=0){const p=sim.s.player,e=sim.spawn(kind,p.x+dx,p.y+dy);e.speed=0;e.cool=999;e.hp=e.maxHp=1000;return e;}
function close(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
function tileAt(e){return Math.floor(e.y/40)*104+Math.floor(e.x/40);}

test('all 111110 ordered sequences compile deterministically into bounded non-overlapping instructions',()=>{
 let count=0;function visit(elements){if(elements.length){const p=S.compile(spell(elements));assert.ok(p);assert.equal(p.nodes.reduce((n,x)=>n+x.tokens,0),elements.length);assert.ok(p.nodes.every(n=>n.weight>0&&Number.isFinite(n.weight)));assert.ok(p.nodes.reduce((n,x)=>n+x.weight,0)<=2.91);assert.equal(Object.values(p.cost).reduce((a,b)=>a+b,0),6*elements.length);count++;}if(elements.length<5)for(const e of S.IDS)visit([...elements,e]);}visit([]);assert.equal(count,111110);
});
test('sequence costs charge every token, duplicate currency and modifier exactly once',()=>{
 assert.deepEqual(S.cost(spell(['water','fire','water'],'bolt','reach')),{water:12,fire:6,air:4});
 assert.deepEqual(S.cost(spell(['space','space'],'bolt','echo')),{space:17});
 assert.deepEqual(S.cost(spell(['earth','water'],'burst','power')),{earth:17,water:17});
 const sim=setup(),p=sim.s.player;p.mana.water=5;const before={...p.mana};assert.equal(sim.cast(p,false,spell(['earth','water'])),false);assert.deepEqual(p.mana,before);assert.equal(sim.projectiles.length,0);assert.equal(sim.s.stats.casts,0);
});
test('invalid and oversized programs fail before spending or creating effects',()=>{
 const sim=setup(),p=sim.s.player,before={...p.mana};for(const recipe of [spell([]),spell(Array(6).fill('earth')),spell(['bad']),spell(['earth'],'bad'),spell(['earth'],'bolt','bad'),{element:'fire',elements:['water'],form:'bolt'},null])assert.equal(sim.cast(p,false,recipe||{elements:null}),false);assert.deepEqual(p.mana,before);assert.equal(sim.projectiles.length,0);
});
test('repeats strengthen damage with diminishing returns and preserve single-aspect behavior',()=>{
 const sim=setup();const losses=[];for(let n=1;n<=5;n++){const e=target(sim);sim.hit(e,24,spell(Array(n).fill('earth')),e.x,e.y);losses.push(1000-e.hp);}close(losses[0],24);for(let n=2;n<5;n++)assert.ok(losses[n]-losses[n-1]<losses[n-1]-losses[n-2]);assert.ok(losses[4]<24*3);
});
test('ordered water/fire pairs consume the raw effects and produce different terrain',()=>{
 const sim=setup(),p=sim.s.player;sim.transform(p.x,p.y,20,spell(['water','fire']));assert.equal(sim.s.tiles[tileAt(p)],'steam');assert.ok(sim.s.knowledge.facts.includes('reaction:steam'));assert.ok(!sim.s.knowledge.facts.includes('terrain:fire:water:steam'));
 sim.s.tiles[tileAt(p)]='soil';sim.transform(p.x,p.y,20,spell(['fire','water']));assert.equal(sim.s.tiles[tileAt(p)],'water');assert.ok(sim.s.knowledge.facts.includes('reaction:quench'));
 const e=target(sim);sim.hit(e,24,spell(['water','fire']),p.x,p.y);assert.equal(e.burn,0);assert.ok(e.slow>0);assert.ok(e.wet>0);
});
test('ordinary ordered aspects retain meaningful terrain and self-cast order',()=>{
 const sim=setup(),p=sim.s.player;sim.s.tiles[tileAt(p)]='water';sim.transform(p.x,p.y,20,spell(['earth','life']));assert.equal(sim.s.tiles[tileAt(p)],'tree');sim.s.tiles[tileAt(p)]='water';sim.transform(p.x,p.y,20,spell(['life','earth']));assert.equal(sim.s.tiles[tileAt(p)],'water'); // consumed by living bark, cannot grow on water
 const a=setup(),b=setup(),ea=target(a,'crawler',200),eb=target(b,'crawler',200);a.cast(ea,false,spell(['space','fire'],'self'));b.cast(eb,false,spell(['fire','space'],'self'));assert.ok(ea.hp<1000);assert.equal(eb.hp,1000);
});
test('frost creates traversable ice and its remaining lifetime survives loading',()=>{
 let sim=setup(),p=sim.s.player,index=tileAt(p);sim.s.tiles[index]='water';sim.transform(p.x,p.y,20,spell(['water','air']));assert.equal(sim.s.tiles[index],'ice');assert.equal(sim.blocked(p.x,p.y),false);step(sim,2);
 sim=new Simulation(A.migrateSave(sim.s));close(sim.s.terrainTimers[index].left,4);step(sim,4.05);assert.equal(sim.s.tiles[index],'water');assert.ok(!sim.s.terrainTimers[index]);
});
test('overwriting temporary terrain cancels its previous timer',()=>{
 const sim=setup(),p=sim.s.player,index=tileAt(p);sim.s.tiles[index]='water';sim.transform(p.x,p.y,20,spell(['water','fire']));sim.transform(p.x,p.y,20,'earth');assert.equal(sim.s.tiles[index],'soil');assert.ok(!sim.s.terrainTimers[index]);sim.transform(p.x,p.y,20,'life');step(sim,9);assert.equal(sim.s.tiles[index],'tree');
});
test('mire roots grounded enemies without preventing their attacks, while spirits stay mobile',()=>{
 const sim=setup(),p=sim.s.player,e=target(sim,'archer'),spirit=target(sim,'wisp',150);sim.hit(e,20,spell(['earth','water']),p.x,p.y);sim.hit(spirit,20,spell(['earth','water']),p.x,p.y);assert.ok(e.root>0);assert.ok(!(spirit.root>0));e.cool=0;e.speed=50;const x=e.x,y=e.y;step(sim,.1);close(e.x,x);close(e.y,y);assert.ok(sim.projectiles.some(b=>b.enemy));
});
test('thermal shock hurts stone more than steam and still cannot ignite it',()=>{
 const sim=setup(),a=target(sim,'brute'),b=target(sim,'brute');sim.hit(a,24,spell(['fire','water']),0,0);sim.hit(b,24,spell(['water','fire']),0,0);assert.ok(a.hp<b.hp);assert.equal(a.burn,0);assert.equal(b.burn,0);
});
test('eclipse removes enemy projectiles but keeps friendly ones and records only an observed reaction',()=>{
 const sim=setup(),p=sim.s.player;const friendly={x:p.x,y:p.y,enemy:false};sim.projectiles=[friendly,{x:p.x,y:p.y,enemy:true},{x:p.x+600,y:p.y,enemy:true}];sim.transform(p.x,p.y,80,spell(['light','shadow']));assert.equal(sim.projectiles.length,2);assert.ok(sim.projectiles.includes(friendly));assert.ok(sim.s.knowledge.facts.includes('reaction:eclipse'));
 const blank=setup();blank.transform(p.x,p.y,20,spell(['light','shadow']));assert.ok(!blank.s.knowledge.facts.includes('reaction:eclipse'));
});
test('all six reactions execute as paid projectiles, bursts, fields and self casts',()=>{
 for(const [id,r] of Object.entries(S.REACTIONS))for(const form of ['bolt','burst','field','self']){const sim=setup(),p=sim.s.player;p.hp=50;const e=target(sim,'crawler',70);const recipe=spell(r.pair,form),before={...p.mana};assert.ok(sim.cast(e,false,recipe),`${id}/${form}`);for(const [k,n] of Object.entries(S.cost(recipe)))close(p.mana[k],before[k]-n);step(sim,.4);assert.ok(sim.s.knowledge.facts.includes('reaction:'+id),`${id}/${form}`);assert.ok(e.hp<e.maxHp||p.shield>0);assert.ok(A.validSave(sim.s));}
});
test('echo snapshots the entire program, pays once and never aliases the editable recipe',()=>{
 const sim=setup(),p=sim.s.player,recipe=spell(['water','air'],'bolt','echo');sim.s.spells[0]=recipe;sim.cast({x:p.x+300,y:p.y});recipe.elements[0]='fire';assert.deepEqual(sim.projectiles[0].spell.elements,['water','air']);assert.deepEqual(sim.delayed[0].spell.elements,['water','air']);close(p.mana.water,74);close(p.mana.air,74);close(p.mana.space,75);step(sim,.4);assert.equal(sim.s.stats.casts,1);assert.equal(sim.delayed.length,0);assert.ok(sim.projectiles.every(b=>b.spell.elements[0]==='water'));
});
test('chain delivers the whole program to two neighbors without per-token exponential propagation',()=>{
 const sim=setup(),p=sim.s.player,targets=[0,25,50,75].map(dy=>target(sim,'brute',100,dy));sim.hit(targets[0],24,spell(['earth','light','earth'],'bolt','chain'),p.x,p.y);assert.ok(targets.slice(0,3).every(e=>e.hp<1000));assert.equal(targets[3].hp,1000);assert.equal(new Set(sim.events.filter(e=>e.type==='damage').map(e=>e.targetId)).size,3);
});
test('multi-component overkill and harvest award each defeated enemy only once',()=>{
 const sim=setup(),p=sim.s.player,e=target(sim);p.mana.blood=p.mana.death=0;p.mana.earth=0;e.hp=3;sim.hit(e,24,spell(['earth','blood','death'],'bolt','siphon'),p.x,p.y);close(p.mana.blood,.6);close(p.mana.death,4);close(p.mana.earth,7);assert.equal(sim.s.stats.kills,1);
});
test('v2 recipes migrate without changing costs or campaign, and v3 rejects corrupt grammar and timers',()=>{
 const s=setup().s;s.version=2;delete s.terrainTimers;s.spells=s.spells.map(({element,form,mod})=>({element,form,mod}));s.shards=17;const next=A.migrateSave(s);assert.ok(next);assert.equal(next.version,4);assert.equal(s.version,2);assert.equal(next.shards,17);for(let i=0;i<4;i++){assert.deepEqual(next.spells[i].elements,[s.spells[i].element]);assert.deepEqual(A.cost(next.spells[i]),A.cost(s.spells[i]));}assert.deepEqual(A.migrateSave(next),next);
 for(const mutate of [s=>s.spells[0].elements=[],s=>s.spells[0].elements=Array(6).fill('earth'),s=>s.terrainTimers['1']={terrain:'ice',left:-1,after:'water'},s=>s.terrainTimers['1']={terrain:'ice',left:2,after:'invalid'}]){const copy=structuredClone(next);mutate(copy);assert.equal(A.migrateSave(copy),null);}
});

test('v3 save loading canonicalizes valid external recipes for renderer compatibility',()=>{const s=setup().s;s.spells[0]=spell(['water','fire']);const restored=A.migrateSave(s);assert.ok(restored);assert.equal(restored.spells[0].element,'water');assert.deepEqual(restored.spells[0].elements,['water','fire']);});

test('consecutive repeats strengthen utility duration as well as damage',()=>{const a=setup(),b=setup();a.cast(a.s.player,false,spell(['air'],'self'));b.cast(b.s.player,false,spell(['air','air'],'self'));assert.ok(b.haste>a.haste);assert.ok(b.haste<a.haste*2);assert.equal(S.compile(spell(['air','air'])).nodes.length,1);});
