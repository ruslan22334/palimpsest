const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../core.js');
const C = require('../combat-rules.js');
const Simulation = require('../simulation.js');

function fixture(kind='crawler') {
  const s=A.createState(131),sim=new Simulation(s);
  s.enemies=[];
  const e=sim.spawn(kind,1800,1800);
  for(let y=41;y<50;y++)for(let x=41;x<50;x++)s.tiles[y*A.SIZE+x]='soil';
  s.player.x=1640;s.player.y=1800;
  return {sim,s,e};
}
const cast=(sim,e,element,damage=20)=>sim.hit(e,damage,{element,form:'bolt',mod:'plain'},sim.s.player.x,sim.s.player.y);

test('creature properties cover every spawned archetype',()=>{
  for(const kind of ['crawler','archer','brute','sentinel','wisp','shade','boss']) {
    assert.ok(C.CREATURES[kind]);
    for(const m of A.MANA)assert.ok(C.multiplier({kind},m.id)>=0);
  }
});
test('stone golems resist fire and cannot ignite from direct hits or aura',()=>{
  const {sim,e,s}=fixture('brute');
  cast(sim,e,'fire');assert.equal(e.hp,e.maxHp-5);assert.equal(e.burn,0);
  e.x=s.player.x+30;e.y=s.player.y;sim.burnAura=2;
  sim.update(.05);assert.equal(e.burn,0);assert.ok(e.hp>e.maxHp-6);
});
test('life is not a universal damage spell; undead are specifically vulnerable',()=>{
  const sample=kind=>({kind,hp:100,maxHp:100});
  assert.equal(C.damage(sample('crawler'),20,'life'),1);
  assert.equal(C.damage(sample('sentinel'),20,'life'),0);
  assert.equal(C.damage(sample('shade'),20,'life'),33);
});
test('fire and lava damage grounded enemies outside aggro range',()=>{
  for(const tile of ['fire','lava']){
    const {sim,s,e}=fixture();s.player.x=2200;s.player.y=2200;
    s.tiles[45*A.SIZE+45]=tile;
    const before=e.hp;sim.update(.05);
    assert.ok(e.hp<before);assert.ok(e.burn>0);
    assert.ok(sim.events.some(x=>x.type==='damage'&&x.source==='environment'));
  }
});
test('stone does not burn on fire tiles, and floating spirits avoid ground hazards',()=>{
  for(const kind of ['brute','wisp']){
    const {sim,s,e}=fixture(kind);s.tiles[45*A.SIZE+45]='fire';
    const hp=e.hp;sim.update(.05);assert.equal(e.hp,hp);assert.equal(e.burn,0);
  }
  assert.equal(C.exposure({kind:'wisp',hp:40},'lava',1).damage,0);
});
test('water extinguishes burning creatures and briefly prevents reignition',()=>{
  const {sim,e,s}=fixture();cast(sim,e,'fire',1);assert.ok(e.burn>0);
  cast(sim,e,'water',1);assert.equal(e.burn,0);assert.ok(e.wet>0);
  cast(sim,e,'fire',1);assert.equal(e.burn,0);
  e.burn=2;s.tiles[45*A.SIZE+45]='water';sim.update(.05);assert.equal(e.burn,0);
});
test('shadow causes living enemies to flee and prevents ranged attacks while afraid',()=>{
  const {sim,e}=fixture('archer');e.cool=0;cast(sim,e,'shadow',1);
  assert.ok(e.fear>0);const x=e.x;
  for(let i=0;i<10;i++)sim.update(.05);
  assert.ok(e.x>x);assert.equal(sim.projectiles.filter(p=>p.enemy).length,0);
  assert.ok(sim.floaters.some(f=>f.text==='Страх'));
});
test('fear expires and nonliving enemies resist it',()=>{
  const {sim,e}=fixture();cast(sim,e,'shadow',1);e.fear=.01;
  sim.update(.05);assert.equal(e.fear,0);
  for(const kind of ['brute','wisp','shade','sentinel','boss'])assert.equal(C.fearDuration({kind,maxHp:100},40),0);
});
test('environment kill grants its reward only once',()=>{
  const {sim,e,s}=fixture();e.hp=.01;s.tiles[45*A.SIZE+45]='lava';
  sim.update(.05);sim.update(.05);
  assert.equal(s.stats.kills,1);assert.equal(s.pickups.filter(p=>p.kind==='shard').length,1);
});
test('damage events record actual health loss, excluding shield and overkill',()=>{
  const {sim,e,s}=fixture();e.hp=2;cast(sim,e,'earth',100);
  const event=sim.events.find(x=>x.type==='damage'&&x.target==='enemy');assert.equal(event.amount,2);
  sim.events=[];s.player.shield=20;sim.hurt(10);assert.equal(sim.events.filter(x=>x.type==='damage').length,0);
  sim.invincible=0;sim.hurt(15);assert.equal(sim.events.find(x=>x.type==='damage').amount,5);
});
test('existing saves without new status fields remain playable and retain fear on reload',()=>{
  const {sim,e,s}=fixture('archer');cast(sim,e,'shadow',1);
  const restored=new Simulation(JSON.parse(JSON.stringify(s)));restored.update(.05);
  assert.ok(restored.s.enemies[0].fear>0);assert.ok(A.validSave(restored.s));
  delete e.fear;delete e.wet;const old=new Simulation(JSON.parse(JSON.stringify(s)));old.update(.05);
  assert.ok(Number.isFinite(old.s.enemies[0].x));assert.equal(old.s.enemies[0].fear,0);
});
