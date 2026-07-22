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

  collectChests(state);
}

function collectChests(state) {
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

// Yoldaş: oyuncunun biraz üstünde süzülür ve menzildeki en yakın düşmana
// periyodik mermi atar. Hasar Meta 'companion' seviyesiyle artar; kritik/özet
// için 'companion' kaynağıyla etiketlenir.
function updateCompanion(state, dt) {
  const c = state.companion;
  if (!c) return;
  const player = state.player;
  const a = Math.min(1, 6 * dt);
  c.x += (player.x - c.x) * a;
  c.y += (player.y - 26 - c.y) * a;

  c.fireTimer -= dt;
  if (c.fireTimer > 0) return;

  let target = null, best = COMPANION.range * COMPANION.range;
  for (const e of state.enemies) {
    if (e.dead) continue;
    const d2 = (e.x - c.x) ** 2 + (e.y - c.y) ** 2;
    if (d2 <= best) { best = d2; target = e; }
  }
  if (!target) { c.fireTimer = 0.2; return; }

  const lvl = Meta.getLevel('companion');
  const dir = normalize(target.x - c.x, target.y - c.y);
  state.projectiles.push({
    x: c.x, y: c.y,
    vx: dir.x * COMPANION.projSpeed, vy: dir.y * COMPANION.projSpeed,
    damage: COMPANION.damage * lvl * getPlayerDamageMult(player),
    radius: 4, rangeLeft: COMPANION.range, source: 'companion', dead: false,
  });
  c.fireTimer = COMPANION.cooldown;
}

function updatePickups(state) {
  const player = state.player;
  for (const p of state.pickups) {
    if (p.dead) continue;
    if (circleHit(player.x, player.y, player.radius, p.x, p.y, p.radius)) {
      p.dead = true;
      applyPickup(state, p.type);
    }
  }
}

function applyPickup(state, type) {
  const player = state.player;
  if (type === 'health') {
    const maxHp = getPlayerMaxHp(player);
    const heal = maxHp * PICKUP_CONFIG.healPct;
    player.hp = Math.min(maxHp, player.hp + heal);
    Sound.sfx('chest');
    UI.showToast(`Can iksiri! +${Math.round(heal)} can`);
  } else if (type === 'bomb') {
    let cleared = 0;
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (e.boss) { damageEnemy(state, e, PICKUP_CONFIG.bombBossDamage); }
      else { damageEnemy(state, e, e.hp + 1); cleared++; }
    }
    addShake(state, 10);
    Sound.sfx('evolve');
    UI.showToast(`Bomba! ${cleared} düşman yok edildi`);
  } else if (type === 'magnet') {
    for (const g of state.gems) g.magnetized = true;
    Sound.sfx('chest');
    UI.showToast('Mıknatıs! Tüm elmaslar çekiliyor');
  }
}
