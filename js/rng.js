// Tohumlanabilir rastgele sayı üreteci (mulberry32). Tüm oyun içi rastgelelik
// bundan geçer (utils/enemies/effects), böylece bir tohumla harita/dalgalar
// yeniden üretilebilir. Günlük Meydan Okuma bugünün tohumunu kullanır → herkese
// aynı harita. Normal modda her run rastgele tohumla başlar (eski davranış).
const Rng = (function () {
  let s = 1;

  function reseed(seed) { s = (seed >>> 0) || 1; }

  function random() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Bugüne özel tohum (UTC tarih) — dünyada herkese aynı gün aynı sayı.
  function dailySeed() {
    const d = new Date();
    return (d.getUTCFullYear() * 372 + d.getUTCMonth() * 31 + d.getUTCDate()) >>> 0;
  }

  return { reseed, random, dailySeed };
})();
