function getWeaponDef(id) {
  return WEAPON_DEFS.find(w => w.id === id);
}

function getEvolutionDef(weaponId) {
  return EVOLUTION_DEFS.find(e => e.weaponId === weaponId);
}

function weaponStatAt(defId, stat, level) {
  const def = getWeaponDef(defId);
  const base = def.baseStats[stat] ?? 0;
  const perLevel = def.perLevel[stat] ?? 0;
  return base + perLevel * (level - 1);
}

function fireWhip(state, w, def) {
  const player = state.player;
  const evo = w.evolved ? getEvolutionDef(w.defId) : null;
  const range = weaponStatAt(w.defId, 'range', w.level) * (evo ? evo.rangeMult : 1);
  const arcDeg = evo ? 360 : weaponStatAt(w.defId, 'arcDeg', w.level);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player) * (evo ? evo.damageMult : 1);

  for (const e of state.enemies) {
    if (e.dead) continue;
    if (inWhipArc(player.x, player.y, player.facingX, player.facingY, range, arcDeg, e.x, e.y)) {
      damageEnemy(state, e, damage);
    }
  }

  state.weaponEffects.push({
    type: 'whip',
    x: player.x, y: player.y,
    facingX: player.facingX, facingY: player.facingY,
    range, arcDeg,
    timeLeft: 0.15, duration: 0.15,
    dead: false,
  });
}

function fireKnife(state, w, def) {
  const player = state.player;
  const evo = w.evolved ? getEvolutionDef(w.defId) : null;
  const range = weaponStatAt(w.defId, 'range', w.level);
  const speed = weaponStatAt(w.defId, 'speed', w.level);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player);
  const shotCount = evo ? 1 + evo.extraProjectiles : 1;

  const targets = state.enemies
    .filter(e => !e.dead)
    .map(e => ({ e, d2: (e.x - player.x) ** 2 + (e.y - player.y) ** 2 }))
    .filter(c => c.d2 <= range * range)
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, shotCount);

  for (const { e } of targets) {
    const dir = normalize(e.x - player.x, e.y - player.y);
    state.projectiles.push({
      x: player.x, y: player.y,
      vx: dir.x * speed, vy: dir.y * speed,
      damage, radius: 5,
      rangeLeft: range,
      dead: false,
    });
  }
}

function fireAura(state, w, def) {
  const player = state.player;
  const evo = w.evolved ? getEvolutionDef(w.defId) : null;
  const radius = weaponStatAt(w.defId, 'radius', w.level) * (evo ? evo.radiusMult : 1);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player);
  const r2 = radius * radius;
  let hitCount = 0;

  for (const e of state.enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    if (dx * dx + dy * dy <= r2) {
      damageEnemy(state, e, damage);
      hitCount++;
    }
  }

  if (evo && hitCount > 0) {
    const heal = damage * hitCount * evo.lifestealPct;
    player.hp = Math.min(getPlayerMaxHp(player), player.hp + heal);
  }
}

function fireWeapon(state, w) {
  const def = getWeaponDef(w.defId);
  if (def.kind === 'melee_arc') fireWhip(state, w, def);
  else if (def.kind === 'projectile_nearest') fireKnife(state, w, def);
  else if (def.kind === 'aura') fireAura(state, w, def);
}

function updateProjectiles(state, dt) {
  for (const p of state.projectiles) {
    if (p.dead) continue;

    const moveX = p.vx * dt, moveY = p.vy * dt;
    p.x += moveX;
    p.y += moveY;
    p.rangeLeft -= Math.sqrt(moveX * moveX + moveY * moveY);
    if (p.rangeLeft <= 0) {
      p.dead = true;
      continue;
    }

    for (const e of state.enemies) {
      if (e.dead) continue;
      if (circleHit(p.x, p.y, p.radius, e.x, e.y, e.radius)) {
        damageEnemy(state, e, p.damage);
        p.dead = true;
        break;
      }
    }
  }
}

function updateWeaponEffects(state, dt) {
  for (const fx of state.weaponEffects) {
    fx.timeLeft -= dt;
    if (fx.timeLeft <= 0) fx.dead = true;
  }
}

function updateWeapons(state, dt) {
  for (const w of state.player.weapons) {
    w.cooldownLeft -= dt;
    if (w.cooldownLeft <= 0) {
      fireWeapon(state, w);
      w.cooldownLeft += weaponStatAt(w.defId, 'cooldown', w.level);
    }
  }
  updateProjectiles(state, dt);
  updateWeaponEffects(state, dt);
}
