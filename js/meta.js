// Kalıcı ilerleme (meta-progression): run'lar arası altın + kalıcı
// yükseltmeler, localStorage'da. Bozuk/eksik veriye karşı savunmacı okuma.
// Yükseltme bonusları oyuncunun stat fonksiyonlarına (js/leveling.js
// getPlayer*) eklenir; altın run sonunda kazanılır (js/main.js).
const Meta = (function () {
  const KEY = 'hk_meta';

  function defState() { return { gold: 0, upgrades: {} }; }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defState();
      const d = JSON.parse(raw);
      if (!d || typeof d !== 'object') return defState();
      return {
        gold: Math.max(0, Math.floor(d.gold) || 0),
        upgrades: (d.upgrades && typeof d.upgrades === 'object') ? d.upgrades : {},
      };
    } catch (e) {
      return defState();
    }
  }

  let data = read();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* yok say */ }
  }

  function def(id) { return META_UPGRADES.find(u => u.id === id); }

  function getGold() { return data.gold; }
  function getLevel(id) { return data.upgrades[id] | 0; }

  // Bir sonraki seviyenin maliyeti; maksa ulaşıldıysa null.
  function costFor(id) {
    const d = def(id);
    const lvl = getLevel(id);
    if (!d || lvl >= d.maxLevel) return null;
    return Math.round(d.baseCost * Math.pow(d.costGrowth, lvl));
  }

  function buy(id) {
    const d = def(id);
    if (!d) return false;
    const lvl = getLevel(id);
    if (lvl >= d.maxLevel) return false;
    const cost = costFor(id);
    if (cost === null || data.gold < cost) return false;
    data.gold -= cost;
    data.upgrades[id] = lvl + 1;
    save();
    return true;
  }

  // Yükseltmenin toplam bonusu (seviye · adım). getPlayer* fonksiyonlarında
  // kullanılır (hp: düz +, damage/speed/greed: oransal, regen: düz +).
  function bonus(id) {
    const d = def(id);
    return d ? getLevel(id) * d.step : 0;
  }

  function addGold(n) {
    data.gold += Math.max(0, Math.round(n));
    save();
    return data.gold;
  }

  // Altın harca (yeterliyse). Başarılıysa true.
  function spend(n) {
    n = Math.max(0, Math.round(n));
    if (data.gold < n) return false;
    data.gold -= n;
    save();
    return true;
  }

  function goldForRun(state) {
    const g = GOLD_CONFIG;
    const base = state.kills * g.perKill +
      Math.floor(state.timer) * g.perSecond +
      Math.max(0, state.player.level - 1) * g.perLevel;
    return Math.max(0, Math.round(base * (1 + bonus('greed'))));
  }

  function reset() { data = defState(); save(); }

  return { getGold, getLevel, costFor, buy, bonus, addGold, spend, goldForRun, reset };
})();
