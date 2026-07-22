// Mutable: ui.js resizes these (and the canvas's drawing buffer) to match
// the actual device viewport, so the game fills the screen on any device.
let CANVAS_W = 960;
let CANVAS_H = 540;
const WORLD_W = 3000;
const WORLD_H = 3000;

const ENABLE_VICTORY = false;
const VICTORY_TIME_SEC = 900;

// Oyun modları (js/modes.js): başlangıç ekranında seçilir, run'ın kurallarını
// değiştirir. bossEvery: boss aralığı (sn); victoryTime>0: o sürede zafer;
// spawnScale: normal düşman yoğunluğu çarpanı (<1 = daha az).
const GAME_MODES = [
  { id: 'normal',      name: 'Normal',         desc: 'Klasik sonsuz hayatta kalma.',        bossEvery: 180, victoryTime: 0,   spawnScale: 1 },
  { id: 'boss_rush',   name: 'Boss Yağmuru',   desc: 'Sık sık boss, az normal düşman.',     bossEvery: 45,  victoryTime: 0,   spawnScale: 0.5 },
  { id: 'time_attack', name: 'Süre Saldırısı', desc: '5 dakika dayan, en yüksek skoru yap.', bossEvery: 120, victoryTime: 300, spawnScale: 1.15 },
];

const PLAYER_BASE = {
  radius: 14,
  maxHp: 100,
  speed: 180,
  pickupRadius: 50,
  invulnMs: 600,
};

// Oynanabilir karakterler (js/characters.js). Farklı başlangıç silahı +
// stat modifikasyonları (hp düz, speed/damage oransal). Başlangıç ekranında
// seçilir, tercih localStorage'da tutulur. `unlock` verilirse o başarım
// açılana dek kilitli (bkz. js/achievements.js).
const CHARACTERS = [
  { id: 'warrior', name: 'Savaşçı', desc: 'Dengeli. Kırbaçla başlar.', startWeapon: 'whip', mods: { hp: 0, speed: 0, damage: 0 } },
  { id: 'ranger', name: 'Nişancı', desc: 'Hızlı ama narin. Fırlatan Bıçakla başlar.', startWeapon: 'knife', mods: { hp: -20, speed: 0.15, damage: 0.05 } },
  { id: 'brute', name: 'Tank', desc: 'Yavaş ama dayanıklı. Alan Hasarıyla başlar.', startWeapon: 'aura', mods: { hp: 45, speed: -0.1, damage: 0 } },
  { id: 'mage', name: 'Büyücü', desc: 'Güçlü ama narin. Dönen Kalkanla başlar. (Boss Avcısı başarımıyla açılır)', startWeapon: 'orbit', mods: { hp: -25, speed: 0.05, damage: 0.15 }, unlock: 'boss_slayer' },
];

// Başarımlar (js/achievements.js): run sonunda değerlendirilir; bazıları
// karakter açar (bkz. CHARACTERS unlock). test(stats) doğruysa kazanılır.
// stats = { kills, timer, level, bossKills, totalGold }.
const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'İlk Kan',    desc: 'Bir düşman öldür',           test: s => s.kills >= 1 },
  { id: 'slayer_100',  name: 'Kıyıcı',     desc: 'Tek oyunda 100 öldürme',     test: s => s.kills >= 100 },
  { id: 'slayer_500',  name: 'Katliam',    desc: 'Tek oyunda 500 öldürme',     test: s => s.kills >= 500 },
  { id: 'survivor_5',  name: 'Dayanıklı',  desc: '5 dakika hayatta kal',       test: s => s.timer >= 300 },
  { id: 'survivor_10', name: 'Kaya Gibi',  desc: '10 dakika hayatta kal',      test: s => s.timer >= 600 },
  { id: 'level_20',    name: 'Tecrübeli',  desc: '20. seviyeye ulaş',          test: s => s.level >= 20 },
  { id: 'boss_slayer', name: 'Boss Avcısı', desc: 'Bir boss öldür (Büyücü açılır)', test: s => s.bossKills >= 1 },
  { id: 'rich',        name: 'Zengin',     desc: 'Toplam 300 altına ulaş',     test: s => s.totalGold >= 300 },
];

// Atılma (dash) yeteneği (js/main.js + input.js): kısa süreli hızlı hamle +
// i-frame, cooldown'lu. Boşluk tuşu (masaüstü) veya ⚡ butonu (dokunmatik).
const DASH = {
  speed: 720,
  duration: 0.18,
  cooldown: 2.5,
  invulnMs: 300,
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
  { id: 'splitter', unlockAt: 90, hp: 26, speed: 60, damage: 8, radius: 15, xp: 6, color: '#e67e22', splitter: true, splitInto: 3 },
  { id: 'tank', unlockAt: 120, hp: 55, speed: 32, damage: 13, radius: 18, xp: 8, color: '#c0392b' },
  { id: 'ranged', unlockAt: 150, hp: 16, speed: 70, damage: 6, radius: 11, xp: 7, color: '#9b59b6', ranged: true, preferredRange: 240, fireEvery: 2.2, projSpeed: 170, projDamage: 8 },
  { id: 'exploder', unlockAt: 200, hp: 14, speed: 78, damage: 6, radius: 12, xp: 7, color: '#d35400', exploder: true, explodeRadius: 50, explodeDamage: 9 },
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

// Biyomlar (js/render.js): her run rastgele biri seçilir, arka plan / ızgara /
// engel renklerini değiştirir. Oynanışı değiştirmez, görsel çeşitlilik katar.
const BIOMES = [
  { id: 'night',  name: 'Gece',          bg: '#0a0c10', grid: 'rgba(255,255,255,0.05)', obstacle: '#4a3f35' },
  { id: 'desert', name: 'Çöl',           bg: '#1c1608', grid: 'rgba(230,200,120,0.06)', obstacle: '#6b5a3a' },
  { id: 'ice',    name: 'Buz Diyarı',    bg: '#0a1620', grid: 'rgba(120,200,230,0.06)', obstacle: '#3a5b6a' },
  { id: 'blood',  name: 'Kan Bataklığı', bg: '#140a0c', grid: 'rgba(230,120,120,0.05)', obstacle: '#4a2f35' },
];

const CHEST_CONFIG = {
  spawnEverySec: 90, maxConcurrent: 2, radius: 16, xpReward: 40, color: '#d4af37',
};

// Düşman ölünce küçük olasılıkla düşen pickup'lar (js/world.js).
//  - health: maks canın bir kısmını iyileştirir
//  - bomb:   ekrandaki düşmanları yok eder (boss'a büyük hasar)
//  - magnet: tüm elmasları oyuncuya çeker
const PICKUP_CONFIG = {
  dropChance: 0.015,
  radius: 11,
  healPct: 0.3,
  bombBossDamage: 200,
  types: ['health', 'bomb', 'magnet'],
  weights: [0.6, 0.15, 0.25],
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
  { id: 'armor',  name: 'Zırh',            desc: '-1 gelen hasar',    step: 1,    maxLevel: 5, baseCost: 55, costGrowth: 1.7 },
  { id: 'crit',   name: 'Kritik Şans',     desc: '+%4 kritik (x2 hasar)', step: 0.04, maxLevel: 5, baseCost: 60, costGrowth: 1.8 },
  { id: 'greed',  name: 'Altın Bulma',     desc: '+%12 altın',        step: 0.12, maxLevel: 5, baseCost: 55, costGrowth: 1.7 },
];

const CRIT_MULT = 2;

// Level-up ekranı kolaylıkları (js/leveling.js + ui.js). Yeniden çevir altına
// mal olur, atlayınca küçük altın kazanılır, sil (banish) run başına sınırlıdır.
const LEVELUP_QOL = {
  rerollCost: 5,
  skipGold: 3,
  banishPerRun: 3,
};

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
