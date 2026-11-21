'use strict';
// Deterministic full-world campaign exercise. Use the same movement, mana,
// enemy AI, spell execution, local interactions and save loader as the game.
const assert = require('node:assert/strict');
const A = require('../core');
const Simulation = require('../simulation');
const { chapter, archives, forge, mirror, seam } = A;
const seed = Number(process.argv[2] || 31719);
const difficulty = process.argv[3] || 'normal';
const route = process.argv[4] || 'ordered';
assert.ok(Number.isSafeInteger(seed), 'expected an integer seed');
assert.ok(
  ['normal', 'hard', 'gentle'].includes(difficulty),
  'unknown difficulty',
);
assert.ok(
  ['ordered', '--day-route', '--night-route'].includes(route),
  'unknown route',
);
let sim = new Simulation(A.createState(seed, difficulty));
let state = sim.s;
let player = state.player;
const marks = [];
const point = (x, y) => ({ x, y });
const center = (i) =>
  point(((i % A.SIZE) + 0.5) * 40, (Math.floor(i / A.SIZE) + 0.5) * 40);
const cell = (p) => Math.floor(p.y / 40) * A.SIZE + Math.floor(p.x / 40);
const safe = (i) =>
  i >= 0 &&
  i < state.tiles.length &&
  !['wall', 'barrier', 'fire', 'lava'].includes(state.tiles[i]);
const recipe = (element, form = 'bolt') => ({ element, form, mod: 'plain' });

function useAdvancedSpells() {
  return (
    sim.level >= 4 ||
    state.seam.stage === 'cross' ||
    (difficulty === 'hard' && sim.level >= 2)
  );
}
function defend() {
  if (sim.cooldown > 0) return;
  if (player.shield < 10 && player.mana.earth >= 18) {
    sim.cast(player, false, recipe('earth', 'self'));
    return;
  }
  const target = state.enemies
    .filter((e) => e.hp > 0 && A.dist(e, player) < 200)
    .sort((a, b) => A.dist(a, player) - A.dist(b, player))[0];
  if (!target) return;
  if (useAdvancedSpells()) {
    if (player.hp < player.maxHp * 0.75 && player.mana.life >= 10) {
      sim.cast(player, false, recipe('life', 'self'));
      return;
    }
    const attack = ['light', 'fire', 'air', 'earth', 'water'].sort(
      (a, b) => player.mana[b] - player.mana[a],
    )[0];
    if (player.mana[attack] >= 6) sim.cast(target, false, recipe(attack));
    return;
  }
  const id = ['air', 'earth', 'water'].find((id) => player.mana[id] >= 36);
  if (id) sim.cast(target, false, recipe(id));
}
function tick(input, guard = true) {
  assert.ok(state.time < 1800, 'campaign exceeded thirty simulated minutes');
  if (guard) defend();
  sim.update(0.05, input);
  sim.events.length = 0;
  assert.equal(
    state.stats.deaths,
    0,
    'route lost at ' + JSON.stringify(marks.at(-1)),
  );
}
function wait(seconds, guard = true) {
  for (let i = 0; i < Math.ceil(seconds * 20); i++) tick(undefined, guard);
}
function approach(dest) {
  for (let i = 0; i < 250; i++) {
    if (A.dist(player, dest) < 5) return;
    tick(point(dest.x - player.x, dest.y - player.y));
  }
  throw Error(
    'Blocked on approach ' +
      JSON.stringify({ dest, player: point(player.x, player.y) }),
  );
}
function walk(dest) {
  const start = cell(player),
    end = cell(dest),
    parent = new Map([[start, null]]),
    queue = [start];
  for (let i = 0; i < queue.length && !parent.has(end); i++) {
    const here = queue[i];
    for (const next of [here - 1, here + 1, here - A.SIZE, here + A.SIZE]) {
      if (safe(next) && !parent.has(next)) {
        queue.push(next);
        parent.set(next, here);
      }
    }
  }
  assert.ok(parent.has(end), 'unreachable destination ' + JSON.stringify(dest));
  const path = [];
  for (let n = end; n !== start; n = parent.get(n)) path.push(center(n));
  for (const p of path.reverse()) approach(p);
  approach(dest);
}
function visit(p) {
  walk(p);
  sim.interact();
}
function talk(chapterModule, person, action) {
  visit(person);
  assert.ok(
    sim.events.some((e) => /Dialogue$/.test(e.type)),
    'no local dialogue for ' + action,
  );
  assert.ok(chapterModule.choose(sim, action), action);
}
function cast(target, element, form = 'bolt') {
  while (sim.cooldown > 0) tick(undefined, false);
  assert.ok(state.knowledge.known.includes(element), 'undiscovered ' + element);
  assert.ok(
    sim.cast(target, false, recipe(element, form)),
    'cannot cast ' + element,
  );
  wait(0.7, false);
}
function stock(dest, id, amount) {
  const material = { water: 'water', life: 'tree' }[id];
  for (let attempt = 0; attempt < 4; attempt++) {
    if (material && state.tiles[cell(dest)] !== material) {
      let nearest = null;
      for (let i = 0; i < state.tiles.length; i++) {
        if (state.tiles[i] !== material) continue;
        const p = center(i);
        if (!nearest || A.dist(p, dest) < A.dist(nearest, dest)) nearest = p;
      }
      assert.ok(nearest);
      dest = nearest;
    }
    walk(dest);
    for (let i = 0; i < 2000 && player.mana[id] < amount; i++) {
      if (material && state.tiles[cell(dest)] !== material) break;
      const returnToSource = useAdvancedSpells() && A.dist(player, dest) > 6;
      tick(
        returnToSource
          ? point(dest.x - player.x, dest.y - player.y)
          : undefined,
        useAdvancedSpells(),
      );
    }
    if (player.mana[id] >= amount) return;
  }
  throw Error('source exhausted: ' + id + ' at ' + JSON.stringify(dest));
}
function restore(index, relic) {
  const sh = state.shrines[index];
  visit(point((sh.x + 0.5) * 40, (sh.y + 0.5) * 40));
  if (index === 0 && sh.status === 'dormant') {
    stock(center(sh.y * A.SIZE + sh.x), 'earth', 32);
    sim.interact();
  }
  assert.equal(
    sh.status,
    'restored',
    sh.name + ' ' + JSON.stringify(player.mana),
  );
  assert.ok(sim.chooseRelic(relic));
  const loaded = A.migrateSave(JSON.parse(JSON.stringify(state)));
  assert.ok(loaded, 'invalid save after ' + sh.name);
  sim = new Simulation(loaded);
  state = sim.s;
  player = state.player;
  marks.push({
    seal: sh.name,
    seconds: Math.round(state.time),
    casts: state.stats.casts,
    shards: state.shards,
  });
  console.log(JSON.stringify(marks.at(-1)));
}
stock(point(2100, 2140), 'earth', 60);
stock(point(2260, 2060), 'water', 60);
talk(chapter, chapter.IVA, 'accept');
for (const clue of chapter.CLUES) visit(clue);
talk(chapter, chapter.START, 'escort');
walk(point(1300, 2060));
cast(player, 'air', 'burst');
wait(5);
talk(chapter, chapter.IVA, 'spring');
restore(0, 'roots');
talk(archives, archives.NERA, 'archive-accept');
visit(archives.RECORDS[0]);
function terrainShot(i, element) {
  const p = center(i);
  if (element === 'earth' && player.mana.earth < 12)
    stock(archives.NERA, 'earth', 45);
  walk(point(p.x - 80, p.y));
  cast(p, element);
}
for (const i of [archives.INLET, ...archives.BASIN]) terrainShot(i, 'earth');
visit(archives.RECORDS[1]);
for (const i of archives.CHANNEL) terrainShot(i, 'water');
terrainShot(archives.DESK, 'earth');
wait(3.1);
visit(archives.RECORDS[2]);
for (
  let attempt = 0;
  state.archive.stage === 'recover' && attempt < 4;
  attempt++
) {
  for (const i of archives.CHANNEL)
    if (state.tiles[i] !== 'water') terrainShot(i, 'water');
  terrainShot(archives.DESK, 'earth');
  wait(3.2);
  visit(archives.RECORDS[2]);
}
talk(archives, archives.NERA, 'archive-rewrite');
stock(center(29 * 104 + 29), 'water', 60);
restore(1, 'lens');
function runForge() {
  talk(forge, forge.ORIN, 'forge-accept');
  stock(center(29 * 104 + 74), 'water', 60);
  stock(center(22 * 104 + 69), 'fire', 45);
  for (let wave = 1; wave <= 3; wave++) {
    stock(forge.ORIN, 'earth', 60);
    while (state.forge.core.hp < 220) {
      stock(forge.ORIN, 'earth', 12);
      assert.ok(forge.choose(sim, 'forge-repair'));
    }
    for (let i = 0; i < 1000 && player.mana.air < 59; i++) {
      const a = i * 0.05;
      tick(
        point(
          forge.ORIN.x + 80 * Math.cos(a) - player.x,
          forge.ORIN.y + 80 * Math.sin(a) - player.y,
        ),
      );
    }
    talk(forge, forge.ORIN, wave === 1 ? 'forge-start' : 'forge-next');
    for (let i = 0; i < 4000 && state.forge.stage === 'active'; i++) {
      const target = state.enemies
        .filter((e) => e.guard === 98 && e.hp > 0)
        .sort((a, b) => A.dist(a, forge.CENTER) - A.dist(b, forge.CENTER))[0];
      const id = ['air', 'earth', 'fire', 'water'].find(
        (id) => player.mana[id] >= 6,
      );
      if (target && id && sim.cooldown === 0)
        sim.cast(target, false, recipe(id));
      const a = i * 0.045;
      tick(
        point(
          forge.CENTER.x + 130 * Math.cos(a) - player.x,
          forge.CENTER.y + 130 * Math.sin(a) - player.y,
        ),
        false,
      );
    }
    assert.equal(state.forge.stage, wave === 3 ? 'restore' : 'intermission');
  }
  stock(center(22 * 104 + 69), 'fire', 40);
  stock(forge.ORIN, 'earth', 55);
  restore(2, 'reservoir');
}
function runMirror() {
  talk(mirror, mirror.SERA, 'mirror-accept');
  stock(center(81 * 104 + 80), 'water', 60);
  stock(center(mirror.COURT[0]), 'life', 60);
  const [sun, shade] = mirror.PLATES;
  walk(point(sun.x - 80, sun.y));
  cast(sun, 'light');
  cast(center(mirror.BEDS[0]), 'fire');
  walk(point(shade.x + 80, shade.y));
  cast(center(mirror.BEDS[1]), 'life');
  if (player.mana.shadow < 35) {
    stock(center(mirror.BEDS[1]), 'shadow', 35);
  }
  cast(shade, 'shadow');
  if (route === '--day-route') cast(point(shade.x - 40, shade.y), 'life');
  const preparedAt = state.time;
  if (route === '--night-route') {
    runSeam();
    walk(point(shade.x + 80, shade.y));
  }
  for (let i = 0; i < 10600 && state.mirror.stage === 'tune'; i++) tick();
  console.log(
    'Mirror prepared at %d, records visible at %d',
    Math.round(preparedAt),
    Math.round(state.time),
  );
  assert.equal(state.mirror.stage, 'choice');
  talk(mirror, mirror.SERA, 'mirror-shelter');
  restore(3, 'heart');
}
if (route === '--day-route') {
  stock(center(22 * 104 + 69), 'fire', 35);
  runMirror();
  runForge();
} else {
  runForge();
  runMirror();
}
if (state.seam.stage !== 'done') runSeam();
function runSeam() {
  talk(seam, seam.TAM, 'seam-accept');
  for (const [i, l] of seam.LINKS.entries()) {
    if (i === 1) {
      walk(point(l.to.x, l.to.y + 80));
      cast(l.to, 'water');
    }
    if (i === 0) stock(l.from, 'space', 75);
    else walk(l.from);
    if (i === 2)
      while (!seam.window(state).open || seam.window(state).left < 2)
        tick(undefined, false);
    cast(l.to, 'space', 'self');
    assert.equal(state.seam.crossed, i + 1);
  }
  talk(seam, seam.TAM, 'seam-border');
  restore(4, 'stride');
}
visit(point(2100, 2140));
while (state.research < 3 && sim.research()) {}
stock(point(2100, 2140), 'earth', 80);
stock(point(2260, 2060), 'water', 80);
stock(center(51 * 104 + 47), 'life', 80);
const gate = point(2140, 1900);
visit(gate);
assert.ok(sim.events.some((e) => e.type === 'finalReady'));
sim.startBoss();
for (let i = 0; i < 6000 && !state.won; i++) {
  const boss = state.boss;
  if (sim.cooldown === 0) {
    if (player.hp < player.maxHp * 0.65 && player.mana.life >= 10)
      sim.cast(player, false, recipe('life', 'self'));
    else if (player.shield < 10 && player.mana.earth >= 10)
      sim.cast(player, false, recipe('earth', 'self'));
    else {
      const id = [
        'water',
        'air',
        'light',
        'shadow',
        'fire',
        'space',
        'earth',
      ].sort((a, b) => player.mana[b] - player.mana[a])[0];
      if (player.mana[id] >= 6) sim.cast(boss, false, recipe(id));
    }
  }
  const a = i * 0.05 * 0.85;
  tick(
    point(
      gate.x + 210 * Math.cos(a) - player.x,
      gate.y + 210 * Math.sin(a) - player.y,
    ),
    false,
  );
}
assert.ok(state.won, 'boss still standing');
assert.ok(A.validSave(state));
console.log(
  JSON.stringify({
    seed,
    difficulty,
    route,
    seconds: Math.round(state.time),
    ...state.stats,
    research: state.research,
  }),
);
