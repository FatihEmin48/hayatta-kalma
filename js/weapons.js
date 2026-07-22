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
      damageEnemy(state, e, damage, 'whip');
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

  if (targets.length > 0) Sound.sfx('shoot');
  for (const { e } of targets) {
    const dir = normalize(e.x - player.x, e.y - player.y);
    state.projectiles.push({
      x: player.x, y: player.y,
      vx: dir.x * speed, vy: dir.y * speed,
      damage, radius: 5,
      rangeLeft: range,
      source: 'knife',
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
      damageEnemy(state, e, damage, 'aura');
      hitCount++;
    }
  }

  if (evo && hitCount > 0) {
    const heal = damage * hitCount * evo.lifestealPct;
    player.hp = Math.min(getPlayerMaxHp(player), player.hp + heal);
  }
}

// Dönen Kalkan: oyuncunun etrafında dönen top(lar); her cooldown "tick"inde
// mevcut açıdaki top konumlarında düşmanlara hasar verir (açı updateWeapons'ta
// sürekli döner, çizim drawOrbit'te).
function fireOrbit(state, w, def) {
  const player = state.player;
  const evo = w.evolved ? getEvolutionDef(w.defId) : null;
  const count = Math.max(1, Math.round(weaponStatAt(w.defId, 'count', w.level)) + (evo ? evo.extraOrbs : 0));
  const orbitR = weaponStatAt(w.defId, 'radius', w.level) * (evo ? evo.radiusMult : 1);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player) * (evo ? evo.damageMult : 1);
  const hitR = 14;
  const angle = w.angle || 0;
  for (let i = 0; i < count; i++) {
    const a = angle + (i / count) * Math.PI * 2;
    const ox = player.x + Math.cos(a) * orbitR;
    const oy = player.y + Math.sin(a) * orbitR;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (circleHit(ox, oy, hitR, e.x, e.y, e.radius)) damageEnemy(state, e, damage, 'orbit');
    }
  }
}

// Zincir Şimşek: en yakın düşmana vurur, oradan sıçrayarak yakındaki başka
// düşmanlara zincirlenir (her sıçramada hasar azalır). Kısa ömürlü bir
// 'chain' efekti çizim için nokta listesini taşır.
function fireChain(state, w, def) {
  const player = state.player;
  const range = weaponStatAt(w.defId, 'range', w.level);
  const jumpRange = weaponStatAt(w.defId, 'jumpRange', w.level);
  const evo = w.evolved ? getEvolutionDef(w.defId) : null;
  const maxJumps = Math.max(1, Math.round(weaponStatAt(w.defId, 'jumps', w.level)) + (evo ? evo.extraJumps : 0));
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player) * (evo ? evo.damageMult : 1);

  const alive = state.enemies.filter(e => !e.dead);
  let node = null, best = range * range;
  for (const e of alive) {
    const d2 = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d2 <= best) { best = d2; node = e; }
  }
  if (!node) return;

  const hit = new Set();
  const points = [{ x: player.x, y: player.y }];
  for (let j = 0; j < maxJumps && node; j++) {
    damageEnemy(state, node, damage * Math.pow(0.85, j), 'chain');
    hit.add(node);
    points.push({ x: node.x, y: node.y });
    let next = null, bd2 = jumpRange * jumpRange;
    for (const e of alive) {
      if (e.dead || hit.has(e)) continue;
      const d2 = (e.x - node.x) ** 2 + (e.y - node.y) ** 2;
      if (d2 <= bd2) { bd2 = d2; next = e; }
    }
    node = next;
  }
  state.weaponEffects.push({ type: 'chain', points, timeLeft: 0.18, duration: 0.18, dead: false });
  Sound.sfx('shoot');
}

// Bumerang: en yakın düşmana doğru fırlatılır, `range` kadar gidip geri döner;
// gidiş-dönüş boyunca değdiği düşmanları deler (aynı düşmana 0.35sn'de bir).
function fireBoomerang(state, w, def) {
  const player = state.player;
  const speed = weaponStatAt(w.defId, 'speed', w.level);
  const damage = weaponStatAt(w.defId, 'damage', w.level) * getPlayerDamageMult(player);
  const range = weaponStatAt(w.defId, 'range', w.level);
  const evo = w.evolved ? getEvolutionDef(w.defId) : null;

  let tx = player.facingX, ty = player.facingY;
  let best = Infinity, target = null;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d2 = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d2 < best) { best = d2; target = e; }
  }
  if (target) { const dir = normalize(target.x - player.x, target.y - player.y); tx = dir.x; ty = dir.y; }

  const shots = 1 + (evo ? evo.extraProjectiles : 0);
  for (let s = 0; s < shots; s++) {
    const spread = (s - (shots - 1) / 2) * 0.4;
    const ca = Math.cos(spread), sa = Math.sin(spread);
    const dx = tx * ca - ty * sa, dy = tx * sa + ty * ca;
    state.projectiles.push({
      x: player.x, y: player.y,
      vx: dx * speed, vy: dy * speed,
      speedVal: speed,
      damage: damage * (evo ? evo.damageMult : 1),
      radius: 9,
      boomerang: true, phase: 'out', traveled: 0, maxDist: range,
      hitTimes: new Map(),
      source: 'boomerang',
      dead: false,
    });
  }
  Sound.sfx('shoot');
}

function fireWeapon(state, w) {
  const def = getWeaponDef(w.defId);
  if (def.kind === 'melee_arc') fireWhip(state, w, def);
  else if (def.kind === 'projectile_nearest') fireKnife(state, w, def);
  else if (def.kind === 'aura') fireAura(state, w, def);
  else if (def.kind === 'orbit') fireOrbit(state, w, def);
  else if (def.kind === 'chain') fireChain(state, w, def);
  else if (def.kind === 'boomerang') fireBoomerang(state, w, def);
}

function updateBoomerang(state, p, dt) {
  const player = state.player;
  if (p.phase === 'out') {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.traveled += Math.hypot(p.vx, p.vy) * dt;
    if (p.traveled >= p.maxDist) p.phase = 'back';
  } else {
    // Dönüş: her zaman oyuncunun GÜNCEL konumuna doğru (oyuncu hareket etse de
    // bumerang eline döner). Oyuncuya ulaşınca kaybolur.
    const dir = normalize(player.x - p.x, player.y - p.y);
    p.x += dir.x * p.speedVal * dt;
    p.y += dir.y * p.speedVal * dt;
    if (circleHit(p.x, p.y, p.radius, player.x, player.y, player.radius)) { p.dead = true; return; }
  }
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (circleHit(p.x, p.y, p.radius, e.x, e.y, e.radius)) {
      const last = p.hitTimes.get(e);
      if (last === undefined || state.timer - last >= 0.35) {
        damageEnemy(state, e, p.damage, p.source);
        p.hitTimes.set(e, state.timer);
      }
    }
  }
}

function updateProjectiles(state, dt) {
  for (const p of state.projectiles) {
    if (p.dead) continue;
    if (p.boomerang) { updateBoomerang(state, p, dt); continue; }

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
        damageEnemy(state, e, p.damage, p.source);
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
    const def = getWeaponDef(w.defId);
    if (def.kind === 'orbit') {
      w.angle = (w.angle || 0) + weaponStatAt(w.defId, 'rotSpeed', w.level) * dt;
    }
    w.cooldownLeft -= dt;
    if (w.cooldownLeft <= 0) {
      fireWeapon(state, w);
      w.cooldownLeft += weaponStatAt(w.defId, 'cooldown', w.level);
    }
  }
  updateProjectiles(state, dt);
  updateWeaponEffects(state, dt);
}
