const fs=require('node:fs'),zlib=require('node:zlib');
const n=256,raw=Buffer.alloc(n*(n*4+1));
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
 const xx=x-127.5,yy=y-127.5,r=Math.hypot(xx,yy),edge=Math.max(Math.abs(xx),Math.abs(yy)),glow=Math.max(0,1-r/160);let rgb=[8+glow*12,27+glow*22,33+glow*22];
 const ring=Math.abs(r-88)<2||Math.abs(r-100)<1;
 const diamond=Math.abs(Math.abs(xx)*1.25+Math.abs(yy)-63)<3;
 const inner=Math.abs(xx)*1.25+Math.abs(yy)<37;
 const ticks=(Math.abs(xx)<1.5&&Math.abs(yy)>82&&Math.abs(yy)<111)||(Math.abs(yy)<1.5&&Math.abs(xx)>82&&Math.abs(xx)<111);
 if(ring||diamond||ticks)rgb=[218,199,145];if(inner)rgb=[145+glow*35,214+glow*18,192+glow*16];if(Math.abs(xx)<1&&Math.abs(yy)<62)rgb=[240,225,179];
 const p=y*(n*4+1)+1+x*4;for(let i=0;i<3;i++)raw[p+i]=Math.round(rgb[i]);raw[p+3]=edge>126?0:255;
}
function crc(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);t.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([t,data])),8+data.length);return b;}
const ih=Buffer.alloc(13);ih.writeUInt32BE(n,0);ih.writeUInt32BE(n,4);ih[8]=8;ih[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);
fs.mkdirSync('assets',{recursive:true});fs.writeFileSync('assets/icon.png',png);fs.writeFileSync('assets/icon.ico',Buffer.concat([ico,png]));
