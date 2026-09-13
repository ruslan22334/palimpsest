const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../core.js'),Simulation=require('../simulation.js'),C=require('../controls.js');
function scene(){const s=A.createState(31719);s.worldPopulated=true;s.enemies=[];s.research=3;for(const id of Object.keys(s.player.mana))s.player.mana[id]=60;return new Simulation(s);}
test('bindings survive serialization, swap collisions and reject reserved shortcuts',()=>{
 const c=new C.Controller();assert.equal(c.action('Digit3'),'select3');assert.ok(c.rebind('earth','KeyW'));assert.equal(c.action('KeyW'),'earth');assert.equal(c.action('KeyQ'),'up');assert.equal(c.rebind('earth','Escape'),false);assert.equal(c.rebind('earth','F11'),false);assert.equal(c.rebind('earth','ArrowUp'),false);
 const restored=new C.Controller(JSON.parse(JSON.stringify(c.preferences)));assert.equal(restored.key('earth'),'W');assert.deepEqual(restored.vector(new Set(['KeyQ','KeyD'])),{x:1,y:-1});assert.deepEqual(restored.vector(new Set(['ArrowLeft'])),{x:-1,y:0});
});
test('corrupt preferences restore a usable complete mapping without duplicate actions',()=>{
 for(const raw of [null,[],{mode:'bad',bindings:{earth:'Escape'}},{bindings:{...C.DEFAULTS,earth:'KeyW'}}]){const c=new C.Controller(raw);assert.deepEqual(c.preferences.bindings,C.DEFAULTS);assert.equal(c.preferences.mode,'slots');}
});
test('live casting pays the combined recipe and keeps prepared slots untouched',()=>{
 const sim=scene(),c=new C.Controller({mode:'live'}),slots=JSON.stringify(sim.s.spells),p=sim.s.player;c.append('water');c.append('air');assert.ok(c.cast(sim,{x:p.x+80,y:p.y}));assert.equal(p.mana.water,54);assert.equal(p.mana.air,54);assert.deepEqual(c.elements,['water','air']);assert.deepEqual(c.last.elements,c.elements);assert.equal(JSON.stringify(sim.s.spells),slots);
 c.elements.push('earth');assert.deepEqual(c.last.elements,['water','air']);c.elements=[];assert.ok(c.recall(3));assert.deepEqual(c.elements,['water','air']);c.elements.pop();assert.deepEqual(c.last.elements,['water','air']);
});
test('empty recipes, cooldown and missing mana do not replace last successful cast',()=>{
 const sim=scene(),c=new C.Controller({mode:'live'}),p=sim.s.player,target={x:p.x+90,y:p.y};assert.equal(c.cast(sim,target),false);assert.equal(sim.s.stats.casts,0);c.append('earth');assert.ok(c.cast(sim,target));c.elements=['fire'];assert.equal(c.cast(sim,target),false);assert.deepEqual(c.last.elements,['earth']);sim.cooldown=0;p.mana.fire=0;const before={...p.mana};assert.equal(c.cast(sim,target),false);assert.deepEqual(p.mana,before);assert.deepEqual(c.last.elements,['earth']);
});
test('mode switching separates slot casts from drafts and recalls either successful recipe',()=>{
 const sim=scene(),c=new C.Controller(),p=sim.s.player;c.elements=['death'];assert.ok(c.cast(sim,{x:p.x+80,y:p.y}));assert.deepEqual(c.last.elements,sim.s.spells[sim.s.selected].elements);c.toggle();assert.deepEqual(c.elements,['death']);c.recall(3);assert.deepEqual(c.elements,sim.s.spells[sim.s.selected].elements);c.toggle();assert.equal(c.preferences.mode,'slots');
});
test('live controls enforce five tokens and research gates including remembered recipes',()=>{
 const c=new C.Controller({mode:'live'});for(let i=0;i<5;i++)assert.ok(c.append('water'));assert.equal(c.append('air'),false);assert.equal(c.append('unknown'),false);assert.equal(c.choose(2,0),false);assert.equal(c.form,'bolt');assert.ok(c.choose(2,1));assert.equal(c.recipe(0),null);c.last={elements:['water'],form:'field',mod:'echo'};assert.equal(c.recall(0),false);assert.ok(c.recall(2));c.mod='plain';c.cycle(0);assert.equal(c.mod,'power');c.cycle(0);assert.equal(c.mod,'plain');
});
test('starting another journey clears the draft and recall but preserves preferences',()=>{
 const c=new C.Controller({mode:'live'});c.elements=['death'];c.form='field';c.mod='echo';c.last={elements:['water'],form:'bolt',mod:'plain'};c.rebind('earth','KeyP');c.resetJourney();assert.deepEqual(c.elements,[]);assert.equal(c.last,null);assert.equal(c.form,'bolt');assert.equal(c.mod,'plain');assert.equal(c.preferences.mode,'live');assert.equal(c.key('earth'),'P');
});
