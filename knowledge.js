(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./spellcraft.js'));
  else root.Knowledge = factory(root.Spellcraft);
})(globalThis, function(S) {
  'use strict';
  const BASIC = ['earth', 'water', 'air'];
  const FACTS = {};
  const LEGACY_SOURCES=['source:light:crystal','source:light:shrine','source:shadow:ruin','source:shadow:rift'];
  function fact(id, element, kind, text) { FACTS[id] = { element, kind, text }; }
  const sources = {
    'light:sun': ['light', 'Прямой солнечный свет наполняет сосуд днём. Под отбрасываемой тенью и ночью сбор прекращается; у полудня свет сильнее.'],
    'shadow:cast': ['shadow', 'Днём тень деревьев и скал наполняет теневой сосуд. По мере движения солнца тени меняют направление и длину.'],
    'shadow:night-rift': ['shadow', 'Ночью разломы отдают теневую ману. Обычная темнота сосуд не наполняет.'],
    'earth': ['earth', 'Неподвижность на почве, песке или камне наполняет сосуд земли.'],
    'water': ['water', 'Вода собирается в воде и у берега.'],
    'air': ['air', 'Движение наполняет сосуд воздуха.'],
    'fire:fire': ['fire', 'Сосуд откликается на близкое пламя.'],
    'fire:lava': ['fire', 'Жар лавы даёт огненную ману даже с берега.'],
    'life:tree': ['life', 'Рядом с деревьями накапливается мана жизни.'],
    'light:crystal': ['light', 'Золотые кристаллы наполняют сосуд света.'],
    'light:shrine': ['light', 'Восстановленная печать излучает световую ману.'],
    'shadow:ruin': ['shadow', 'На плитах руин накапливается тень.'],
    'shadow:rift': ['shadow', 'Близость разлома даёт теневую ману.'],
    'space:rift': ['space', 'Разлом наполняет сосуд пространства.'],
    'space:obsidian': ['space', 'Обсидиан отдаёт пространственную ману.'],
    'blood:dealt': ['blood', 'Ранения живых противников дают кровь: 1 мана за 5 здоровья.'],
    'blood:received': ['blood', 'Раны от противников дают кровь: 1 мана за 4 здоровья. Щит и ожоги среды её не дают.'],
    'death:kill': ['death', 'Побеждённый противник рядом оставляет ману смерти. Призванные существа её не оставляют.']
  };
  for (const [id, [element, text]] of Object.entries(sources)) fact('source:' + id, element, 'source', text);
  const self = {
    earth: 'Воплощение земли создаёт каменный щит.', water: 'Воплощение воды защищает щитом и замедляет врагов рядом.',
    fire: 'Воплощение огня окружает мага обжигающим венцом.', air: 'Воплощение воздуха ускоряет мага и отбрасывает врагов.',
    life: 'Воплощение жизни восстанавливает здоровье.', light: 'Воплощение света лечит и на короткое время защищает от урона.',
    shadow: 'Воплощение тени накрывает противников вокруг мага.', space: 'Воплощение пространства переносит мага к курсору сквозь препятствия.',
    blood: 'Воплощение крови восстанавливает до 24 здоровья за 10 маны.', death: 'Воплощение смерти окружает мага щитом и сдерживает врагов вокруг.'
  };
  for (const [element, text] of Object.entries(self)) fact('self:' + element, element, 'effect', text);
  const reactions = [
    ['earth','water','soil','Земля поднимает сушу из воды.'], ['earth','steam','soil','Земля рассеивает пар, оставляя сушу.'],
    ['earth','wall','stone','Земля крушит скалы.'], ['earth','lava','stone','Земля обращает лаву в камень.'],
    ['water','lava','obsidian','Вода охлаждает лаву в обсидиан.'], ['water','fire','water','Вода тушит пламя.'],
    ['water','soil','water','Вода затопляет почву.'], ['water','sand','water','Вода затопляет песок.'],
    ['fire','tree','fire','Огонь поджигает деревья.'], ['fire','grass','fire','Огонь поджигает траву.'], ['fire','water','steam','Огонь испаряет воду.'],
    ['air','fire','soil','Воздух развеивает пламя.'], ['life','soil','tree','Жизнь выращивает рощу на почве.'],
    ['life','grass','tree','Жизнь выращивает рощу на лугу.'], ['life','sand','tree','Жизнь выращивает рощу на песке.'],
    ['light','rift','crystal','Свет обращает разлом в кристалл.'], ['shadow','crystal','rift','Тень обращает кристалл в разлом.'],
    ['shadow','wall','rift','Тень разрушает скалу, оставляя разлом.']
  ];
  for (const [e, from, to, text] of reactions) fact(`terrain:${e}:${from}:${to}`, e, 'effect', text);
  for (const [e, text] of Object.entries({water:'Вода замедляет врага и гасит горение.',fire:'Огонь поджигает восприимчивых врагов.',earth:'Земля ненадолго оглушает врага.',shadow:'Тень заставляет живого врага бежать.',air:'Воздух отбрасывает врага.',space:'Пространство притягивает врага.',blood:'Попадание крови в живую цель лечит мага на 15% фактического урона.',death:'Смерть на время замедляет врага.'})) fact('status:'+e,e,'effect',text);
  const bodies = {living:'живого существа',stone:'каменного существа',construct:'механизма',spirit:'духа',undead:'нежити',arcane:'Переписчика'};
  for (const e of ['earth','water','fire','air','life','light','shadow','space','blood','death']) for (const [body,label] of Object.entries(bodies)) {
    for (const [result,text] of Object.entries({immune:'не причинило вреда',resist:'вызвало сопротивление',strong:'оказалось особенно сильным',normal:'нанесло обычный урон'}))
      fact(`hit:${e}:${body}:${result}`,e,'effect',`Заклинание против ${label} ${text}.`);
  }
  for(const [id,r] of Object.entries(S.REACTIONS)){fact('reaction:'+id,r.pair[0],'reaction',r.text);FACTS['reaction:'+id].elements=r.pair;}
  for(const [e,from,to,text] of [['fire','ice','water','Огонь растапливает лёд.'],['earth','ice','soil','Земля заменяет лёд сушей.'],['earth','mud','soil','Земля осушает топь.'],['water','mud','water','Вода затопляет топь.'],['life','mud','tree','Жизнь выращивает рощу из топи.']])fact('terrain:'+e+':'+from+':'+to,e,'effect',text);
  function initial() { return { known:[...BASIC], facts:BASIC.map(e=>'source:'+e) }; }
  function valid(k, ids) { return !!(k && Array.isArray(k.known) && Array.isArray(k.facts) && k.known.every(e=>ids.includes(e)) && new Set(k.known).size===k.known.length && BASIC.every(e=>k.known.includes(e)) && k.facts.every(id=>FACTS[id] && (FACTS[id].elements||[FACTS[id].element]).every(e=>k.known.includes(e))) && new Set(k.facts).size===k.facts.length); }
  function observe(k, id) { const f=FACTS[id]; if(!f||k.facts.includes(id))return false; for(const e of f.elements||[f.element])if(!k.known.includes(e))k.known.push(e); k.facts.push(id); return true; }
  function entries(k, element, kind) { return k.facts.filter(id=>!LEGACY_SOURCES.includes(id)).map(id=>FACTS[id]).filter(f=>f.element===element&&(!kind||f.kind===kind)); }
  function view(k, mana) { const known=k.known.includes(mana.id); return {...mana, known, name:known?mana.name:'Неизвестно', color:known?mana.color:'#81918f', glyph:known?mana.glyph:'?', source:entries(k,mana.id,'source').map(f=>f.text).join(' ')||'Источник ещё не установлен. Наблюдайте за сосудом в разных условиях.'}; }
  return { LEGACY_SOURCES, BASIC, FACTS, initial, valid, observe, entries, view };
});
