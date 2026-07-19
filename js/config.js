// Mutable: ui.js resizes these (and the canvas's drawing buffer) to match
// the actual device viewport, so the game fills the screen on any device.
let CANVAS_W = 960;
let CANVAS_H = 540;
const WORLD_W = 3000;
const WORLD_H = 3000;

const ENABLE_VICTORY = false;
const VICTORY_TIME_SEC = 900;

const PLAYER_BASE = {
  radius: 14,
  maxHp: 100,
  speed: 180,
  pickupRadius: 50,
  invulnMs: 600,
};

const WEAPON_DEFS = [
  {
    id: 'whip', name: 'Kırbaç', kind: 'melee_arc',
    baseStats: { damage: 10, cooldown: 0.9, range: 70, arcDeg: 100 },
    perLevel: { damage: 4, cooldown: -0.05, range: 6, arcDeg: 8 },
    maxLevel: 5,
  },
  {
    id: 'knife', name: 'Fırlatan Bıçak', kind: 'projectile_nearest',
    baseStats: { damage: 8, cooldown: 1.1, speed: 320, range: 500 },
    perLevel: { damage: 3, cooldown: -0.07, speed: 20 },
    maxLevel: 5,
  },
  {
    id: 'aura', name: 'Alan Hasarı', kind: 'aura',
    baseStats: { damage: 4, cooldown: 0.5, radius: 60 },
    perLevel: { damage: 1.5, radius: 10 },
    maxLevel: 5,
  },
  {
    id: 'orbit', name: 'Dönen Kalkan', kind: 'orbit',
    baseStats: { damage: 6, cooldown: 0.25, radius: 70, count: 2, rotSpeed: 2.2 },
    perLevel: { damage: 3, radius: 6, count: 0.5 },
    maxLevel: 5,
  },
  {
    id: 'chain', name: 'Zincir Şimşek', kind: 'chain',
    baseStats: { damage: 14, cooldown: 1.4, range: 260, jumps: 3, jumpRange: 140 },
    perLevel: { damage: 5, cooldown: -0.08, jumps: 0.5 },
    maxLevel: 5,
  },
  {
    id: 'boomerang', name: 'Bumerang', kind: 'boomerang',
    baseStats: { damage: 12, cooldown: 1.6, speed: 300, range: 260 },
    perLevel: { damage: 4, cooldown: -0.08, speed: 15 },
    maxLevel: 5,
  },
];

const ENEMY_DEFS = [
  { id: 'basic', unlockAt: 0, hp: 10, speed: 55, damage: 6, radius: 12, xp: 3, color: '#7fbf3f' },
  { id: 'fast', unlockAt: 60, hp: 7, speed: 120, damage: 5, radius: 9, xp: 4, color: '#3fa9f5', erratic: true },
  { id: 'tank', unlockAt: 120, hp: 55, speed: 32, damage: 13, radius: 18, xp: 8, color: '#c0392b' },
];

// Enemies are weaker at the start and ramp up to their full ENEMY_DEFS
// stats over `rampSeconds`, then keep growing slowly for endless runs.
// On top of that, every player level adds a flat strength bonus, so
// getting stronger (weapons/passives) is matched by tougher enemies
// instead of runs getting trivially easy after a few level-ups.
// The scale is baked into each enemy's stats at spawn time, so enemies
// already on screen don't retroactively get stronger.
const DIFFICULTY = {
  startScale: 0.55,
  rampSeconds: 180,
  postRampGrowthPerSec: 0.002,
  perPlayerLevel: 0.06,
};

function getDifficultyScale(timer, playerLevel) {
  const t = clamp(timer / DIFFICULTY.rampSeconds, 0, 1);
  const timeScale = lerp(DIFFICULTY.startScale, 1, t)
    + Math.max(0, timer - DIFFICULTY.rampSeconds) * DIFFICULTY.postRampGrowthPerSec;
  const levelBonus = Math.max(0, playerLevel - 1) * DIFFICULTY.perPlayerLevel;
  return timeScale + levelBonus;
}

const ELITE_DEF = {
  every: 180, hpMult: 6, dmgMult: 2, speedMult: 0.9, radiusMult: 1.6, xpMult: 5, color: '#f1c40f',
};

// Boss düşmanlar (js/enemies.js). `every` saniyede bir, ekran-dışından güçlü,
// can barlı, periyodik radyal mermi saldırısı yapan bir boss belirir; öldürünce
// altın + sandık + büyük XP bırakır. Stat'lar spawn anındaki zorluk ölçeğiyle
// çarpılır ki geç gelen bosslar da tehdit olsun.
const BOSS_DEF = {
  every: 180,
  baseHp: 800,
  speed: 42,
  damage: 22,
  radius: 42,
  xp: 60,
  color: '#8e44ad',
  fireEvery: 2.6,
  projectileCount: 12,
  projectileSpeed: 150,
  projectileDamage: 12,
  projectileRadius: 8,
  projectileLife: 4,
  goldReward: 30,
};

const SPAWN = {
  maxConcurrent: 180,
  baseIntervalSec: 1.1,
  minIntervalSec: 0.12,
  rampSeconds: 240,
  spawnMargin: 60,
};

const PASSIVE_DEFS = [
  { id: 'speed', name: 'Hareket Hızı', desc: '+%10 hareket hızı', step: 0.1, maxCount: 5 },
  { id: 'maxHp', name: 'Maksimum Can', desc: '+20 maksimum can', step: 20, maxCount: 5 },
  { id: 'pickup', name: 'Toplama Yarıçapı', desc: '+%20 toplama menzili', step: 0.2, maxCount: 5 },
  { id: 'damage', name: 'Hasar', desc: '+%10 hasar', step: 0.1, maxCount: 5 },
  { id: 'regen', name: 'Can Yenilenmesi', desc: '+0.5/sn can yenileme', step: 0.5, maxCount: 5 },
];

function xpToNextLevel(level) {
  return 5 * level * level + 15 * level + 10;
}

const OBSTACLE_CONFIG = {
  count: 40, minRadius: 20, maxRadius: 45,
  edgeMargin: 60, minDistFromCenter: 250, passageBuffer: 50,
  color: '#4a3f35',
};

const CHEST_CONFIG = {
  spawnEverySec: 90, maxConcurrent: 2, radius: 16, xpReward: 40, color: '#d4af37',
};

// Kalıcı ilerleme (js/meta.js). Run sonunda altın kazanılır, başlangıç
// ekranındaki mağazada run'lar arası KALICI yükseltmelere harcanır. Her
// yükseltmenin maliyeti seviyeyle üstel artar (baseCost·costGrowth^seviye).
const GOLD_CONFIG = {
  perKill: 1,
  perSecond: 0.2,
  perLevel: 3,
};

const META_UPGRADES = [
  { id: 'hp',     name: 'Başlangıç Canı',  desc: '+15 maks. can',     step: 15,   maxLevel: 5, baseCost: 40, costGrowth: 1.6 },
  { id: 'damage', name: 'Hasar',           desc: '+%6 hasar',         step: 0.06, maxLevel: 5, baseCost: 50, costGrowth: 1.7 },
  { id: 'speed',  name: 'Hareket Hızı',    desc: '+%4 hız',           step: 0.04, maxLevel: 5, baseCost: 45, costGrowth: 1.6 },
  { id: 'regen',  name: 'Can Yenilenmesi', desc: '+0.3/sn yenilenme', step: 0.3,  maxLevel: 3, baseCost: 60, costGrowth: 1.9 },
  { id: 'greed',  name: 'Altın Bulma',     desc: '+%12 altın',        step: 0.12, maxLevel: 5, baseCost: 55, costGrowth: 1.7 },
];

// Puanlama (js/scores.js). Puan = öldürme·perKill + saniye·perSecond +
// (seviye-1)·perLevel. En yüksek maxEntries skor localStorage'da tutulur.
const SCORE_CONFIG = {
  perKill: 10,
  perSecond: 3,
  perLevel: 20,
  maxEntries: 10,
};

// Görsel geri bildirim ayarları (js/effects.js). maxParticles/maxDamageNumbers
// sert üst sınırlardır: 180 eşzamanlı düşman aynı anda ölse bile efekt sayısı
// (ve dolayısıyla çizim maliyeti) sınırlı kalır. showDamageNumbers ile uçuşan
// hasar rakamları tamamen kapatılabilir.
const EFFECTS = {
  maxParticles: 220,
  maxDamageNumbers: 40,
  showDamageNumbers: true,
  deathParticleCount: 9,
  hitParticleCount: 2,
  shakeOnHurt: 9,
  shakeOnEliteDeath: 7,
  shakeOnChest: 5,
  shakeDecay: 42,        // px/sn azalma → ~0.2sn'lik kısa, tok sarsıntı
  hurtFlashTime: 0.4,
};

const EVOLUTION_DEFS = [
  { weaponId: 'whip', passiveId: 'damage', name: 'Kırbaç Fırtınası', damageMult: 1.8, rangeMult: 1.1 },
  { weaponId: 'knife', passiveId: 'pickup', name: 'Bıçak Yağmuru', extraProjectiles: 2 },
  { weaponId: 'aura', passiveId: 'regen', name: 'Yaşam Auraı', radiusMult: 1.5, lifestealPct: 0.15 },
  { weaponId: 'orbit', passiveId: 'speed', name: 'Yıldız Kalkanı', extraOrbs: 2, radiusMult: 1.3, damageMult: 1.4 },
  { weaponId: 'chain', passiveId: 'maxHp', name: 'Fırtına Zinciri', extraJumps: 3, damageMult: 1.5 },
  { weaponId: 'boomerang', passiveId: 'pickup', name: 'Çift Bumerang', extraProjectiles: 1, damageMult: 1.3 },
];
