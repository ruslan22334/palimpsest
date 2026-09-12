(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'),require('./combat-rules.js'),require('./knowledge.js'));else root.Simulation=factory(root.Arcana,root.CombatRules,root.Knowledge);})(globalThis,function(A,C,K){
'use strict';
const S=typeof Spellcraft!=='undefined'?Spellcraft:require('./spellcraft.js');
const {SIZE,TILE,MANA,SHRINES,clamp,dist,cost,canPay,pay,terrainReaction,biome,manaRates}=A;
class Simulation{
constructor(state){this.s=state;this.random=A.rng(state.seed+Math.floor(state.time*10));this.events=[];this.particles=[];this.projectiles=[];this.fields=[];this.rings=[];this.delayed=[];this.floaters=[];this.cooldown=0;this.dashCooldown=0;this.invincible=0;this.haste=0;this.burnAura=0;this.shake=0;this.autoSave=0;this.rates={};state.nextEnemyId=Math.max(state.nextEnemyId,1+Math.max(0,...state.enemies.map(e=>e.id)));this.active=true;this.moving=false;this.terrainTimers=state.terrainTimers;this.pulse=0;if(!state.worldPopulated&&!state.won){this.populate();state.worldPopulated=true;}this.reveal();}
emit(type,data={}){this.events.push({type,...data});}
notice(text){this.emit('notice',{text});}
observe(id){const f=K.FACTS[id];if(!f)return;const fresh=!this.s.knowledge.known.includes(f.element);if(K.observe(this.s.knowledge,id)){this.emit('discovery',{element:f.element,fresh,text:f.text});}}
ledger(e){const key=e.kind==='boss'?'boss':'enemy:'+e.id;return this.s.eventLedger[key]||(this.s.eventLedger[key]={out:0,incoming:0,dead:false});}
eligible(e){return e&&Number.isSafeInteger(e.id)&&e.id>0&&e.guard!==99&&!e.summoned&&!e.friendly;}
gainMana(element,amount,observation){if(!(amount>0))return;const p=this.s.player,gain=Math.max(0,Math.min(p.cap-p.mana[element],amount));p.mana[element]+=gain;this.s.stats.collected+=gain;this.observe(observation);if(gain>0)this.emit('mana',{element,amount:gain});}
observeSources(){const p=this.s.player,tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE),near=new Set();for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)near.add(this.s.tiles[(ty+y)*SIZE+tx+x]);for(const e of K.BASIC)if(this.rates[e]>0)this.observe('source:'+e);
for(const [element,tile] of [['fire','fire'],['fire','lava'],['life','tree'],['light','crystal'],['shadow','rift'],['space','rift'],['space','obsidian']])if(this.rates[element]>0&&near.has(tile))this.observe('source:'+element+':'+tile);
if(this.tile(p.x,p.y)==='ruin')this.observe('source:shadow:ruin');if(this.s.shrines.some(s=>s.status==='restored'&&Math.hypot(p.x-(s.x+.5)*TILE,p.y-(s.y+.5)*TILE)<160))this.observe('source:light:shrine');
}
get level(){return this.s.shrines.filter(s=>s.status==='restored').length;}
has(id){return this.s.relics.includes(id);}
tile(x,y){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);return tx<0||ty<0||tx>=SIZE||ty>=SIZE?'wall':this.s.tiles[ty*SIZE+tx];}
blocked(x,y,r=11){return [[-r,-r],[r,-r],[-r,r],[r,r]].some(([dx,dy])=>this.tile(x+dx,y+dy)==='wall');}
move(e,dx,dy,r=11){if(!this.blocked(e.x+dx,e.y,r))e.x+=dx;if(!this.blocked(e.x,e.y+dy,r))e.y+=dy;e.x=clamp(e.x,TILE+15,(SIZE-1)*TILE-15);e.y=clamp(e.y,TILE+15,(SIZE-1)*TILE-15);}
spawn(kind,x,y,guard=-1){const defs={wisp:[34,76,7],crawler:[52,59,11],archer:[42,48,8],brute:[115,42,17],shade:[65,89,12],sentinel:[95,53,13]};const [hp,speed,damage]=defs[kind]||defs.wisp;let e={id:this.s.nextEnemyId++,kind,x,y,hp,maxHp:hp,speed,damage,cool:1+this.random(),slow:0,burn:0,stun:0,guard,homeX:x,homeY:y,phase:this.random()*6.28};if(this.s.difficulty==='gentle'){e.hp*=.8;e.maxHp=e.hp;e.damage*=.65;}if(this.s.difficulty==='hard'){e.hp*=1.25;e.maxHp=e.hp;e.damage*=1.3;}this.s.enemies.push(e);return e;}
populate(){for(let i=0;i<95;i++){const x=(5+this.random()*94)*TILE,y=(5+this.random()*94)*TILE;if(Math.hypot(x-52.5*TILE,y-53.5*TILE)<420||this.blocked(x,y)||this.tile(x,y)==='lava'||SHRINES.some(s=>Math.hypot(x-(s.x+.5)*TILE,y-(s.y+.5)*TILE)<230))continue;const b=biome(x/TILE,y/TILE);this.spawn(['crawler','wisp','brute','sentinel','shade'][b],x,y);}}
burstParticles(x,y,color,n=15,force=80){for(let i=0;i<n;i++){const a=this.random()*6.28,v=(.25+this.random())*force;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+this.random()*.55,max:1,color,size:1+this.random()*3});}if(this.particles.length>650)this.particles.splice(0,this.particles.length-650);}
ring(x,y,r,color){this.rings.push({x,y,r,life:.5,max:.5,color});}
float(x,y,text,color='#ece8d8'){this.floaters.push({x,y,text,color,life:1.1});}
reveal(){const p=this.s.player,tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);for(let dy=-9;dy<=9;dy++)for(let dx=-9;dx<=9;dx++){const x=tx+dx,y=ty+dy;if(x>=0&&y>=0&&x<SIZE&&y<SIZE&&dx*dx+dy*dy<90)this.s.discovered[y*SIZE+x]=1;}}
cast(target,free=false,override=null){const s=this.s,p=s.player,program=S.compile(override||s.spells[s.selected]);if(!program||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;const spell=program.spell;if(!free&&this.cooldown>0)return false;const c=program.cost;if(!free&&!pay(p.mana,c)){this.cooldown=.25;this.notice('Не хватает маны: '+Object.entries(c).filter(([k,v])=>p.mana[k]<v).map(([k,v])=>K.view(this.s.knowledge,MANA.find(m=>m.id===k)).name+' '+Math.ceil(v-p.mana[k])).join(', '));this.emit('sound',{name:'dry'});return false;}
if(!free){this.cooldown=program.cooldown;s.stats.casts++;this.emit('sound',{name:'cast',element:spell.element});}
const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1,range=spell.mod==='reach'?1.65:1,power=(spell.mod==='power'?1.65:1)*(this.has('lens')?1.2:1),color=this.spellColor(spell);
if(spell.form==='self')this.executeSelf(spell,target,power,range);
else if(spell.form==='bolt'){this.projectiles.push({x:p.x,y:p.y,vx:dx/d*440,vy:dy/d*440,life:Math.max(.06,Math.min(d/440,.85*range)),r:7,spell:{...spell},power,color,enemy:false,trail:0});}
else if(spell.form==='burst'){this.area(p.x,p.y,125*range,spell,27*power);this.ring(p.x,p.y,125*range,color);this.burstParticles(p.x,p.y,color,35,170);}
else{const reach=Math.min(d,260*range),x=p.x+dx/d*reach,y=p.y+dy/d*reach;this.fields.push({x,y,r:84*range,life:4,tick:0,spell:{...spell},power,color});this.ring(x,y,84*range,color);}
if(!free&&spell.mod==='echo')this.delayed.push({time:.35,target:{...target},spell:{...spell,mod:'plain'}});
return true;}
spellColor(spell){const nodes=S.compile(spell)?.nodes;return nodes?.length===1&&nodes[0].kind==='reaction'?S.REACTIONS[nodes[0].id].color:MANA.find(m=>m.id===S.sequence(spell)[0]).color;}
executeSelf(spell,target,power,range){for(const node of S.compile(spell).nodes){if(node.kind==='aspect')this.selfEffect({element:node.element,form:'self',mod:spell.mod},target,power*node.weight,range);else this.reactionSelf(node,spell,power,range);}}
selfEffect(spell,target,power,range){const p=this.s.player,before={hp:p.hp,shield:p.shield,x:p.x,y:p.y};switch(spell.element){case'blood':p.hp=Math.min(p.maxHp,p.hp+24*power);this.float(p.x,p.y-25,'+'+Math.round(p.hp-before.hp),'#ed8295');break;case'death':p.shield=Math.min(100,p.shield+24*power);this.area(p.x,p.y,110*range,spell,14*power);break;case'life':p.hp=Math.min(p.maxHp,p.hp+30*power);this.float(p.x,p.y-25,'+'+Math.round(30*power),'#9bd68b');break;case'earth':p.shield=Math.min(100,p.shield+38*power);break;case'water':p.shield=Math.min(100,p.shield+20*power);this.area(p.x,p.y,95*range,spell,10*power);break;case'fire':this.burnAura=Math.max(this.burnAura,5*power);this.area(p.x,p.y,85,spell,18*power);break;case'air':this.haste=Math.max(this.haste,6*power);this.area(p.x,p.y,90*range,spell,12*power);break;case'light':p.hp=Math.min(p.maxHp,p.hp+15*power);this.invincible=Math.max(this.invincible,1.6*power);break;case'shadow':this.area(p.x,p.y,150*range,spell,22*power);break;case'space':{let dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1,length=Math.min(d,240*range);const ox=p.x,oy=p.y;for(let n=length;n>20;n-=8){const x=clamp(ox+dx/d*n,60,(SIZE-1)*TILE-20),y=clamp(oy+dy/d*n,60,(SIZE-1)*TILE-20);if(!this.blocked(x,y)){p.x=x;p.y=y;this.invincible=Math.max(this.invincible,.4);this.burstParticles(ox,oy,'#90e4cf',22);break;}}break;}}
if(p.hp>before.hp||p.shield>before.shield||p.x!==before.x||p.y!==before.y||['fire','air','light'].includes(spell.element))this.observe('self:'+spell.element);const color=MANA.find(m=>m.id===spell.element).color;this.ring(p.x,p.y,55,color);this.burstParticles(p.x,p.y,color,20);}
setTerrain(index,next){
const old=this.s.tiles[index];if(old===next)return false;
this.s.tiles[index]=next;delete this.terrainTimers[index];delete this.s.terrainCredit[index];
const expiry={fire:[25,'soil'],steam:[8,'water'],ice:[6,'water'],mud:[10,'soil']}[next];
if(expiry)this.terrainTimers[index]={terrain:next,left:expiry[0],after:expiry[1]};
if(next==='fire')this.s.terrainCredit[index]=true;this.s.stats.transforms++;this.emit('terrain',{index});return true;
}
transform(x,y,r,input){const nodes=typeof input==='string'?[{kind:'aspect',element:input,weight:1}]:S.compile(input)?.nodes;if(!nodes)return;
for(const node of nodes)this.transformNode(x,y,r,node);
}
transformNode(x,y,r,node){const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE),n=Math.ceil(r/TILE);let changed=false;
for(let dy=-n;dy<=n;dy++)for(let dx=-n;dx<=n;dx++){const xx=tx+dx,yy=ty+dy;if(xx<1||yy<1||xx>=SIZE-1||yy>=SIZE-1||Math.hypot((xx+.5)*TILE-x,(yy+.5)*TILE-y)>r+15)continue;
const index=yy*SIZE+xx,old=this.s.tiles[index];let next=old;
if(node.kind==='aspect')next=terrainReaction(old,node.element);
else switch(node.id){
case 'steam':if(['soil','grass','sand','water','fire','ice','mud'].includes(old))next='steam';break;
case 'quench':next=terrainReaction(old,'water');if(old==='ice')next='water';break;
case 'frost':if(old==='water'||old==='steam')next='ice';if(old==='fire')next='soil';break;
case 'mire':if(['soil','grass','sand','water'].includes(old))next='mud';break;
case 'bark':next=terrainReaction(old,'life');break;
}
if(this.setTerrain(index,next)){changed=true;const color=node.kind==='reaction'?S.REACTIONS[node.id].color:MANA.find(m=>m.id===node.element).color;this.burstParticles((xx+.5)*TILE,(yy+.5)*TILE,color,3,35);if(node.kind==='aspect')this.observe('terrain:'+node.element+':'+old+':'+next);}
}
if(node.id==='eclipse'){const count=this.projectiles.length;this.projectiles=this.projectiles.filter(b=>!b.enemy||Math.hypot(b.x-x,b.y-y)>r+35);changed=changed||this.projectiles.length<count;}
if(changed&&node.kind==='reaction'){this.observe('reaction:'+node.id);this.ring(x,y,r,S.REACTIONS[node.id].color);}
}
area(x,y,r,spell,damage){this.transform(x,y,r*.7,spell);for(const e of [...this.s.enemies])if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<r)this.hit(e,damage,spell,x,y);const b=this.s.boss;if(b&&b.hp>0&&Math.hypot(b.x-x,b.y-y)<r+25)this.hit(b,damage,spell,x,y);}
reactionSelf(node,spell,power,range){const p=this.s.player,pw=power*node.weight,before={hp:p.hp,shield:p.shield},values={steam:[8,100,12],quench:[14,95,10],frost:[18,95,8],mire:[20,110,6],bark:[30,95,8],eclipse:[0,150,10]}[node.id];
p.shield=Math.min(100,p.shield+values[0]*pw);if(node.id==='bark')p.hp=Math.min(p.maxHp,p.hp+8*pw);if(node.id==='eclipse')this.invincible=Math.max(this.invincible,.7*pw);
this.transformNode(p.x,p.y,values[1]*range*.7,node);for(const e of [...this.s.enemies,...(this.s.boss?[this.s.boss]:[])])if(e.hp>0&&dist(e,p)<values[1]*range)this.reactionHit(e,node,values[2]*power*node.weight,spell,p.x,p.y);
if(p.hp>before.hp||p.shield>before.shield||node.id==='eclipse')this.observe('reaction:'+node.id);this.ring(p.x,p.y,values[1]*range,S.REACTIONS[node.id].color);
}
reactionHit(e,node,damage,spell,ox,oy){if(e.hp<=0)return;const body=C.profile(e),id=node.id,weight=node.weight;let n=0;
const mixes={steam:[['water',.65],['fire',.35]],quench:[['water',.75],['fire',.25]],frost:[['water',.52],['air',.13]],mire:[['earth',.4],['water',.1]],bark:[['earth',.525],['life',.175]],eclipse:[['light',.25],['shadow',.25]]};
const factor=id==='quench'?(body.body==='stone'?1.7:e.burn>0?1.35:1):1;
for(const [element,part] of mixes[id])if(e.hp>0)n+=this.damageEnemy(e,damage*part*factor,element,spell);
if(e.hp>0){
if(['steam','quench','frost'].includes(id)){e.burn=0;e.playerBurn=false;e.wet=Math.max(e.wet||0,2*weight);e.slow=Math.max(e.slow||0,Math.min(5,(id==='frost'?3:1.5)*weight));}
if(id==='frost')e.stun=Math.max(e.stun||0,e.kind==='boss'?.08:Math.min(1,.35*weight));
if((id==='mire'||id==='bark')&&body.grounded)e.root=Math.max(e.root||0,Math.min(3,1.5*weight));
if(id==='eclipse'){const duration=C.fearDuration(e,damage);if(duration){e.fear=Math.max(e.fear||0,duration);e.fearX=ox;e.fearY=oy;}else e.stun=Math.max(e.stun||0,e.kind==='boss'?.08:.3*weight);}
}
this.observe('reaction:'+id);this.float(e.x,e.y-20,Math.round(n)+' · '+S.REACTIONS[id].name,S.REACTIONS[id].color);this.ring(e.x,e.y,24,S.REACTIONS[id].color);e.flash=.12;
}
damageEnemy(e,amount,element,spell={element,mod:'plain'},source='spell'){
const n=C.damage(e,amount,element);if(n<=0)return 0;e.hp-=n;
this.emit('damage',{target:'enemy',targetId:e.id,element,amount:n,source});
const credited=source==='spell'||source==='aura'||source==='burn'&&e.playerBurn||source==='environment'&&this.s.terrainCredit[Math.floor(e.y/TILE)*SIZE+Math.floor(e.x/TILE)];
if(credited)e.playerTouched=true;
if(credited&&this.eligible(e)&&C.profile(e).body==='living'&&dist(e,this.s.player)<=600){const ledger=this.ledger(e),earned=Math.min(n,Math.max(0,e.maxHp-ledger.out));ledger.out+=earned;this.gainMana('blood',earned*.2,'source:blood:dealt');}
if(e.hp<=0)this.kill(e,spell);return n;
}
hit(e,damage,spell,ox,oy){if(e.hp<=0)return;const program=S.compile(spell);if(!program)return;const rewardElement=program.spell.elements.find(e=>!['blood','death'].includes(e));
const local={...program.spell,mod:spell.mod==='chain'?'plain':spell.mod,siphonElement:rewardElement};
for(const node of program.nodes){if(e.hp<=0)break;if(node.kind==='aspect')this.hitAspect(e,damage*node.weight,{...local,element:node.element,elements:undefined},ox,oy,node.weight);else this.reactionHit(e,node,damage*node.weight,local,ox,oy);}
if(spell.mod==='chain'){const targets=this.s.enemies.filter(t=>t.id!==e.id&&t.hp>0&&dist(t,e)<160).slice(0,2);for(const t of targets){this.hit(t,damage*.6,{...program.spell,mod:'plain'},e.x,e.y);this.ring(t.x,t.y,24,'#f0d995');}}
}
hitAspect(e,damage,spell,ox,oy,strength=1){if(e.hp<=0)return;const element=spell.element,n=this.damageEnemy(e,damage,element,spell),traits=C.profile(e);
const factor=C.multiplier(e,element);this.observe('hit:'+element+':'+traits.body+':'+(factor===0?'immune':factor<.75?'resist':factor>1.1?'strong':'normal'));
if(element==='water'){e.slow=Math.max(e.slow||0,3*strength);e.wet=Math.max(e.wet||0,3*strength);e.burn=0;e.playerBurn=false;this.observe('status:water');}
if(element==='fire'&&traits.burns&&!(e.wet>0)){e.burn=Math.max(e.burn||0,3.2*strength);e.playerBurn=true;this.observe('status:fire');}
if(element==='earth'){e.stun=Math.max(e.stun||0,.2*strength);this.observe('status:earth');}
if(element==='death'&&e.hp>0&&n>0){e.slow=Math.max(e.slow||0,2.5*strength);this.observe('status:death');}
if(element==='blood'&&n>0){const p=this.s.player,heal=Math.min(p.maxHp-p.hp,n*.15);if(heal>0){p.hp+=heal;this.float(p.x,p.y-26,'+'+Math.round(heal),'#ed8295');this.observe('status:blood');}}
if(element==='shadow'&&e.hp>0){const duration=C.fearDuration(e,damage);if(duration>0){this.observe('status:shadow');if(!(e.fear>0))this.float(e.x,e.y-40,'Страх','#ba9cdb');e.fear=Math.max(e.fear||0,duration);e.fearX=ox;e.fearY=oy;}}
const d=Math.hypot(e.x-ox,e.y-oy)||1;const oldX=e.x,oldY=e.y;if(element==='air'&&e.kind!=='boss')this.move(e,(e.x-ox)/d*70*strength,(e.y-oy)/d*70*strength);if(element==='space'&&e.kind!=='boss')this.move(e,(ox-e.x)/d*48*strength,(oy-e.y)/d*48*strength);if((element==='air'||element==='space')&&(e.x!==oldX||e.y!==oldY))this.observe('status:'+element);
this.float(e.x,e.y-18,n===0?'Невосприимчив':C.multiplier(e,element)<.4?'Сопротивление · '+Math.max(1,Math.round(n)):''+Math.round(n),MANA.find(m=>m.id===element).color);this.burstParticles(e.x,e.y,MANA.find(m=>m.id===element).color,6);e.flash=.12;

}
updateAfflictions(e,dt){
const traits=C.profile(e),contact=C.exposure(e,this.tile(e.x,e.y),dt);
e.wet=Math.max(0,(e.wet||0)-dt);e.root=Math.max(0,(e.root||0)-dt);if(traits.grounded&&['mud','ice'].includes(this.tile(e.x,e.y)))e.slow=Math.max(e.slow||0,.5);
if(contact.extinguish){e.burn=0;e.playerBurn=false;e.wet=.5;}
if(!traits.burns)e.burn=0;
if(contact.ignite&&!(e.wet>0)){e.burn=Math.max(e.burn||0,1.2);if(this.s.terrainCredit[Math.floor(e.y/TILE)*SIZE+Math.floor(e.x/TILE)])e.playerBurn=true;}
if(contact.rawDamage>0)this.damageEnemy(e,contact.rawDamage,'fire',undefined,'environment');
if(e.hp<=0)return;
if(e.burn>0){const seconds=Math.min(dt,e.burn);e.burn=Math.max(0,e.burn-dt);this.damageEnemy(e,5*seconds,'fire',undefined,'burn');}
e.fear=Math.max(0,(e.fear||0)-dt);
}
flee(e,dt){
const a=Math.atan2(e.y-e.fearY,e.x-e.fearX),speed=e.speed*(e.slow>0?.4:1)*(e.stun>0||e.root>0?0:1);
const oldX=e.x,oldY=e.y;this.move(e,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt);
if(Math.hypot(e.x-oldX,e.y-oldY)<.1){for(const turn of [1.3,-1.3,Math.PI]){this.move(e,Math.cos(a+turn)*speed*dt,Math.sin(a+turn)*speed*dt);if(Math.hypot(e.x-oldX,e.y-oldY)>.1)break;}}
}
kill(e,spell={element:'fire',mod:'plain'}){if(e.dead)return;e.dead=true;if(this.eligible(e)){const ledger=this.ledger(e);if(!ledger.dead&&e.playerTouched&&dist(e,this.s.player)<=600)this.gainMana('death',e.kind==='boss'?20:e.kind==='brute'||e.kind==='sentinel'?6:4,'source:death:kill');ledger.dead=true;}this.s.stats.kills++;this.shake=2;this.emit('sound',{name:'kill'});this.burstParticles(e.x,e.y,'#edc98e',22,110);if(e.kind==='boss'){this.s.won=true;this.s.boss=null;this.s.enemies=this.s.enemies.filter(x=>x.guard!==99);this.projectiles=[];this.emit('victory');this.emit('save');return;}
this.s.pickups.push({x:e.x,y:e.y,kind:'shard',amount:e.kind==='brute'?4:2});if(this.random()<.22)this.s.pickups.push({x:e.x+12,y:e.y,kind:'health',amount:12});const reward=spell.siphonElement||spell.element;if(spell.mod==='siphon'&&!['blood','death'].includes(reward))this.s.player.mana[reward]=Math.min(this.s.player.cap,this.s.player.mana[reward]+7);
}
hurt(amount,attacker=null){if(this.invincible>0||this.s.won||!Number.isFinite(amount)||amount<=0)return;const p=this.s.player;const blocked=Math.min(p.shield,amount),actual=Math.min(p.hp,amount-blocked);p.shield-=blocked;p.hp-=actual;if(actual>0){this.emit('damage',{target:'player',amount:actual,source:attacker?'incoming':'environment'});if(this.eligible(attacker)){const ledger=this.ledger(attacker),earned=Math.min(actual,Math.max(0,attacker.maxHp-ledger.incoming));ledger.incoming+=earned;this.gainMana('blood',earned*.25,'source:blood:received');}}this.invincible=.55;this.shake=6;this.emit('sound',{name:'hurt'});this.float(p.x,p.y-20,actual>0?'−'+Math.ceil(actual):'Щит','#f2a09c');if(p.hp<=0)this.die();}
die(){const s=this.s,p=s.player;s.stats.deaths++;const loss=Math.floor(s.shards*.2);s.shards-=loss;p.hp=p.maxHp;p.shield=0;p.x=s.checkpoint.x;p.y=s.checkpoint.y;for(const id of K.BASIC)p.mana[id]=Math.max(12,p.mana[id]);s.enemies=s.enemies.filter(e=>!e.dead&&e.hp>0);for(const e of s.enemies){e.x=e.homeX;e.y=e.homeY;e.hp=e.maxHp;e.burn=0;e.playerBurn=false;e.wet=0;e.fear=0;e.root=0;e.slow=0;e.stun=0;}this.projectiles=[];this.fields=[];this.delayed=[];this.invincible=4;if(s.boss){s.boss=null;s.enemies=s.enemies.filter(e=>e.guard!==99);}this.emit('death',{loss});this.emit('save');}
dash(dx,dy){if(this.dashCooldown>0)return false;const price=this.has('stride')?3:7;if(this.s.player.mana.air<price){this.notice('Для рывка нужно '+price+' маны воздуха. Наберите её движением.');return false;}this.s.player.mana.air-=price;const d=Math.hypot(dx,dy)||1;for(let i=0;i<15;i++){this.move(this.s.player,dx/d*10,dy/d*10);if(i%3===0)this.burstParticles(this.s.player.x,this.s.player.y,'#d3e9da',3,15);}this.invincible=.45;this.dashCooldown=1.1;this.emit('sound',{name:'dash'});return true;}
nearby(){const p=this.s.player;for(let i=0;i<this.s.shrines.length;i++){const s=this.s.shrines[i];if(Math.hypot(p.x-(s.x+.5)*TILE,p.y-(s.y+.5)*TILE)<96)return {kind:'shrine',index:i,shrine:s};}if(Math.hypot(p.x-52.5*TILE,p.y-53.5*TILE)<100)return {kind:'camp'};if(Math.hypot(p.x-53.5*TILE,p.y-47.5*TILE)<110)return {kind:'gate'};return null;}
interact(){const n=this.nearby();if(!n){this.notice('Подойдите к печати, обсерватории или центральному разлому.');return;}if(n.kind==='camp'){this.s.checkpoint={x:52.5*TILE,y:53.5*TILE};this.s.player.hp=this.s.player.maxHp;this.emit('camp');this.emit('save');return;}if(n.kind==='gate'){if(this.level<5){this.notice('Разлом удерживают пять печатей. Восстановлено: '+this.level+'/5.');return;}if(!this.s.boss&&!this.s.won)this.emit('finalReady');else if(this.s.won)this.emit('victory');return;}
const s=n.shrine;if(s.status==='restored'){this.s.checkpoint={x:(s.x+.5)*TILE,y:(s.y+2)*TILE};this.s.player.hp=this.s.player.maxHp;this.notice('Печать помнит вас. Здоровье восстановлено, точка возврата сохранена.');this.emit('save');return;}if(s.status==='active'){this.notice('Сначала победите стражей печати. Осталось: '+this.s.enemies.filter(e=>e.guard===n.index&&e.hp>0).length);return;}if(s.status==='cleared'){s.status='restored';this.s.shards+=12;this.s.player.hp=this.s.player.maxHp;this.s.checkpoint={x:(s.x+.5)*TILE,y:(s.y+2)*TILE};this.ring((s.x+.5)*TILE,(s.y+.5)*TILE,210,'#eac78a');this.emit('restored',{index:n.index});this.emit('save');return;}
const c={[s.element]:25,[s.second]:15};if(!canPay(this.s.player.mana,c)){this.notice('Для пробуждения: '+K.view(this.s.knowledge,MANA.find(m=>m.id===s.element)).name+' 25 + '+K.view(this.s.knowledge,MANA.find(m=>m.id===s.second)).name+' 15.');return;}pay(this.s.player.mana,c);s.status='active';const count=3+this.level;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;let x=(s.x+.5)*TILE+Math.cos(a)*125,y=(s.y+.5)*TILE+Math.sin(a)*125;if(this.blocked(x,y)){x=(s.x+.5)*TILE;y=(s.y+2.5)*TILE;}this.spawn(i%3===0?'brute':['crawler','wisp','archer','sentinel','shade'][n.index],x,y,n.index);}this.notice('Печать пробуждена. Одолейте её стражей.');this.emit('sound',{name:'shrine'});this.emit('save');}
chooseRelic(id){if(!A.RELICS.some(r=>r.id===id)||this.s.relics.includes(id)||this.s.relics.length>=this.level)return false;this.s.relics.push(id);if(id==='reservoir')this.s.player.cap+=20;if(id==='heart'){this.s.player.maxHp+=30;this.s.player.hp=this.s.player.maxHp;}this.emit('save');return true;}
research(){const price=8+this.s.research*8;if(this.s.research>=3||this.s.shards<price)return false;this.s.shards-=price;this.s.research++;this.emit('sound',{name:'shrine'});this.emit('save');return true;}
startBoss(){const x=53.5*TILE,y=47.5*TILE;this.s.boss={kind:'boss',id:99999,x,y,hp:this.s.difficulty==='gentle'?750:this.s.difficulty==='hard'?1600:1150,maxHp:this.s.difficulty==='gentle'?750:this.s.difficulty==='hard'?1600:1150,cool:2,phase:0,ward:'fire',burn:0,slow:0,stun:0};this.notice('Переписчик пробуждён. Его защита меняется — меняйте стихии.');this.ring(x,y,260,'#ba9cdb');this.emit('sound',{name:'boss'});}
enemyShot(e,angle,speed=155){this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:4,r:e.kind==='boss'?8:6,enemy:true,attacker:{id:e.id,kind:e.kind,maxHp:e.maxHp,guard:e.guard,friendly:!!e.friendly,summoned:!!e.summoned},damage:e.kind==='boss'?15:e.damage,color:e.kind==='boss'?'#d3a0dc':'#f5a084'});}
update(dt,input={x:0,y:0}){if(!this.active)return;dt=Math.min(dt,.05);const s=this.s,p=s.player;s.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.invincible=Math.max(0,this.invincible-dt);this.haste=Math.max(0,this.haste-dt);this.burnAura=Math.max(0,this.burnAura-dt);this.shake=Math.max(0,this.shake-dt*16);this.autoSave+=dt;this.pulse+=dt;
let dx=input.x||0,dy=input.y||0,d=Math.hypot(dx,dy);const oldx=p.x,oldy=p.y;if(d){let speed=155*(this.has('stride')?1.12:1)*(this.haste>0?1.6:1);if(this.tile(p.x,p.y)==='water')speed*=.58;if(this.tile(p.x,p.y)==='tree')speed*=.8;if(this.tile(p.x,p.y)==='mud')speed*=.65;this.move(p,dx/d*speed*dt,dy/d*speed*dt);}this.moving=Math.hypot(oldx-p.x,oldy-p.y)>.1;
this.rates=manaRates(s.tiles,p,this.moving,s.shrines.filter(s=>s.status==='restored'));for(const m of MANA){const amount=this.rates[m.id]*dt*(this.has('roots')?1.35:1);const gain=Math.min(p.cap-p.mana[m.id],amount);p.mana[m.id]+=gain;s.stats.collected+=gain;}this.observeSources();
if(['lava','fire'].includes(this.tile(p.x,p.y)))this.hurt(this.tile(p.x,p.y)==='lava'?8:4);
for(const [idx,timer]of Object.entries(this.terrainTimers)){timer.left-=dt;if(s.tiles[idx]!==timer.terrain){delete this.terrainTimers[idx];continue;}if(timer.left<=0){s.tiles[idx]=timer.after;delete this.terrainTimers[idx];delete s.terrainCredit[idx];this.emit('terrain',{index:Number(idx)});}}
for(let i=this.delayed.length-1;i>=0;i--){const d=this.delayed[i];d.time-=dt;if(d.time<=0){this.delayed.splice(i,1);this.cast(d.target,true,d.spell);}}
for(const b of [...this.projectiles].reverse()){if(!this.projectiles.includes(b))continue;b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;let remove=b.life<=0;if(this.tile(b.x,b.y)==='wall')remove=true;
if(b.enemy){if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+12){this.hurt(b.damage,b.attacker);remove=true;}}
else{b.trail=(b.trail||0)+dt;if(b.trail>.025){b.trail=0;this.burstParticles(b.x,b.y,b.color,1,8);}const targets=s.boss?[...s.enemies,s.boss]:s.enemies;for(const e of targets){if(e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<(e.kind==='boss'?35:e.kind==='brute'?22:16)+b.r){this.hit(e,24*b.power,b.spell,p.x,p.y);remove=true;break;}}if(remove){this.transform(b.x,b.y,35,b.spell);this.ring(b.x,b.y,25,b.color);}}
if(remove){const index=this.projectiles.indexOf(b);if(index>=0)this.projectiles.splice(index,1);}}
for(let i=this.fields.length-1;i>=0;i--){const f=this.fields[i];f.life-=dt;f.tick-=dt;if(f.tick<=0){f.tick=.65;this.area(f.x,f.y,f.r,f.spell,10*f.power);this.burstParticles(f.x+(this.random()-.5)*f.r,f.y+(this.random()-.5)*f.r,f.color,3,20);}if(f.life<=0)this.fields.splice(i,1);}
for(const e of s.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,(e.flash||0)-dt);this.updateAfflictions(e,dt);if(e.hp<=0)continue;e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);if(e.fear>0){this.flee(e,dt);continue;}if(e.stun>0)continue;const distance=dist(e,p),aggro=e.guard>=0?600:350;if(distance>aggro){if(!(e.root>0)&&Math.hypot(e.x-e.homeX,e.y-e.homeY)>20){const angle=Math.atan2(e.homeY-e.y,e.homeX-e.x);this.move(e,Math.cos(angle)*e.speed*.4*dt,Math.sin(angle)*e.speed*.4*dt);}continue;}e.cool-=dt;const a=Math.atan2(p.y-e.y,p.x-e.x);let speed=e.speed*(e.slow>0?.4:1);if(e.stun>0||e.root>0)speed=0;
if(e.kind==='archer'||e.kind==='wisp'||e.kind==='sentinel'){if(distance>190)this.move(e,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt);else if(distance<110)this.move(e,-Math.cos(a)*speed*dt,-Math.sin(a)*speed*dt);if(e.cool<=0){this.enemyShot(e,a,e.kind==='sentinel'?190:140);if(e.kind==='sentinel'){this.enemyShot(e,a+.2,170);this.enemyShot(e,a-.2,170);}e.cool=e.kind==='wisp'?2.2:1.7;}}
else{if(distance>24){const ox=e.x,oy=e.y;this.move(e,Math.cos(a)*speed*dt,Math.sin(a)*speed*dt,e.kind==='brute'?16:11);if(Math.hypot(e.x-ox,e.y-oy)<.1)this.move(e,Math.cos(a+1.2)*speed*dt,Math.sin(a+1.2)*speed*dt);}if(distance<34&&e.cool<=0){this.hurt(e.damage,e);e.cool=1.1;}}
if(this.burnAura>0&&distance<92){this.damageEnemy(e,14*dt,'fire',undefined,'aura');if(C.profile(e).burns&&!(e.wet>0)){e.burn=.3;e.playerBurn=true;}}}
s.enemies=s.enemies.filter(e=>e.hp>0);
for(let i=0;i<s.shrines.length;i++){const shrine=s.shrines[i];if(shrine.status==='active'&&!s.enemies.some(e=>e.guard===i)){shrine.status='cleared';this.notice('Стражи повержены. Вернитесь к печати и нажмите E.');this.emit('save');}}
const boss=s.boss;if(boss&&boss.hp>0){boss.flash=Math.max(0,(boss.flash||0)-dt);boss.cool-=dt;boss.phase+=dt;boss.ward=['fire','shadow','earth'][Math.floor(boss.phase/10)%3];const a=Math.atan2(p.y-boss.y,p.x-boss.x);if(dist(boss,p)>145)this.move(boss,Math.cos(a)*30*dt,Math.sin(a)*30*dt,22);this.updateAfflictions(boss,dt);if(this.burnAura>0&&dist(boss,p)<92)this.damageEnemy(boss,14*dt,'fire',undefined,'aura');if(boss.cool<=0&&s.boss){const phase=boss.hp/boss.maxHp;const count=phase<.35?14:phase<.7?10:7;for(let i=0;i<count;i++)this.enemyShot(boss,a+i/count*Math.PI*2,phase<.35?170:135);if(phase<.7)this.enemyShot(boss,a,245);boss.cool=phase<.35?1.4:2.1;this.ring(boss.x,boss.y,70,'#ba9cdb');if(s.enemies.filter(e=>e.guard===99).length<3&&this.random()<.4)this.spawn('shade',boss.x+65,boss.y,99);}if(dist(boss,p)<42)this.hurt(18,boss);}
for(let i=s.pickups.length-1;i>=0;i--){const item=s.pickups[i],d=dist(item,p);if(d<135){const a=Math.atan2(p.y-item.y,p.x-item.x);item.x+=Math.cos(a)*210*dt;item.y+=Math.sin(a)*210*dt;}if(d<22){if(item.kind==='shard'){s.shards+=item.amount;this.emit('sound',{name:'pickup'});}else p.hp=Math.min(p.maxHp,p.hp+item.amount);this.float(p.x,p.y-20,'+'+item.amount,item.kind==='shard'?'#eac78a':'#9bd68b');s.pickups.splice(i,1);}}
for(let i=this.particles.length-1;i>=0;i--){const q=this.particles[i];q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=1-dt*2;q.vy*=1-dt*2;if(q.life<=0)this.particles.splice(i,1);}
for(let i=this.rings.length-1;i>=0;i--){this.rings[i].life-=dt;if(this.rings[i].life<=0)this.rings.splice(i,1);}for(let i=this.floaters.length-1;i>=0;i--){this.floaters[i].life-=dt;this.floaters[i].y-=23*dt;if(this.floaters[i].life<=0)this.floaters.splice(i,1);}
if(this.pulse>.25){this.pulse=0;this.reveal();this.tutorial();}if(this.autoSave>12){this.autoSave=0;this.emit('save');}
}
tutorial(){const s=this.s;if(s.tutorial===0&&s.stats.collected>12){s.tutorial=1;this.notice('Мана откликается на окружение. Теперь испытайте снаряд: ЛКМ.');}if(s.tutorial===1&&s.stats.casts>=3){s.tutorial=2;this.notice('Tab открывает конструктор. Соберите собственное заклинание.');}if(s.tutorial===3&&s.stats.transforms>=3){s.tutorial=4;this.notice('Вы изменили мир. Ищите «Корни памяти» к западу от лагеря.');}if(this.level>0)s.tutorial=5;}
}
return Simulation;
});
