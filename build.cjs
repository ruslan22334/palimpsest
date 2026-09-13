const fs=require('node:fs'),path=require('node:path');
(async()=>{
  const {packager}=await import('@electron/packager');
  const shipped=new Set(['assets','docs','node_modules','fortifications.js','daylight.js','controls.js','spellcraft.js','knowledge.js','core.js','combat-rules.js','simulation.js','renderer.js','game.js','index.html','style.css','main.cjs','package.json','README.md','THIRD-PARTY-NOTICES.md']);
  const output=await packager({
    dir:__dirname,out:'dist',name:'Palimpsest',platform:'win32',arch:'x64',
    overwrite:true,asar:false,prune:true,icon:path.join(__dirname,'assets','icon.ico'),
    ignore:file=>{const first=file.replaceAll('\\','/').split('/').filter(Boolean)[0];return Boolean(first&&!shipped.has(first));},
    win32metadata:{CompanyName:'Palimpsest',FileDescription:'Палимпсест — Живая магия',ProductName:'Palimpsest'}
  });
  for(const p of output){
    fs.copyFileSync(path.join(__dirname,'README.md'),path.join(p,'READ-ME.md'));
    console.log('Built: '+p);
  }
})().catch(e=>{console.error(e);process.exit(1);});
