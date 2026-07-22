// Kariyer: tüm run'lar boyunca biriken ömür boyu istatistikler (localStorage).
// Run sonunda güncellenir; başlangıç ekranındaki "Kariyer" panelinde gösterilir.
const Career = (function () {
  const KEY = 'hk_career';

  function def() {
    return { runs: 0, kills: 0, time: 0, bosses: 0, bestCombo: 0, bestLevel: 0, gold: 0 };
  }

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const d = raw ? JSON.parse(raw) : null;
      if (!d || typeof d !== 'object') return def();
      const base = def();
      for (const k in base) if (typeof d[k] === 'number') base[k] = d[k];
      return base;
    } catch (e) {
      return def();
    }
  }

  let data = read();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* yok say */ }
  }

  // Bir run bitince çağrılır (öldükçe/zaferle).
  function recordRun(state, goldEarned) {
    data.runs += 1;
    data.kills += state.kills;
    data.time += Math.floor(state.timer);
    data.bosses += state.bossKills;
    data.bestCombo = Math.max(data.bestCombo, state.maxCombo);
    data.bestLevel = Math.max(data.bestLevel, state.player.level);
    data.gold += Math.max(0, Math.round(goldEarned) || 0);
    save();
  }

  function get() { return data; }
  function reset() { data = def(); save(); }

  return { recordRun, get, reset };
})();
