const {app,BrowserWindow,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
app.setName('Palimpsest');
const mirrorStudy = process.argv.includes('--mirror-study');
const smoke=process.argv.includes('--smoke-test');
if(smoke)app.setPath('userData',path.join(process.cwd(),'test-results','smoke-profile'));
app.whenReady().then(()=>{
  const win=new BrowserWindow({width:1440,height:900,minWidth:960,minHeight:640,show:!smoke && !mirrorStudy,icon:path.join(__dirname,'assets','icon.png'),backgroundColor:'#08171d',title:'Палимпсест — Живая магия',webPreferences:{...(mirrorStudy ? {partition: 'mirror-study'} : {}),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  Menu.setApplicationMenu(null);
  if(smoke){
    let finished=false;const errors=[];
    const finish=(ok,detail)=>{if(finished)return;finished=true;const report={ok,detail,errors,electron:process.versions.electron,appVersion:app.getVersion(),packaged:app.isPackaged};fs.mkdirSync(path.join(process.cwd(),'test-results'),{recursive:true});fs.writeFileSync(path.join(process.cwd(),'test-results','desktop-smoke.json'),JSON.stringify(report,null,2));app.exit(ok?0:1);};
    win.webContents.on('console-message',(_event,level,message)=>{if(level===3)errors.push(message);if(message==='PALIMPSEST_READY')finish(true,'Renderer initialized successfully in the packaged sandboxed application.');});
    win.webContents.on('did-fail-load',(_event,code,description)=>finish(false,code+': '+description));
    win.webContents.on('render-process-gone',(_event,details)=>finish(false,details.reason));
    setTimeout(()=>finish(false,'Renderer readiness timeout'),15000);
  }
  if (mirrorStudy) {
    require('./mirror-study.cjs').open(win).catch(error => {
      console.error(error);
      app.exit(1);
    });
  } else {
    win.loadFile(path.join(__dirname,'index.html'));
  }
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.on('before-input-event',(e,input)=>{if(input.key==='F11'&&input.type==='keyDown'){win.setFullScreen(!win.isFullScreen());e.preventDefault();}});
});
app.on('window-all-closed',()=>app.quit());
