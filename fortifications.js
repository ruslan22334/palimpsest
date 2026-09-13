(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Fortifications=factory();})(globalThis,function(){
'use strict';
const SIZE=104,TILE=40,LIMIT=64,MATERIALS={earth:{hp:80,name:'Земляная стена',color:'#998568'},brick:{hp:120,name:'Обожжённая стена',color:'#b47756'},mud:{hp:50,name:'Размокшая стена',color:'#77866b'}};
const solid=t=>t==='wall'||t==='barrier';
function valid(walls,tiles){return !!(walls&&typeof walls==='object'&&!Array.isArray(walls)&&Object.keys(walls).length<=LIMIT&&Object.entries(walls).every(([key,w])=>/^\d+$/.test(key)&&String(+key)===key&&+key%SIZE>0&&+key%SIZE<SIZE-1&&Math.floor(+key/SIZE)>0&&Math.floor(+key/SIZE)<SIZE-1&&tiles[+key]==='barrier'&&w&&MATERIALS[w.material]&&w.maxHp===MATERIALS[w.material].hp&&Number.isFinite(w.hp)&&w.hp>0&&w.hp<=w.maxHp)&&tiles.every((t,i)=>t!=='barrier'||Object.hasOwn(walls,i)));}
function flood(tiles,start,extra=new Set()){const seen=new Set(),q=[start];if(solid(tiles[start])||extra.has(start))return seen;seen.add(start);for(let i=0;i<q.length;i++){const id=q[i],x=id%SIZE,y=Math.floor(id/SIZE);for(const n of [x>1?id-1:-1,x<SIZE-2?id+1:-1,y>1?id-SIZE:-1,y<SIZE-2?id+SIZE:-1])if(n>=0&&!seen.has(n)&&!extra.has(n)&&!solid(tiles[n])){seen.add(n);q.push(n);}}return seen;}
function plan(s,center,origin=s.player){
 const tx=Math.floor(center.x/TILE),ty=Math.floor(center.y/TILE),vertical=Math.abs(center.x-origin.x)>=Math.abs(center.y-origin.y),candidates=[-1,0,1].map(d=>({x:tx+(vertical?0:d),y:ty+(vertical?d:0)})).filter(p=>p.x>0&&p.y>0&&p.x<SIZE-1&&p.y<SIZE-1).map(p=>p.y*SIZE+p.x);
 const landmarks=[...s.shrines.map(p=>({x:(p.x+.5)*TILE,y:(p.y+.5)*TILE})),{x:2100,y:2140},{x:2140,y:1900},s.checkpoint];
 const actors=[s.player,...s.enemies.filter(e=>e.hp>0),...(s.boss?[s.boss]:[])];
 const cells=candidates.filter(i=>['soil','grass','sand','stone','mud'].includes(s.tiles[i])&&!landmarks.some(p=>Math.hypot(p.x-(i%SIZE+.5)*TILE,p.y-(Math.floor(i/SIZE)+.5)*TILE)<105)&&!actors.some(p=>Math.abs(p.x-(i%SIZE+.5)*TILE)<45&&Math.abs(p.y-(Math.floor(i/SIZE)+.5)*TILE)<45)&&!s.enemies.some(e=>Math.abs(e.homeX-(i%SIZE+.5)*TILE)<40&&Math.abs(e.homeY-(Math.floor(i/SIZE)+.5)*TILE)<40));
 let reason='';if(!cells.length)reason='Здесь нет свободной земли для стены.';else if(Object.keys(s.walls).length+cells.length>LIMIT)reason='Слишком много стен. Разберите старые.';
 if(!reason){const start=Math.floor(s.player.y/TILE)*SIZE+Math.floor(s.player.x/TILE),before=flood(s.tiles,start),after=flood(s.tiles,start,new Set(cells));const anchors=[...landmarks,...actors.slice(1)];if(anchors.some(p=>{const i=Math.floor(p.y/TILE)*SIZE+Math.floor(p.x/TILE);return before.has(i)&&!after.has(i);}))reason='Стена перекроет единственный проход.';}
 return {cells:reason?[]:cells,candidates,reason};
}
function strike(w,node){let material=w.material,damage=0;const id=node.kind==='reaction'?node.id:node.element;
 if(id==='fire'||id==='steam')material='brick';else if(id==='water'||id==='mire')material='mud';
 else damage=({earth:22,air:14,space:18,shadow:26,quench:w.material==='brick'?45:28,frost:12,eclipse:20})[id]||0;
 if(material!==w.material){const ratio=w.hp/w.maxHp;w.material=material;w.maxHp=MATERIALS[material].hp;w.hp=ratio*w.maxHp;}
 damage*=node.weight||1;if(w.material==='mud'&&id==='air')damage*=2;if(w.material==='brick'&&['earth','air','space'].includes(id))damage*=.65;
 const actual=Math.min(w.hp,damage);w.hp-=actual;return {damage:actual,material};
}
return {LIMIT,MATERIALS,solid,valid,plan,strike};
});
