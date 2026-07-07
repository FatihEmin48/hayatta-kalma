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

function getPlayerMaxHp(player) {
  return PLAYER_BASE.maxHp + player.passives.maxHp * getPassiveDef('maxHp').step;
}

function getPlayerSpeed(player) {
  return PLAYER_BASE.speed * (1 + player.passives.speed * getPassiveDef('speed').step);
}

function getPlayerPickupRadius(player) {
  return PLAYER_BASE.pickupRadius * (1 + player.passives.pickup * getPassiveDef('pickup').step);
}

function getPlayerDamageMult(player) {
  return 1 + player.passives.damage * getPassiveDef('damage').step;
}

function getPlayerRegen(player) {
  return player.passives.regen * getPassiveDef('regen').step;
}

function generateLevelUpChoices(state) {
  const player = state.player;
  const pool = [];

  for (const w of WEAPON_DEFS) {
    const owned = player.weapons.find(pw => pw.defId === w.id);
    if (!owned) {
      pool.push({ type: 'new_weapon', defId: w.id, name: w.name, desc: `Yeni silah: ${w.name}` });
    } else if (owned.level < w.maxLevel) {
      pool.push({ type: 'weapon_upgrade', defId: w.id, name: w.name, desc: `${w.name} seviye ${owned.level + 1}` });
    }
  }

  for (const p of PASSIVE_DEFS) {
    if (player.passives[p.id] < p.maxCount) {
      pool.push({ type: 'passive', defId: p.id, name: p.name, desc: p.desc });
    }
  }

  return pickRandomUnique(pool, 3);
}

function applyLevelUpChoice(state, choice) {
  const player = state.player;

  if (choice.type === 'new_weapon') {
    player.weapons.push({ defId: choice.defId, level: 1, cooldownLeft: 0 });
  } else if (choice.type === 'weapon_upgrade') {
    const w = player.weapons.find(pw => pw.defId === choice.defId);
    w.level += 1;
  } else if (choice.type === 'passive') {
    player.passives[choice.defId] += 1;
  }

  state.pendingLevelUps -= 1;
}
