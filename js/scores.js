// Yerel "en yüksek puanlar" tablosu. Backend yok → skorlar localStorage'da
// tutulur (tarayıcı/cihaz başına). Puan; öldürme + hayatta kalınan süre +
// ulaşılan seviyeden hesaplanır (ağırlıklar SCORE_CONFIG'te). Bozuk/eksik
// localStorage verisine karşı her okuma savunmacıdır (JSON parse hatası,
// dizi olmayan içerik vb. → boş liste).
const Scores = (function () {
  const KEY = 'hk_highscores';

  function computeScore(state) {
    const s = SCORE_CONFIG;
    return Math.round(
      state.kills * s.perKill +
      Math.floor(state.timer) * s.perSecond +
      Math.max(0, state.player.level - 1) * s.perLevel +
      (state.comboScore || 0) * s.comboWeight
    );
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter(e => e && typeof e.score === 'number')
        .sort((a, b) => b.score - a.score || (b.time || 0) - (a.time || 0))
        .slice(0, SCORE_CONFIG.maxEntries);
    } catch (e) {
      return [];
    }
  }

  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* yok say */ }
  }

  // Yeni run'ı listeye ekler, sıralar/kırpar, kaydeder.
  // Dönüş: { entry, list, index, isRecord, madeList }
  //  - index: yeni girişin sıralı listedeki konumu (top-N dışına düştüyse -1)
  //  - isRecord: 1. sıraya oturduysa (yeni tüm zamanların rekoru)
  //  - madeList: top-N'e girdiyse
  function submit(state) {
    const entry = {
      score: computeScore(state),
      time: Math.floor(state.timer),
      level: state.player.level,
      kills: state.kills,
      date: Date.now(),
    };
    const list = load();
    list.push(entry);
    list.sort((a, b) => b.score - a.score || b.time - a.time);
    const capped = list.slice(0, SCORE_CONFIG.maxEntries);
    save(capped);
    const index = capped.indexOf(entry);
    return { entry, list: capped, index, isRecord: index === 0, madeList: index !== -1 };
  }

  function best() {
    const list = load();
    return list.length ? list[0].score : 0;
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* yok say */ }
  }

  return { computeScore, load, submit, best, clear };
})();
