function getWeaponDef(id) {
  return WEAPON_DEFS.find(w => w.id === id);
}

function weaponStatAt(defId, stat, level) {
  const def = getWeaponDef(defId);
  const base = def.baseStats[stat] ?? 0;
  const perLevel = def.perLevel[stat] ?? 0;
  return base + perLevel * (level - 1);
}

function fireWhip(state, w, def) {
  const player = state.player;
  const range = weaponStatAt(w.defId, 'range', w.level);
  const arcDeg = weaponStatAt(w.defId, 'arcDeg', w.level);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player);

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
  const range = weaponStatAt(w.defId, 'range', w.level);
  const speed = weaponStatAt(w.defId, 'speed', w.level);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player);

  let nearest = null;
  let nearestDist2 = range * range;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= nearestDist2) {
      nearest = e;
      nearestDist2 = d2;
    }
  }
  if (!nearest) return;

  const dir = normalize(nearest.x - player.x, nearest.y - player.y);
  state.projectiles.push({
    x: player.x, y: player.y,
    vx: dir.x * speed, vy: dir.y * speed,
    damage, radius: 5,
    rangeLeft: range,
    dead: false,
  });
}

function fireAura(state, w, def) {
  const player = state.player;
  const radius = weaponStatAt(w.defId, 'radius', w.level);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player);
  const r2 = radius * radius;

  for (const e of state.enemies) {
    if (e.dead) continue;
    const dx = e.x - player.x, dy = e.y - player.y;
    if (dx * dx + dy * dy <= r2) {
      damageEnemy(state, e, damage);
    }
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
