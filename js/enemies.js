function createEnemy(defId, x, y, elite, scale) {
  const def = ENEMY_DEFS.find(e => e.id === defId);
  const hpMult = elite ? ELITE_DEF.hpMult : 1;
  const dmgMult = elite ? ELITE_DEF.dmgMult : 1;
  const speedMult = elite ? ELITE_DEF.speedMult : 1;
  const radiusMult = elite ? ELITE_DEF.radiusMult : 1;

  return {
    defId,
    x, y,
    hp: def.hp * hpMult * scale,
    maxHp: def.hp * hpMult * scale,
    speed: def.speed * speedMult * scale,
    damage: def.damage * dmgMult * scale,
    radius: def.radius * radiusMult,
    xp: def.xp,
    color: elite ? ELITE_DEF.color : def.color,
    erratic: !!def.erratic,
    elite: !!elite,
    jitterPhase: Math.random() * Math.PI * 2,
    nudgeSign: Math.random() < 0.5 ? -1 : 1,
    scale,
    // Davranış tipleri (F4): mesafeli / patlayan / bölünen.
    ranged: !!def.ranged,
    preferredRange: def.preferredRange || 0,
    fireEvery: def.fireEvery || 0,
    fireTimer: def.fireEvery || 0,
    projSpeed: def.projSpeed || 0,
    projDamage: (def.projDamage || 0) * scale,
    exploder: !!def.exploder,
    explodeRadius: def.explodeRadius || 0,
    explodeDamage: (def.explodeDamage || 0) * scale,
    splitter: !!def.splitter,
    splitInto: def.splitInto || 0,
    dead: false,
  };
}

// Mesafeli düşmanın oyuncuya nişan alıp attığı tek mermi.
function fireEnemyShot(state, e) {
  const dir = normalize(state.player.x - e.x, state.player.y - e.y);
  state.enemyProjectiles.push({
    x: e.x, y: e.y,
    vx: dir.x * e.projSpeed, vy: dir.y * e.projSpeed,
    damage: e.projDamage, radius: 6,
    life: 4, dead: false,
  });
}

function createBoss(x, y, scale) {
  const d = BOSS_DEF;
  const hp = d.baseHp * scale;
  return {
    defId: 'boss', boss: true,
    x, y,
    hp, maxHp: hp,
    speed: d.speed,
    damage: d.damage * scale,
    projDamage: d.projectileDamage * scale,
    radius: d.radius,
    xp: d.xp,
    color: d.color,
    erratic: false, elite: false,
    jitterPhase: 0, nudgeSign: 1,
    fireTimer: d.fireEvery,
    dead: false,
  };
}

function hasBoss(state) {
  return state.enemies.some(e => e.boss && !e.dead);
}

function spawnBoss(state) {
  const pos = randomOffscreenPoint(state.camera);
  const scale = getDifficultyScale(state.timer, state.player.level);
  state.enemies.push(createBoss(pos.x, pos.y, scale));
  Sound.sfx('evolve');
  UI.showToast('⚠️ Boss geliyor!');
}

// Boss'un tam çember (radyal) mermi saldırısı — oyuncuya doğru hizalanır ki
// oyuncu boşluklardan sıyrılmak için hareket etmek zorunda kalsın.
function fireBossBurst(state, boss) {
  const n = BOSS_DEF.projectileCount;
  const base = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
  for (let i = 0; i < n; i++) {
    const a = base + (i / n) * Math.PI * 2;
    state.enemyProjectiles.push({
      x: boss.x, y: boss.y,
      vx: Math.cos(a) * BOSS_DEF.projectileSpeed,
      vy: Math.sin(a) * BOSS_DEF.projectileSpeed,
      damage: boss.projDamage,
      radius: BOSS_DEF.projectileRadius,
      life: BOSS_DEF.projectileLife,
      dead: false,
    });
  }
  Sound.sfx('shoot');
}

function randomOffscreenPoint(camera) {
  const margin = SPAWN.spawnMargin;
  const side = randInt(0, 3);
  let x, y;

  if (side === 0) { x = camera.x - margin; y = randRange(camera.y, camera.y + CANVAS_H); }
  else if (side === 1) { x = camera.x + CANVAS_W + margin; y = randRange(camera.y, camera.y + CANVAS_H); }
  else if (side === 2) { y = camera.y - margin; x = randRange(camera.x, camera.x + CANVAS_W); }
  else { y = camera.y + CANVAS_H + margin; x = randRange(camera.x, camera.x + CANVAS_W); }

  return { x: clamp(x, 0, WORLD_W), y: clamp(y, 0, WORLD_H) };
}

function spawnEnemy(state, elite) {
  const available = ENEMY_DEFS.filter(d => d.unlockAt <= state.timer);
  const def = available[randInt(0, available.length - 1)];
  const pos = randomOffscreenPoint(state.camera);
  const scale = getDifficultyScale(state.timer, state.player.level);
  state.enemies.push(createEnemy(def.id, pos.x, pos.y, !!elite, scale));
}

function updateSpawner(state, dt) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.enemies.length < SPAWN.maxConcurrent) {
    spawnEnemy(state, false);
    const t = state.timer / SPAWN.rampSeconds;
    state.spawnTimer = lerp(SPAWN.baseIntervalSec, SPAWN.minIntervalSec, t);
  }

  state.eliteTimer -= dt;
  if (state.eliteTimer <= 0) {
    if (state.enemies.length < SPAWN.maxConcurrent) {
      spawnEnemy(state, true);
    }
    state.eliteTimer = ELITE_DEF.every;
  }

  // Aynı anda tek boss: zamanı gelse de mevcut boss ölene kadar bekle,
  // sonra hemen spawn edip sayacı sıfırla.
  state.bossTimer -= dt;
  if (state.bossTimer <= 0 && !hasBoss(state)) {
    spawnBoss(state);
    state.bossTimer = BOSS_DEF.every;
  }
}

function updateEnemies(state, dt) {
  const player = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;

    if (e.boss) {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) {
        e.fireTimer = BOSS_DEF.fireEvery;
        fireBossBurst(state, e);
      }
    }

    // Mesafeli düşman: tercih ettiği menzili korur (uzaksa yaklaşır, çok
    // yakınsa uzaklaşır, menzildeyse yanlamasına kayar) ve periyodik ateş eder.
    if (e.ranged) {
      e.fireTimer -= dt;
      if (e.fireTimer <= 0) { e.fireTimer = e.fireEvery; fireEnemyShot(state, e); }
      const dx = player.x - e.x, dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist, ny = dy / dist;
      let vx, vy;
      if (dist > e.preferredRange * 1.05) { vx = nx * e.speed; vy = ny * e.speed; }
      else if (dist < e.preferredRange * 0.85) { vx = -nx * e.speed; vy = -ny * e.speed; }
      else { vx = -ny * e.speed * 0.5; vy = nx * e.speed * 0.5; }
      const r = resolveObstacles(e.x + vx * dt, e.y + vy * dt, e.radius, state.obstacles);
      e.x = r.x; e.y = r.y;
      continue;
    }

    const dir = normalize(player.x - e.x, player.y - e.y);
    let vx = dir.x * e.speed;
    let vy = dir.y * e.speed;

    if (e.erratic) {
      e.jitterPhase += dt * 6;
      const perpX = -dir.y, perpY = dir.x;
      const wobble = Math.sin(e.jitterPhase) * e.speed * 0.5;
      vx += perpX * wobble;
      vy += perpY * wobble;
    }

    const resolved = resolveObstacles(e.x + vx * dt, e.y + vy * dt, e.radius, state.obstacles);
    if (resolved.corrected) {
      // Cheap hedge against a rare freeze when player/obstacle/enemy line up
      // exactly (push-out direction ends up parallel to travel direction
      // every frame): nudge perpendicular with a fixed per-enemy sign so it
      // doesn't oscillate. Not real pathfinding, just enough to route around.
      const perpX = -dir.y, perpY = dir.x;
      resolved.x += perpX * e.nudgeSign * e.speed * dt * 0.6;
      resolved.y += perpY * e.nudgeSign * e.speed * dt * 0.6;
    }
    e.x = resolved.x;
    e.y = resolved.y;
  }
}

function damageEnemy(state, enemy, amount) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  spawnDamageNumber(state, enemy.x, enemy.y - enemy.radius - 4, amount,
    enemy.elite ? { color: '#f1c40f', size: 15 } : undefined);
  Sound.sfx('hit');
  spawnParticles(state, enemy.x, enemy.y, '#ffffff', EFFECTS.hitParticleCount,
    { speedMin: 20, speedMax: 70, life: 0.22, radius: 1.5 });
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  }
}

function killEnemy(state, enemy) {
  enemy.dead = true;
  state.kills += 1;
  Sound.sfx('death');
  spawnParticles(state, enemy.x, enemy.y, enemy.color, EFFECTS.deathParticleCount, { life: 0.5 });

  if (enemy.boss) {
    state.bossKills += 1;
    Sound.sfx('evolve');
    addShake(state, EFFECTS.shakeOnEliteDeath * 2.2);
    spawnParticles(state, enemy.x, enemy.y, enemy.color, 32, { speedMin: 80, speedMax: 260, life: 0.85 });
    Meta.addGold(BOSS_DEF.goldReward);
    state.chests.push({ x: enemy.x, y: enemy.y, radius: CHEST_CONFIG.radius, dead: false });
    UI.showToast(`Boss yenildi! +${BOSS_DEF.goldReward} altın + sandık`);
    state.gems.push(createGem(enemy.x, enemy.y, enemy.xp));
    return;
  }
  if (enemy.elite) addShake(state, EFFECTS.shakeOnEliteDeath);

  // Patlayan: ölünce yakındaki oyuncuya alan hasarı + görsel patlama halkası.
  if (enemy.exploder) {
    spawnParticles(state, enemy.x, enemy.y, '#e74c3c', 16, { speedMin: 80, speedMax: 220, life: 0.5 });
    state.weaponEffects.push({ type: 'explosion', x: enemy.x, y: enemy.y, radius: enemy.explodeRadius, timeLeft: 0.3, duration: 0.3, dead: false });
    addShake(state, 5);
    if (circleHit(state.player.x, state.player.y, state.player.radius, enemy.x, enemy.y, enemy.explodeRadius)) {
      applyPlayerDamage(state, enemy.explodeDamage);
    }
  }

  // Bölünen: ölünce birkaç küçük (zayıf) düşmana ayrılır.
  if (enemy.splitter && enemy.splitInto > 0) {
    for (let i = 0; i < enemy.splitInto; i++) {
      const a = (i / enemy.splitInto) * Math.PI * 2 + Math.random();
      const cx = enemy.x + Math.cos(a) * enemy.radius;
      const cy = enemy.y + Math.sin(a) * enemy.radius;
      state.enemies.push(createEnemy('basic', cx, cy, false, Math.max(0.4, enemy.scale * 0.6)));
    }
  }

  const value = enemy.xp * (enemy.elite ? ELITE_DEF.xpMult : 1);
  state.gems.push(createGem(enemy.x, enemy.y, value));
  maybeDropPickup(state, enemy.x, enemy.y);
}

function maybeDropPickup(state, x, y) {
  if (Math.random() >= PICKUP_CONFIG.dropChance) return;
  const type = weightedPick(PICKUP_CONFIG.types, PICKUP_CONFIG.weights);
  state.pickups.push({ x, y, radius: PICKUP_CONFIG.radius, type, dead: false });
}
