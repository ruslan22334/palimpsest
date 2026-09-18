(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CombatRules = factory();
})(globalThis, function() {
  'use strict';

  // Creature properties, rather than the renderer or AI, define reactions.
  // Multipliers are deliberately explicit for future shared player/enemy casting.
  const CREATURES = {
    player: {name:'Маг',body:'living',element:'life',burns:true,grounded:true,fear:0,resist:{life:0.05}},
    mage: {name:'Вражеский маг',body:'living',element:'life',burns:true,grounded:true,fear:.8,resist:{life:0.05}},
    leech: { name: 'Манная пиявка', body: 'living', element: 'water', burns: true, grounded: true, fear: 1.2, resist: {life: 0.05, water: 0.4, fire: 1.4} },
    crawler: { name: 'Корнеед', body: 'living', element: 'life', burns: true, grounded: true, fear: 1,
      resist: { life: 0.05, fire: 1.25, shadow: 0.8 } },
    archer: { name: 'Изгнанник', body: 'living', element: 'air', burns: true, grounded: true, fear: 0.75,
      resist: { life: 0.05, shadow: 0.8 } },
    brute: { name: 'Каменный голем', body: 'stone', element: 'earth', burns: false, grounded: true, fear: 0,
      resist: { earth: 0.7, fire: 0.25, life: 0.05, air: 1.2 } },
    sentinel: { name: 'Световой механизм', body: 'construct', element: 'light', burns: false, grounded: true, fear: 0,
      resist: { light: 0.35, fire: 0.35, life: 0, shadow: 1.4 } },
    wisp: { name: 'Блуждающий дух', body: 'spirit', element: 'space', burns: false, grounded: false, fear: 0,
      resist: { life: 0.1, earth: 0.6, light: 1.6 } },
    shade: { name: 'Опустошённый', body: 'undead', element: 'shadow', burns: true, grounded: true, fear: 0,
      resist: { life: 1.65, light: 1.6, shadow: 0.2 } },
    boss: { name: 'Переписчик', body: 'arcane', element: 'space', burns: false, grounded: false, fear: 0,
      resist: { life: 0.1 } }
  };
  const fallback = { name: 'Неизвестное существо', body: 'spirit', element: 'space', burns: false, grounded: false, fear: 0, resist: {} };
  const profile = creature => CREATURES[typeof creature === 'string' ? creature : (creature.kind||'player')] || fallback;

  function multiplier(creature, element) {
    const body=profile(creature).body;
    let factor = element==='blood' ? (body==='living'?1.1:0) : element==='death' ? ({living:1.2,stone:0.15,construct:0.1,spirit:1.25,undead:0.3,arcane:0.8}[body]??1) : profile(creature).resist[element] ?? 1;
    if (creature.kind === 'boss') {
      if (creature.ward === element) factor *= 0.25;
      else if ({ fire: 'water', shadow: 'light', earth: 'air' }[creature.ward] === element) factor *= 1.5;
    }
    return factor;
  }

  function damage(creature, raw, element) {
    if (!Number.isFinite(raw) || raw <= 0 || creature.hp <= 0) return 0;
    return Math.min(creature.hp, raw * multiplier(creature, element));
  }

  function fearDuration(creature, rawDamage) {
    const susceptibility = profile(creature).fear;
    return susceptibility ? Math.min(6, 2 + rawDamage / Math.max(1, creature.maxHp) * 8) * susceptibility : 0;
  }

  function exposure(creature, terrain, dt) {
    const p = profile(creature);
    if (!p.grounded) return { rawDamage: 0, damage: 0, ignite: false, extinguish: false };
    const extinguish = terrain === 'water';
    const heat = terrain === 'lava' ? 18 : terrain === 'fire' && p.burns ? 8 : 0;
    return { rawDamage: heat * dt, damage: damage(creature, heat * dt, 'fire'), ignite: heat > 0 && p.burns, extinguish };
  }

  return { CREATURES, profile, multiplier, damage, fearDuration, exposure };
});
