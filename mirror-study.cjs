'use strict';
const path = require('node:path');
const A = require('./core');

function createTrial() {
  const state = A.createState();
  state.time = 142; // Afternoon, with time to experiment before dusk.
  state.tutorial = 5;
  state.research = 3;
  for (const key of ['chapter','archive','forge']) state[key].stage = 'legacy';
  for (const shrine of state.shrines.slice(0,3)) shrine.status = 'restored';
  state.relics = ['roots','stride','lens'];
  state.worldPopulated = state.ecology.populated = state.magesPopulated = true;
  state.player.x = state.checkpoint.x = A.mirror.SERA.x;
  state.player.y = state.checkpoint.y = A.mirror.SERA.y;
  const elements = ['light','fire','shadow','life'];
  state.spells = elements.map(element => A.normalizeSpell({element,form:'bolt',mod:'plain'}));
  for (const element of [...elements,'water']) state.player.mana[element] = 60;
  state.knowledge.known.push(...elements);
  return state;
}

async function open(win) {
  // The launcher owns an in-memory Electron session. Refuse a persistent one.
  if (win.webContents.session.isPersistent()) throw Error('Playtest requires a temporary session');
  const page = path.join(__dirname,'index.html');
  await win.loadFile(page);
  const snapshot = JSON.stringify(JSON.stringify(createTrial()));
  await win.webContents.executeJavaScript("localStorage.setItem('palimpsest.save.v1'," + snapshot + ")");
  await win.loadFile(page);
  win.show();
}
module.exports = {createTrial,open};
