function worldToScreen(camera, x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

function drawBackground(ctx, state) {
  const biome = state.biome || BIOMES[0];
  const camera = state.camera;
  ctx.fillStyle = biome.bg;
  // Screen shake sırasında kamera birkaç piksel kayınca kenarlarda boşluk
  // görünmesin diye biraz taşırarak doldur.
  ctx.fillRect(-30, -30, CANVAS_W + 60, CANVAS_H + 60);

  ctx.strokeStyle = biome.grid;
  ctx.lineWidth = 1;
  const gridSize = 100;
  const startX = -(camera.x % gridSize);
  const startY = -(camera.y % gridSize);
  for (let x = startX; x < CANVAS_W; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = startY; y < CANVAS_H; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }
}

function drawPlayer(ctx, state) {
  const player = state.player;
  const pos = worldToScreen(state.camera, player.x, player.y);
  const now = performance.now();
  const flashing = now < player.invulnUntil && Math.floor(now / 80) % 2 === 0;

  ctx.fillStyle = flashing ? '#ffffff' : '#4ade80';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0a0c10';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x + player.facingX * player.radius, pos.y + player.facingY * player.radius);
  ctx.stroke();
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const pos = worldToScreen(state.camera, e.x, e.y);
    if (pos.x < -50 || pos.x > CANVAS_W + 50 || pos.y < -50 || pos.y > CANVAS_H + 50) continue;

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, e.radius, 0, Math.PI * 2);
    ctx.fill();

    if (e.elite || e.boss) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = e.boss ? 3 : 2;
      ctx.stroke();
    }

    if (e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(pos.x - w / 2, pos.y - e.radius - 8, w, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(pos.x - w / 2, pos.y - e.radius - 8, w * clamp(e.hp / e.maxHp, 0, 1), 4);
    }
  }
}

function drawObstacles(ctx, state) {
  ctx.fillStyle = (state.biome || BIOMES[0]).obstacle;
  for (const o of state.obstacles) {
    const pos = worldToScreen(state.camera, o.x, o.y);
    if (pos.x < -60 || pos.x > CANVAS_W + 60 || pos.y < -60 || pos.y > CANVAS_H + 60) continue;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, o.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChests(ctx, state) {
  const pulse = 1 + Math.sin(performance.now() / 300) * 0.08;
  ctx.fillStyle = CHEST_CONFIG.color;
  for (const c of state.chests) {
    const pos = worldToScreen(state.camera, c.x, c.y);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, c.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

const PICKUP_ICON = { health: '➕', bomb: '💣', magnet: '🧲' };
const PICKUP_COLOR = { health: '#2ecc71', bomb: '#e67e22', magnet: '#1abc9c' };

function drawPickups(ctx, state) {
  const pulse = 1 + Math.sin(performance.now() / 250) * 0.1;
  for (const p of state.pickups) {
    const pos = worldToScreen(state.camera, p.x, p.y);
    ctx.fillStyle = PICKUP_COLOR[p.type] || '#fff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${Math.round(p.radius * 1.2)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PICKUP_ICON[p.type] || '?', pos.x, pos.y);
  }
}

function drawGems(ctx, state) {
  ctx.fillStyle = '#3fa9f5';
  for (const g of state.gems) {
    const pos = worldToScreen(state.camera, g.x, g.y);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectiles(ctx, state) {
  for (const p of state.projectiles) {
    const pos = worldToScreen(state.camera, p.x, p.y);

    if (p.boomerang) {
      const t = performance.now() / 55;
      ctx.strokeStyle = '#f0c040';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.radius, t, t + Math.PI * 1.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.radius, t + Math.PI, t + Math.PI * 2.3);
      ctx.stroke();
      continue;
    }

    const speed = Math.hypot(p.vx, p.vy) || 1;
    const dirX = p.vx / speed, dirY = p.vy / speed;
    const trailLen = p.radius * 3;

    ctx.strokeStyle = '#f5f5f5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pos.x - dirX * trailLen, pos.y - dirY * trailLen);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemyProjectiles(ctx, state) {
  for (const p of state.enemyProjectiles) {
    const pos = worldToScreen(state.camera, p.x, p.y);
    if (pos.x < -20 || pos.x > CANVAS_W + 20 || pos.y < -20 || pos.y > CANVAS_H + 20) continue;
    ctx.fillStyle = 'rgba(231,76,60,0.35)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Ekranda boss varken alt-orta sabit can barı (kameradan/sarsıntıdan bağımsız
// çizildiği için render()'da ctx.restore()'dan SONRA çağrılır).
function drawBossBar(ctx, state) {
  const boss = state.enemies.find(e => e.boss && !e.dead);
  if (!boss) return;
  const w = Math.min(CANVAS_W * 0.6, 420);
  const x = (CANVAS_W - w) / 2;
  const y = CANVAS_H - 34;

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('BOSS', CANVAS_W / 2, y - 3);

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 2, y - 2, w + 4, 14);
  ctx.fillStyle = '#8e44ad';
  ctx.fillRect(x, y, w * clamp(boss.hp / boss.maxHp, 0, 1), 10);
}

function drawWeaponEffects(ctx, state) {
  for (const fx of state.weaponEffects) {
    if (fx.type === 'explosion') {
      const t = 1 - clamp(fx.timeLeft / fx.duration, 0, 1); // 0 → 1 genişler
      const pos = worldToScreen(state.camera, fx.x, fx.y);
      ctx.strokeStyle = `rgba(231,76,60,${1 - t})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, fx.radius * t, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (fx.type === 'chain') {
      const alpha = clamp(fx.timeLeft / fx.duration, 0, 1);
      ctx.strokeStyle = `rgba(93,173,226,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      fx.points.forEach((pt, i) => {
        const s = worldToScreen(state.camera, pt.x, pt.y);
        if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
      continue;
    }
    if (fx.type === 'whip') {
      const pos = worldToScreen(state.camera, fx.x, fx.y);
      const alpha = clamp(fx.timeLeft / fx.duration, 0, 1);

      if (fx.arcDeg >= 360) {
        // Evolved (360°) whip: a plain moveTo-center/closePath wedge path
        // degenerates at a full circle — start and end angle are the same
        // point, so the stroke leaves a stray line back to the center.
        // Draw a clean ring instead.
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, fx.range, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        continue;
      }

      // Filled wedge, not just the outer arc line — the whole slice between
      // the player and the arc is the actual hit area (see inWhipArc), so
      // the visual should cover it too instead of implying only the edge hits.
      const angle = Math.atan2(fx.facingY, fx.facingX);
      const half = (fx.arcDeg * Math.PI / 180) / 2;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, fx.range, angle - half, angle + half);
      ctx.closePath();
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.35})`;
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

function drawAura(ctx, state) {
  const auraWeapon = state.player.weapons.find(w => getWeaponDef(w.defId).kind === 'aura');
  if (!auraWeapon) return;

  const evo = auraWeapon.evolved ? getEvolutionDef(auraWeapon.defId) : null;
  const radius = weaponStatAt(auraWeapon.defId, 'radius', auraWeapon.level) * (evo ? evo.radiusMult : 1);
  const pos = worldToScreen(state.camera, state.player.x, state.player.y);

  ctx.fillStyle = 'rgba(155, 89, 182, 0.15)';
  ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Dönen Kalkan toplarını oyuncunun etrafında güncel açıda çizer.
function drawOrbit(ctx, state) {
  for (const w of state.player.weapons) {
    if (getWeaponDef(w.defId).kind !== 'orbit') continue;
    const evo = w.evolved ? getEvolutionDef(w.defId) : null;
    const count = Math.max(1, Math.round(weaponStatAt(w.defId, 'count', w.level)) + (evo ? evo.extraOrbs : 0));
    const orbitR = weaponStatAt(w.defId, 'radius', w.level) * (evo ? evo.radiusMult : 1);
    const angle = w.angle || 0;
    for (let i = 0; i < count; i++) {
      const a = angle + (i / count) * Math.PI * 2;
      const pos = worldToScreen(state.camera, state.player.x + Math.cos(a) * orbitR, state.player.y + Math.sin(a) * orbitR);
      ctx.fillStyle = evo ? '#f1c40f' : '#5dade2';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// Sağ üstte küçük mini-harita: tüm dünyayı özetler (oyuncu, düşmanlar, boss,
// elit, sandık, engeller). Kameradan/sarsıntıdan bağımsız → transform dışında.
function drawMinimap(ctx, state) {
  const size = Math.min(120, CANVAS_W * 0.28);
  const pad = 10;
  const x = CANVAS_W - size - pad;
  const y = 60;
  const sx = size / WORLD_W, sy = size / WORLD_H;

  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (const o of state.obstacles) ctx.fillRect(x + o.x * sx - 1, y + o.y * sy - 1, 2, 2);

  ctx.fillStyle = '#d4af37';
  for (const c of state.chests) if (!c.dead) ctx.fillRect(x + c.x * sx - 1.5, y + c.y * sy - 1.5, 3, 3);

  for (const e of state.enemies) {
    if (e.dead) continue;
    const s = e.boss ? 5 : (e.elite ? 3 : 2);
    ctx.fillStyle = e.boss ? '#8e44ad' : (e.elite ? '#f1c40f' : 'rgba(231,76,60,0.85)');
    ctx.fillRect(x + e.x * sx - s / 2, y + e.y * sy - s / 2, s, s);
  }

  ctx.fillStyle = '#4ade80';
  ctx.fillRect(x + state.player.x * sx - 2, y + state.player.y * sy - 2, 4, 4);
}

// Atılma göstergesi (alt-orta): cooldown dolarken halka dolar, hazırken yeşil.
function drawDashGauge(ctx, state) {
  const p = state.player;
  const ready = p.dashCooldownLeft <= 0;
  const frac = ready ? 1 : 1 - clamp(p.dashCooldownLeft / DASH.cooldown, 0, 1);
  const r = 16;
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H - 96;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = ready ? '#4ade80' : 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = ready ? '#4ade80' : 'rgba(255,255,255,0.5)';
  ctx.font = '15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', cx, cy);
}

function render(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (state.mode === STATE.START) return;

  // Screen shake: dünya çizimini birkaç piksel kaydır. HUD (DOM) sarsılmaz.
  const shake = getShakeOffset(state);
  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawBackground(ctx, state);
  drawObstacles(ctx, state);
  drawGems(ctx, state);
  drawChests(ctx, state);
  drawPickups(ctx, state);
  drawWeaponEffects(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawEnemyProjectiles(ctx, state);
  drawAura(ctx, state);
  drawOrbit(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  drawDamageNumbers(ctx, state);

  ctx.restore();

  // Vinyet, boss barı ve mini-harita sarsıntıdan bağımsız → transform dışında.
  drawHurtVignette(ctx, state);
  drawBossBar(ctx, state);
  drawMinimap(ctx, state);
  drawDashGauge(ctx, state);
}
