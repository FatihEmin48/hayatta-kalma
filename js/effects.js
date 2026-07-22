// Görsel geri bildirim: parçacıklar, uçuşan hasar sayıları, ekran sarsıntısı
// (screen shake) ve hasar alınca kırmızı vinyet. Hepsi state üzerinde tutulur
// ve her frame update+draw edilir; sayıları EFFECTS ile üst sınırlanır, yani
// yüzlerce düşman aynı anda ölse bile kare hızı/çizim maliyeti bounded kalır.

function spawnParticles(state, x, y, color, count, opts) {
  opts = opts || {};
  const speedMin = opts.speedMin !== undefined ? opts.speedMin : 40;
  const speedMax = opts.speedMax !== undefined ? opts.speedMax : 150;
  const life = opts.life !== undefined ? opts.life : 0.5;
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= EFFECTS.maxParticles) break;
    const a = Math.random() * Math.PI * 2;
    const sp = randRange(speedMin, speedMax);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life, maxLife: life,
      radius: opts.radius !== undefined ? opts.radius : randRange(1.5, 3),
      color,
      dead: false,
    });
  }
}

function updateParticles(state, dt) {
  const drag = 1 - Math.min(1, 3 * dt);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= drag;
    p.vy *= drag;
    p.life -= dt;
    if (p.life <= 0) p.dead = true;
  }
}

function spawnDamageNumber(state, x, y, amount, opts) {
  if (!EFFECTS.showDamageNumbers || !Settings.get('damageNumbers')) return;
  if (state.damageNumbers.length >= EFFECTS.maxDamageNumbers) return;
  opts = opts || {};
  state.damageNumbers.push({
    x: x + randRange(-5, 5),
    y,
    vy: -34,
    life: 0.6, maxLife: 0.6,
    text: opts.text !== undefined ? opts.text : String(Math.max(1, Math.round(amount))),
    color: opts.color || '#ffffff',
    size: opts.size || 13,
    dead: false,
  });
}

function updateDamageNumbers(state, dt) {
  for (const d of state.damageNumbers) {
    d.y += d.vy * dt;
    d.vy += 42 * dt; // yavaşça yukarı yükselip duruyor gibi
    d.life -= dt;
    if (d.life <= 0) d.dead = true;
  }
}

function addShake(state, mag) {
  if (!Settings.get('shake')) return; // erişilebilirlik: sarsıntı kapalı
  if (mag > state.shake.mag) state.shake.mag = mag;
}

function updateShake(state, dt) {
  if (state.shake.mag > 0) {
    state.shake.mag = Math.max(0, state.shake.mag - EFFECTS.shakeDecay * dt);
  }
}

function getShakeOffset(state) {
  const m = state.shake.mag;
  if (m <= 0) return { x: 0, y: 0 };
  return { x: randRange(-m, m), y: randRange(-m, m) };
}

function updateHurtFlash(state, dt) {
  if (state.hurtFlash > 0) state.hurtFlash = Math.max(0, state.hurtFlash - dt);
}

// --- Çizim (render.js içindeki render() döngüsünden çağrılır) ---

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const pos = worldToScreen(state.camera, p.x, p.y);
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDamageNumbers(ctx, state) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const d of state.damageNumbers) {
    const pos = worldToScreen(state.camera, d.x, d.y);
    ctx.globalAlpha = clamp(d.life / d.maxLife, 0, 1);
    ctx.fillStyle = d.color;
    ctx.font = `bold ${d.size}px system-ui, sans-serif`;
    ctx.fillText(d.text, pos.x, pos.y);
  }
  ctx.globalAlpha = 1;
}

// Ekran kenarlarında kırmızı parıltı — hasar alındığında. Screen shake'in
// aksine kameradan/sarsıntıdan bağımsız, tüm ekranı kaplar.
function drawHurtVignette(ctx, state) {
  if (state.hurtFlash <= 0 || !Settings.get('flash')) return;
  const a = clamp(state.hurtFlash / EFFECTS.hurtFlashTime, 0, 1) * 0.45;
  const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
  const grad = ctx.createRadialGradient(
    cx, cy, Math.min(CANVAS_W, CANVAS_H) * 0.32,
    cx, cy, Math.max(CANVAS_W, CANVAS_H) * 0.72
  );
  grad.addColorStop(0, 'rgba(200,0,0,0)');
  grad.addColorStop(1, `rgba(200,0,0,${a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}
