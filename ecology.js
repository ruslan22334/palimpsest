(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ManaEcology=factory();})(globalThis,function(){
'use strict';
const TYPES={earth:{counter:'air',name:'Каменный голод'},water:{counter:'fire',name:'Сухой колодец'},fire:{counter:'water',name:'Холодный уголь'},space:{counter:'light',name:'Пустой шов'}};
const SITES=[{x:1620,y:2140,element:'earth'},{x:1420,y:1380,element:'water'},{x:2660,y:1540,element:'fire'},{x:1460,y:2820,element:'space'}];
function valid(v){return !!(v&&typeof v.populated==='boolean'&&Array.isArray(v.anomalies)&&v.anomalies.length<=16&&new Set(v.anomalies.map(a=>a?.id)).size===v.anomalies.length&&v.anomalies.every(a=>a&&Number.isSafeInteger(a.id)&&a.id>0&&Object.hasOwn(TYPES,a.element)&&Number.isFinite(a.x)&&a.x>=60&&a.x<=4100&&Number.isFinite(a.y)&&a.y>=60&&a.y<=4100&&typeof a.neutralized==='boolean'));}
// Channels are transient. Every interruption or reload requires another warning period.
function advance(channel,eligible,dt,available,rate,delay){if(!eligible||available<=0){channel.charge=0;return 0;}const previous=channel.charge||0;channel.charge=Math.min(delay,previous+dt);return Math.min(available,Math.max(0,dt-Math.max(0,delay-previous))*rate);}
return {TYPES,SITES,valid,advance};
});
