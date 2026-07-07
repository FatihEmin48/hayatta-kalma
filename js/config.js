const CANVAS_W = 960;
const CANVAS_H = 540;
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
];

const ENEMY_DEFS = [
  { id: 'basic', unlockAt: 0, hp: 12, speed: 60, damage: 8, radius: 12, xp: 3, color: '#7fbf3f' },
  { id: 'fast', unlockAt: 60, hp: 8, speed: 130, damage: 6, radius: 9, xp: 4, color: '#3fa9f5', erratic: true },
  { id: 'tank', unlockAt: 120, hp: 60, speed: 35, damage: 16, radius: 18, xp: 8, color: '#c0392b' },
];

const ELITE_DEF = {
  every: 180, hpMult: 6, dmgMult: 2, speedMult: 0.9, radiusMult: 1.6, xpMult: 5, color: '#f1c40f',
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
