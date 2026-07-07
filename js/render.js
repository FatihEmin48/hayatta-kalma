function worldToScreen(camera, x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

function drawBackground(ctx, camera) {
  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
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

    if (e.elite) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
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

function drawWeaponEffects(ctx, state) {
  for (const fx of state.weaponEffects) {
    if (fx.type === 'whip') {
      const pos = worldToScreen(state.camera, fx.x, fx.y);
      const alpha = clamp(fx.timeLeft / fx.duration, 0, 1);
      const angle = Math.atan2(fx.facingY, fx.facingX);
      const half = (fx.arcDeg * Math.PI / 180) / 2;

      // Filled wedge, not just the outer arc line — the whole slice between
      // the player and the arc is the actual hit area (see inWhipArc), so
      // the visual should cover it too instead of implying only the edge hits.
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

  const radius = weaponStatAt(auraWeapon.defId, 'radius', auraWeapon.level);
  const pos = worldToScreen(state.camera, state.player.x, state.player.y);

  ctx.fillStyle = 'rgba(155, 89, 182, 0.15)';
  ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function render(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (state.mode === STATE.START) return;

  drawBackground(ctx, state.camera);
  drawGems(ctx, state);
  drawWeaponEffects(ctx, state);
  drawEnemies(ctx, state);
  drawProjectiles(ctx, state);
  drawAura(ctx, state);
  drawPlayer(ctx, state);
}
