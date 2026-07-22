function createGem(x, y, value) {
  return {
    x, y,
    radius: 5 + Math.min(6, value / 3),
    value,
    magnetized: false,
    dead: false,
  };
}

function updateGems(state, dt) {
  const player = state.player;
  const pickupRadius = getPlayerPickupRadius(player);
  const pullSpeed = 400;

  for (const g of state.gems) {
    if (g.dead) continue;

    const dx = player.x - g.x, dy = player.y - g.y;
    const dist2 = dx * dx + dy * dy;

    if (!g.magnetized && dist2 <= pickupRadius * pickupRadius) {
      g.magnetized = true;
    }

    if (g.magnetized) {
      const dir = normalize(dx, dy);
      g.x += dir.x * pullSpeed * dt;
      g.y += dir.y * pullSpeed * dt;

      if (circleHit(player.x, player.y, player.radius, g.x, g.y, g.radius)) {
        g.dead = true;
        addXp(state, g.value);
      }
    }
  }
}

function addXp(state, amount) {
  const player = state.player;
  player.xp += amount;

  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = xpToNextLevel(player.level);
    state.pendingLevelUps += 1;
  }
}

function getPassiveDef(id) {
  return PASSIVE_DEFS.find(p => p.id === id);
}

// Not: kalıcı mağaza yükseltmeleri (Meta.bonus) run içi pasiflerin ÜSTÜNE
// eklenir, böylece her run mağazada aldığın kalıcı güçle başlar.
function getPlayerMaxHp(player) {
  return PLAYER_BASE.maxHp + player.passives.maxHp * getPassiveDef('maxHp').step + Meta.bonus('hp') + Characters.mod('hp');
}

function getPlayerSpeed(player) {
  return PLAYER_BASE.speed * (1 + player.passives.speed * getPassiveDef('speed').step + Meta.bonus('speed') + Characters.mod('speed'));
}

function getPlayerPickupRadius(player) {
  return PLAYER_BASE.pickupRadius * (1 + player.passives.pickup * getPassiveDef('pickup').step);
}

function getPlayerDamageMult(player) {
  return 1 + player.passives.damage * getPassiveDef('damage').step + Meta.bonus('damage') + Characters.mod('damage');
}

function getPlayerRegen(player) {
  return player.passives.regen * getPassiveDef('regen').step + Meta.bonus('regen');
}

function getPlayerArmor(player) {
  return Meta.bonus('armor');
}

function getPlayerCritChance(player) {
  return Meta.bonus('crit');
}

// Bir seçeneğin "sil" anahtarı: silahın iki varyantı (yeni/yükselt) aynı
// silahı temsil ettiği için ortak 'w:<id>' anahtarını paylaşır; pasifler 'p:'.
function choiceBanishKey(choice) {
  return (choice.type === 'passive' ? 'p:' : 'w:') + choice.defId;
}

// Aynı seçeneği reroll'da elemek için kimlik.
function choiceKey(choice) {
  return choice.type + ':' + choice.defId;
}

function buildChoicePool(state) {
  const player = state.player;
  const pool = [];

  for (const w of WEAPON_DEFS) {
    if (state.banished.includes('w:' + w.id)) continue;
    const owned = player.weapons.find(pw => pw.defId === w.id);
    if (!owned) {
      pool.push({ type: 'new_weapon', defId: w.id, name: w.name, desc: `Yeni silah: ${w.name}` });
    } else if (owned.level < w.maxLevel) {
      pool.push({ type: 'weapon_upgrade', defId: w.id, name: w.name, desc: `${w.name} seviye ${owned.level + 1}` });
    }
  }

  for (const p of PASSIVE_DEFS) {
    if (state.banished.includes('p:' + p.id)) continue;
    if (player.passives[p.id] < p.maxCount) {
      pool.push({ type: 'passive', defId: p.id, name: p.name, desc: p.desc });
    }
  }

  return pool;
}

function generateLevelUpChoices(state) {
  state.lockedIndex = -1; // yeni modal → kilit sıfırlanır
  return pickRandomUnique(buildChoicePool(state), 3);
}

// Yeniden çevir: altın öder, kilitli seçeneği yerinde tutup diğerlerini
// yeniden üretir. Yeterli altın yoksa false.
function rerollChoices(state) {
  if (!Meta.spend(LEVELUP_QOL.rerollCost)) return false;
  const locked = state.lockedIndex;
  const keep = (locked >= 0 && state.levelUpChoices[locked]) ? state.levelUpChoices[locked] : null;

  let pool = buildChoicePool(state);
  if (keep) pool = pool.filter(c => choiceKey(c) !== choiceKey(keep));
  const fresh = pickRandomUnique(pool, keep ? 2 : 3);

  const result = [];
  let fi = 0;
  for (let i = 0; i < 3; i++) {
    if (keep && i === locked) result.push(keep);
    else if (fi < fresh.length) result.push(fresh[fi++]);
  }
  state.levelUpChoices = result;
  state.lockedIndex = keep ? result.indexOf(keep) : -1;
  return true;
}

// Sil (banish): seçeneği bu run'ın geri kalanında havuzdan çıkarır (run başına
// sınırlı), sonra seçenekleri yeniden üretir.
function banishChoice(state, index) {
  if (state.banishLeft <= 0) return false;
  const c = state.levelUpChoices[index];
  if (!c) return false;
  state.banished.push(choiceBanishKey(c));
  state.banishLeft -= 1;
  state.lockedIndex = -1;
  state.levelUpChoices = pickRandomUnique(buildChoicePool(state), 3);
  return true;
}

function toggleLevelUpLock(state, index) {
  state.lockedIndex = (state.lockedIndex === index) ? -1 : index;
}

function applyLevelUpChoice(state, choice) {
  const player = state.player;

  if (choice.type === 'new_weapon') {
    player.weapons.push({ defId: choice.defId, level: 1, cooldownLeft: 0, evolved: false });
  } else if (choice.type === 'weapon_upgrade') {
    const w = player.weapons.find(pw => pw.defId === choice.defId);
    w.level += 1;
  } else if (choice.type === 'passive') {
    player.passives[choice.defId] += 1;
  }

  state.pendingLevelUps -= 1;
  checkEvolutions(state);
}

function checkEvolutions(state) {
  const player = state.player;
  for (const evo of EVOLUTION_DEFS) {
    const w = player.weapons.find(pw => pw.defId === evo.weaponId);
    if (!w || w.evolved) continue;

    const weaponDef = getWeaponDef(w.defId);
    const passiveMaxed = player.passives[evo.passiveId] >= getPassiveDef(evo.passiveId).maxCount;

    if (w.level >= weaponDef.maxLevel && passiveMaxed) {
      w.evolved = true;
      Sound.sfx('evolve');
      UI.showToast(`${evo.name}'na evrimleşti!`);
    }
  }
}
