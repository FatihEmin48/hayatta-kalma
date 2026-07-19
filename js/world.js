function generateObstacles() {
  const obstacles = [];
  for (let i = 0; i < OBSTACLE_CONFIG.count; i++) {
    for (let tries = 0; tries < 30; tries++) {
      const radius = randRange(OBSTACLE_CONFIG.minRadius, OBSTACLE_CONFIG.maxRadius);
      const x = randRange(radius + OBSTACLE_CONFIG.edgeMargin, WORLD_W - radius - OBSTACLE_CONFIG.edgeMargin);
      const y = randRange(radius + OBSTACLE_CONFIG.edgeMargin, WORLD_H - radius - OBSTACLE_CONFIG.edgeMargin);
      const farFromCenter = Math.hypot(x - WORLD_W / 2, y - WORLD_H / 2) >= OBSTACLE_CONFIG.minDistFromCenter;
      const farFromOthers = obstacles.every(o => Math.hypot(x - o.x, y - o.y) >= o.radius + radius + OBSTACLE_CONFIG.passageBuffer);
      if (farFromCenter && farFromOthers) {
        obstacles.push({ x, y, radius });
        break;
      }
      // 30 denemede uygun yer bulunamazsa bu engel atlanır (sayı hafifçe azalabilir, sorun değil)
    }
  }
  return obstacles;
}

// Her entity için TÜM engeller üzerinden döner (ilk çakışmada durmaz) — aksi
// halde aynı anda iki engele değen bir entity sadece birinden itilir, ikincinin
// içinde kalabilir. `corrected` dönüşü, çağıran tarafın (enemies.js) düşmanın
// bir engele takılıp takılmadığını anlayıp küçük bir yanal itiş uygulaması için.
function resolveObstacles(x, y, radius, obstacles) {
  let rx = x, ry = y, corrected = false;
  for (const o of obstacles) {
    const dx = rx - o.x, dy = ry - o.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minDist = radius + o.radius;
    if (dist < minDist) {
      const push = minDist - dist;
      rx += (dx / dist) * push;
      ry += (dy / dist) * push;
      corrected = true;
    }
  }
  return { x: rx, y: ry, corrected };
}

function createChest(state) {
  for (let tries = 0; tries < 20; tries++) {
    const x = randRange(CHEST_CONFIG.radius, WORLD_W - CHEST_CONFIG.radius);
    const y = randRange(CHEST_CONFIG.radius, WORLD_H - CHEST_CONFIG.radius);
    const clear = state.obstacles.every(o => Math.hypot(x - o.x, y - o.y) >= o.radius + CHEST_CONFIG.radius + 10);
    if (clear) return { x, y, radius: CHEST_CONFIG.radius, dead: false };
  }
  return { x: randRange(0, WORLD_W), y: randRange(0, WORLD_H), radius: CHEST_CONFIG.radius, dead: false };
}

function updateChests(state, dt) {
  state.chestTimer -= dt;
  if (state.chestTimer <= 0) {
    if (state.chests.length < CHEST_CONFIG.maxConcurrent) {
      state.chests.push(createChest(state));
    }
    state.chestTimer = CHEST_CONFIG.spawnEverySec;
  }

  const player = state.player;
  for (const c of state.chests) {
    if (c.dead) continue;
    if (circleHit(player.x, player.y, player.radius, c.x, c.y, c.radius)) {
      c.dead = true;
      player.hp = getPlayerMaxHp(player);
      addXp(state, CHEST_CONFIG.xpReward);
      Sound.sfx('chest');
      spawnParticles(state, c.x, c.y, CHEST_CONFIG.color, 18,
        { speedMin: 60, speedMax: 190, life: 0.7 });
      addShake(state, EFFECTS.shakeOnChest);
      UI.showToast(`Sandık açıldı! +${CHEST_CONFIG.xpReward} XP, can tamamen yenilendi`);
    }
  }
}
