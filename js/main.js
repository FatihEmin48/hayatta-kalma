const STATE = { START: 'START', PLAYING: 'PLAYING', LEVEL_UP: 'LEVEL_UP', GAME_OVER: 'GAME_OVER', VICTORY: 'VICTORY', PAUSED: 'PAUSED' };

let canvas, ctx;
let lastTime = 0;
let state = null;

function createPlayer() {
  const p = {
    x: WORLD_W / 2, y: WORLD_H / 2,
    radius: PLAYER_BASE.radius,
    hp: PLAYER_BASE.maxHp,
    facingX: 0, facingY: -1,
    vx: 0, vy: 0,
    invulnUntil: 0,
    dashCooldownLeft: 0, dashTimeLeft: 0, dashDirX: 0, dashDirY: 0,
    xp: 0, level: 1, xpToNext: xpToNextLevel(1),
    weapons: [{ defId: Characters.current().startWeapon, level: 1, cooldownLeft: 0, evolved: false }],
    passives: { speed: 0, maxHp: 0, pickup: 0, damage: 0, regen: 0 },
  };
  p.hp = getPlayerMaxHp(p); // kalıcı "Başlangıç Canı" yükseltmesiyle tam dolu başla
  return p;
}

function createInitialState() {
  const mc = Modes.current();
  const player = createPlayer();
  return {
    mode: STATE.START,
    modeConfig: mc,
    companion: Meta.getLevel('companion') > 0 ? { x: player.x, y: player.y - 26, fireTimer: 0 } : null,
    timer: 0,
    kills: 0,
    bossKills: 0,
    player,
    totalDamage: 0,
    weaponDamage: {},
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    comboScore: 0,
    comboGold: 0,
    enemies: [],
    projectiles: [],
    enemyProjectiles: [],
    gems: [],
    weaponEffects: [],
    obstacles: generateObstacles(),
    chests: [],
    chestTimer: CHEST_CONFIG.spawnEverySec,
    pickups: [],
    particles: [],
    damageNumbers: [],
    shake: { mag: 0 },
    hurtFlash: 0,
    camera: { x: 0, y: 0 },
    biome: BIOMES[randInt(0, BIOMES.length - 1)],
    spawnTimer: SPAWN.baseIntervalSec,
    eliteTimer: ELITE_DEF.every,
    bossTimer: mc.bossEvery,
    bossesSpawned: 0,
    difficultyMult: Difficulty.mult(),
    revivesLeft: Meta.getLevel('revive'),
    pendingLevelUps: 0,
    levelUpChoices: [],
    banished: [],
    banishLeft: LEVELUP_QOL.banishPerRun,
    lockedIndex: -1,
  };
}

function updateCamera(state) {
  state.camera.x = clamp(state.player.x - CANVAS_W / 2, 0, WORLD_W - CANVAS_W);
  state.camera.y = clamp(state.player.y - CANVAS_H / 2, 0, WORLD_H - CANVAS_H);
}

// Atılma: boşluk/⚡ ile tetiklenir. Hareket yönünde (yoksa bakış yönünde) kısa
// süreli yüksek hızlı hamle + i-frame; cooldown dolunca tekrar kullanılabilir.
function updateDash(state, dt) {
  const player = state.player;
  if (player.dashCooldownLeft > 0) player.dashCooldownLeft -= dt;
  if (player.dashTimeLeft > 0) player.dashTimeLeft -= dt;

  if (consumeDash() && player.dashCooldownLeft <= 0 && player.dashTimeLeft <= 0) {
    const move = getMoveVector();
    let dx = move.x, dy = move.y;
    if (dx === 0 && dy === 0) { dx = player.facingX; dy = player.facingY; }
    const n = normalize(dx, dy);
    if (n.x === 0 && n.y === 0) return;
    player.dashDirX = n.x; player.dashDirY = n.y;
    player.dashTimeLeft = DASH.duration;
    player.dashCooldownLeft = DASH.cooldown;
    player.invulnUntil = Math.max(player.invulnUntil, performance.now() + DASH.invulnMs);
    Sound.sfx('shoot');
    spawnParticles(state, player.x, player.y, '#4ade80', 8, { speedMin: 40, speedMax: 130, life: 0.3 });
  }
}

function updatePlayerMovement(state, dt) {
  const player = state.player;
  const biome = state.biome || {};
  let nx, ny;

  if (player.dashTimeLeft > 0) {
    // Dash: anlık, biyom etkilerini bypass eder.
    const sp = DASH.speed;
    player.facingX = player.dashDirX; player.facingY = player.dashDirY;
    player.vx = player.dashDirX * sp; player.vy = player.dashDirY * sp;
    nx = player.x + player.dashDirX * sp * dt;
    ny = player.y + player.dashDirY * sp * dt;
  } else {
    const move = getMoveVector();
    const speed = getPlayerSpeed(player) * (biome.speedMult || 1);
    if (move.x !== 0 || move.y !== 0) { player.facingX = move.x; player.facingY = move.y; }
    const targetVX = move.x * speed, targetVY = move.y * speed;
    if (biome.slippery) {
      // Kaygan zemin: hedef hıza yumuşak geçiş (atalet), anında durmaz.
      const a = Math.min(1, 4 * dt);
      player.vx += (targetVX - player.vx) * a;
      player.vy += (targetVY - player.vy) * a;
    } else {
      player.vx = targetVX; player.vy = targetVY;
    }
    nx = player.x + player.vx * dt;
    ny = player.y + player.vy * dt;
  }

  const resolved = resolveObstacles(nx, ny, player.radius, state.obstacles);
  player.x = clamp(resolved.x, 0, WORLD_W);
  player.y = clamp(resolved.y, 0, WORLD_H);
}

// Oyuncuya hasar uygula (i-frame + ses/sarsıntı/vinyet). i-frame açıkken no-op.
// Hem temas hem düşman mermileri bunu kullanır; `now` her çağrıda okunsa da
// invulnUntil ilk isabette ayarlandığı için aynı kare içindeki küme tek vurur.
function applyPlayerDamage(state, amount) {
  const player = state.player;
  const now = performance.now();
  if (now < player.invulnUntil) return false;
  const dmg = Math.max(1, amount - getPlayerArmor(player)); // zırh: en az 1 hasar
  player.hp -= dmg;
  player.invulnUntil = now + PLAYER_BASE.invulnMs;
  resetCombo(state); // hasar alınca combo sıfırlanır (risk-ödül)
  Sound.sfx('hurt');
  addShake(state, EFFECTS.shakeOnHurt);
  state.hurtFlash = EFFECTS.hurtFlashTime;
  return true;
}

function updateContactDamage(state) {
  const player = state.player;
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (circleHit(player.x, player.y, player.radius, e.x, e.y, e.radius)) {
      applyPlayerDamage(state, e.damage);
    }
  }
}

function updateEnemyProjectiles(state, dt) {
  const player = state.player;
  for (const p of state.enemyProjectiles) {
    if (p.dead) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) { p.dead = true; continue; }
    if (circleHit(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
      applyPlayerDamage(state, p.damage);
      p.dead = true;
    }
  }
}

function updateRegen(state, dt) {
  const player = state.player;
  const regen = getPlayerRegen(player);
  if (regen > 0) {
    player.hp = Math.min(getPlayerMaxHp(player), player.hp + regen * dt);
  }
}

function update(state, dt) {
  state.timer += dt;
  pollGamepad();
  updateDash(state, dt);
  updatePlayerMovement(state, dt);
  updateCamera(state);
  updateEnemies(state, dt);
  updateSpawner(state, dt);
  updateWeapons(state, dt);
  updateEnemyProjectiles(state, dt);
  updateContactDamage(state);
  updateRegen(state, dt);
  updateGems(state, dt);
  updateChests(state, dt);
  updatePickups(state);
  updateCompanion(state, dt);
  updateParticles(state, dt);
  updateDamageNumbers(state, dt);
  updateShake(state, dt);
  updateHurtFlash(state, dt);
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }

  state.enemies = removeDead(state.enemies);
  state.projectiles = removeDead(state.projectiles);
  state.enemyProjectiles = removeDead(state.enemyProjectiles);
  state.gems = removeDead(state.gems);
  state.weaponEffects = removeDead(state.weaponEffects);
  state.chests = removeDead(state.chests);
  state.pickups = removeDead(state.pickups);
  state.particles = removeDead(state.particles);
  state.damageNumbers = removeDead(state.damageNumbers);
}

// Run bitince: altın ekle + başarımları değerlendir (yeni açılanları bildir).
function endRunRewards(state) {
  const earned = Meta.goldForRun(state) + Math.round(state.comboGold * COMBO_CONFIG.goldWeight);
  Meta.addGold(earned);
  const stats = {
    kills: state.kills,
    timer: state.timer,
    level: state.player.level,
    bossKills: state.bossKills,
    totalGold: Meta.getGold(),
  };
  const newly = Achievements.evaluate(stats);
  if (newly.length) {
    Sound.sfx('evolve');
    UI.showToast(`🏆 ${newly.map(a => a.name).join(', ')}`);
  }
  Career.recordRun(state, earned);
  return earned;
}

// Anka Tüyü: canın bir kısmıyla ve kısa dokunulmazlıkla geri dön, çevredeki
// (boss olmayan) düşmanları temizle.
function revivePlayer(state) {
  const player = state.player;
  player.hp = getPlayerMaxHp(player) * REVIVE.healPct;
  player.invulnUntil = performance.now() + REVIVE.iframeMs;
  for (const e of state.enemies) {
    if (e.dead || e.boss) continue;
    if (circleHit(player.x, player.y, REVIVE.clearRadius, e.x, e.y, e.radius)) {
      damageEnemy(state, e, e.hp + 1);
    }
  }
  addShake(state, 12);
  state.hurtFlash = 0;
  spawnParticles(state, player.x, player.y, '#f1c40f', 30, { speedMin: 100, speedMax: 300, life: 0.8 });
  Sound.sfx('evolve');
  UI.showToast('🔥 Anka Tüyü! Küllerinden dirildin');
}

function checkTransitions(state) {
  if (state.player.hp <= 0) {
    if (state.revivesLeft > 0) {
      state.revivesLeft -= 1;
      revivePlayer(state);
      return; // dirildik, oyun sürüyor
    }
    state.mode = STATE.GAME_OVER;
    Sound.sfx('gameover');
    Sound.stopMusic();
    UI.showGameOver(state, false, Scores.submit(state), endRunRewards(state));
    return;
  }
  if (state.modeConfig.victoryTime > 0 && state.timer >= state.modeConfig.victoryTime) {
    state.mode = STATE.VICTORY;
    Sound.stopMusic();
    UI.showGameOver(state, true, Scores.submit(state), endRunRewards(state));
    return;
  }
  if (state.pendingLevelUps > 0) {
    state.mode = STATE.LEVEL_UP;
    Sound.sfx('levelup');
    state.levelUpChoices = generateLevelUpChoices(state);
    showLevelUpModal();
  }
}

function showLevelUpModal() {
  UI.showLevelUp(state.levelUpChoices, {
    gold: Meta.getGold(),
    rerollCost: LEVELUP_QOL.rerollCost,
    banishLeft: state.banishLeft,
    lockedIndex: state.lockedIndex,
  });
}

// Bir seçim/atlama sonrası: kuyrukta level-up varsa yenisini göster, yoksa devam.
function afterLevelUp() {
  if (state.pendingLevelUps > 0) {
    Sound.sfx('levelup');
    state.levelUpChoices = generateLevelUpChoices(state);
    showLevelUpModal();
  } else {
    UI.hideLevelUp();
    state.mode = STATE.PLAYING;
  }
}

function selectLevelUpChoice(index) {
  const choice = state.levelUpChoices[index];
  if (!choice) return;
  applyLevelUpChoice(state, choice);
  afterLevelUp();
}

function levelUpReroll() {
  if (state.mode !== STATE.LEVEL_UP) return;
  if (rerollChoices(state)) { Sound.sfx('shoot'); showLevelUpModal(); }
}

function levelUpSkip() {
  if (state.mode !== STATE.LEVEL_UP) return;
  Meta.addGold(LEVELUP_QOL.skipGold);
  state.pendingLevelUps -= 1;
  afterLevelUp();
}

function levelUpLock(index) {
  if (state.mode !== STATE.LEVEL_UP) return;
  toggleLevelUpLock(state, index);
  showLevelUpModal();
}

function levelUpBanish(index) {
  if (state.mode !== STATE.LEVEL_UP) return;
  if (banishChoice(state, index)) { Sound.sfx('hit'); showLevelUpModal(); }
}

function startGame() {
  state = createInitialState();
  state.mode = STATE.PLAYING;
  UI.hideAllScreens();
  UI.setHudVisible(true);
  // Start/Tekrar Oyna butonu bir kullanıcı jesti — autoplay kilidini burada aç.
  Sound.resume();
  Sound.startMusic();
  UI.showToast(`Biyom: ${state.biome.name}${state.biome.hazard ? ' — ' + state.biome.hazard : ''}`);
}

function restartGame() {
  startGame();
}

// Game-over'dan başlangıç menüsüne dön (mağazada altını harcamak için).
function returnToMenu() {
  state = createInitialState();
  Sound.stopMusic();
  UI.setHudVisible(false);
  UI.showStartMenu();
}

// ESC veya ⏸️ butonu ile duraklat/devam (yalnız oyun sırasında).
function togglePause() {
  if (state.mode === STATE.PLAYING) {
    state.mode = STATE.PAUSED;
    Sound.stopMusic();
    UI.showPause();
  } else if (state.mode === STATE.PAUSED) {
    state.mode = STATE.PLAYING;
    Sound.startMusic();
    UI.hidePause();
  }
}

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state.mode === STATE.PLAYING) {
    update(state, dt);
    checkTransitions(state);
  }

  render(ctx, state);
  UI.syncHud(state);

  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');

  UI.init();
  UI.setHudVisible(false);
  state = createInitialState();

  setLevelUpKeyHandler((index) => {
    if (state.mode === STATE.LEVEL_UP) selectLevelUpChoice(index);
  });

  lastTime = performance.now();
  requestAnimationFrame(frame);
});
