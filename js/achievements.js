// Başarımlar: run sonunda değerlendirilir, kazanılanlar localStorage'da tutulur.
// Bazı başarımlar karakter açar (Characters.isUnlocked buraya bakar). Bozuk
// veriye karşı savunmacı okuma.
const Achievements = (function () {
  const KEY = 'hk_achievements';

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      const a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  let done = read();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* yok say */ }
  }

  function isDone(id) { return done.includes(id); }
  function all() { return ACHIEVEMENTS; }
  function doneCount() { return ACHIEVEMENTS.filter(a => done.includes(a.id)).length; }

  // stats'e göre henüz kazanılmamışları test eder; yeni kazanılanları kaydeder
  // ve dizisini döndürür (bildirim için).
  function evaluate(stats) {
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (done.includes(a.id)) continue;
      let ok = false;
      try { ok = !!a.test(stats); } catch (e) { ok = false; }
      if (ok) { done.push(a.id); newly.push(a); }
    }
    if (newly.length) save();
    return newly;
  }

  function reset() { done = []; save(); }

  return { isDone, all, doneCount, evaluate, reset };
})();
