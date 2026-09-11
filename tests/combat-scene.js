/* Deterministic visual fixture; not part of the shipped game. */
const sceneRenderer=new WorldRenderer(document.getElementById('world'));
let scene,actors;
function resetScene(){
  const s=Arcana.createState(31719);scene=new Simulation(s);s.enemies=[];
  for(let y=46;y<60;y++)for(let x=43;x<62;x++)s.tiles[y*104+x]='soil';
  s.player.x=2100;s.player.y=2200;
  for(const m of Arcana.MANA)s.player.mana[m.id]=60;
  actors={archer:scene.spawn('archer',1930,2170),brute:scene.spawn('brute',2100,2050),shade:scene.spawn('shade',2290,2170),crawler:scene.spawn('crawler',2250,2300)};
  sceneRenderer.camera={x:2100,y:2140};showResult();
}
function stepScene(seconds){for(let i=0;i<Math.round(seconds/.025);i++)scene.update(.025);showResult();}
function showResult(){document.getElementById('result').textContent=`Изгнанник: страх ${(actors.archer.fear||0).toFixed(1)} с. Голем: ${actors.brute.hp.toFixed(1)} HP, горение ${actors.brute.burn.toFixed(1)}. Нежить: ${actors.shade.hp.toFixed(1)} HP. Корнеед: ${actors.crawler.hp.toFixed(1)} HP, горение ${actors.crawler.burn.toFixed(1)}.`;}
function shoot(element,target){scene.cooldown=0;scene.s.spells[0]={element,form:'bolt',mod:'plain'};scene.cast(target);stepScene(.5);}
document.getElementById('fear').onclick=()=>shoot('shadow',actors.archer);
document.getElementById('fire').onclick=()=>shoot('fire',actors.brute);
document.getElementById('life').onclick=()=>shoot('life',actors.shade);
document.getElementById('hazard').onclick=()=>{const e=actors.crawler;scene.s.tiles[Math.floor(e.y/40)*104+Math.floor(e.x/40)]='fire';stepScene(.1);};
document.getElementById('water').onclick=()=>{const e=actors.crawler;scene.s.tiles[Math.floor(e.y/40)*104+Math.floor(e.x/40)]='water';stepScene(.1);};
document.getElementById('reset').onclick=resetScene;
resetScene();
function drawScene(){sceneRenderer.draw(scene,1/60,false,{shake:false});requestAnimationFrame(drawScene);}
requestAnimationFrame(drawScene);
