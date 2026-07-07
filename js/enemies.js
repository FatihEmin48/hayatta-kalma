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
    dead: false,
  };
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
}

function updateEnemies(state, dt) {
  const player = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;

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

    e.x += vx * dt;
    e.y += vy * dt;
  }
}

function damageEnemy(state, enemy, amount) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  }
}

function killEnemy(state, enemy) {
  enemy.dead = true;
  state.kills += 1;
  const value = enemy.xp * (enemy.elite ? ELITE_DEF.xpMult : 1);
  state.gems.push(createGem(enemy.x, enemy.y, value));
}
