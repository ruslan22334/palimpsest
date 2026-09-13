(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.Daylight=factory();})(globalThis,function(){
'use strict';
const CYCLE=480,TILE=40,SIZE=104,HEIGHT={tree:48,wall:40},RADIUS={tree:19,wall:21};
function sky(time=0){
 const elapsed=Number.isFinite(time)&&time>=0?time:0,total=8+elapsed*24/CYCLE,hour=total%24,daylight=hour>=6&&hour<18;
 const progress=(hour-6)/12,elevation=daylight?Math.sin(progress*Math.PI):0;
 const dx=daylight?-Math.cos(progress*Math.PI):0,dy=daylight?.6*Math.sin(progress*Math.PI):0,length=Math.hypot(dx,dy)||1;
 const phase=hour<6?'Ночь':hour<8?'Рассвет':hour<16?'День':hour<18?'Закат':'Ночь';
 const until=(daylight?18-hour:hour<6?6-hour:30-hour)*CYCLE/24;
 return {day:Math.floor(total/24)+1,hour,clock:String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor((hour%1)*60)).padStart(2,'0'),daylight,phase,until,
  intensity:daylight?.35+.65*elevation:0,dx:dx/length,dy:dy/length,stretch:.65+1.6*(1-elevation),darkness:.32-.27*Math.max(0,elevation)};
}
function shadow(type,tx,ty,sun){if(!sun.daylight||!HEIGHT[type])return null;const x=tx*TILE+20,y=ty*TILE+27,len=HEIGHT[type]*sun.stretch;return {x,y,ex:x+sun.dx*len,ey:y+sun.dy*len,r:RADIUS[type],type,tx,ty};}
function contains(p,s){const dx=s.ex-s.x,dy=s.ey-s.y,length=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((p.x-s.x)*dx+(p.y-s.y)*dy)/(length||1)));return (p.x-s.x-t*dx)**2+(p.y-s.y-t*dy)**2<=s.r*s.r;}
function exposure(tiles,p,time=0){const sun=sky(time);if(!sun.daylight)return {sun,shaded:false,source:null};const tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);
 // Maximum projected length plus radius is under four tiles. Clip both axes to avoid row wrapping.
 for(let y=Math.max(0,ty-4);y<=Math.min(SIZE-1,ty+4);y++)for(let x=Math.max(0,tx-4);x<=Math.min(SIZE-1,tx+4);x++){const s=shadow(tiles[y*SIZE+x],x,y,sun);if(s&&contains(p,s))return {sun,shaded:true,source:s};}
 return {sun,shaded:false,source:null};
}
return {CYCLE,sky,shadow,contains,exposure};
});
