# Hayatta Kalma

Üstten görünümlü, otomatik saldırılı bir horde-survival tarayıcı oyunu. Saf HTML5 Canvas + vanilla JavaScript, framework yok, build adımı yok.

**Canlı oyna:** https://fatihemin48.github.io/hayatta-kalma/

Mimari ve tasarım kararlarının tam dökümü için `PLAN.md` dosyasına bakın.

## Nasıl çalıştırılır (yerelde)

```
python3 -m http.server 8000
```

sonra tarayıcıda `http://localhost:8000/` aç. `index.html`'e doğrudan çift tıklayarak da (build adımı olmadığı için) çalışması gerekir.

## Kontroller

- **WASD** veya **ok tuşları**: hareket (masaüstü)
- **Sol alt köşedeki sanal joystick**: hareket (dokunmatik cihazlarda otomatik görünür)
- Silahlar otomatik saldırır, hedef seçmene gerek yok
- Seviye atladığında **1 / 2 / 3** tuşları veya fare/dokunma ile seçim yap

## Mobil / telefon desteği

Canvas'ın çizim çözünürlüğü, sabit bir boyutu küçültmek yerine **gerçek cihaz ekranına göre dinamik olarak** ayarlanıyor (`js/ui.js` → `applyCanvasSize`, `320`–`1600` piksel arası sınırlarla, `resize`/`orientationchange` olaylarında yeniden hesaplanıyor). Böylece telefonda (dikey ya da yatay) ekranın büyük kısmı boş kalmıyor, oyun alanı gerçekten ekranı dolduruyor. Dokunmatik cihaz tespit edilince (`navigator.maxTouchPoints` / `ontouchstart`) sol alt köşede otomatik bir sanal joystick beliriyor; klavye her zaman önceliklidir (ikisi çakışmaz).

## v2 — Silah evrimleri + harita içeriği

- **Silah evrimleri:** Kırbaç + Hasar pasifi (ikisi de max seviye/sayı) → **Kırbaç Fırtınası** (360° tam çember vuruş). Fırlatan Bıçak + Toplama Yarıçapı pasifi → **Bıçak Yağmuru** (tek hedef yerine aynı anda 3 düşmana mermi). Alan Hasarı + Can Yenilenmesi pasifi → **Yaşam Auraı** (daha büyük yarıçap + verdiği hasarın bir kısmını can olarak geri veriyor). Şartlar sağlanınca otomatik gerçekleşir, ekranda kısa bir bildirim (toast) çıkar.
- **Harita engelleri:** Dünyada dağınık ~40 statik engel (kaya); oyuncu ve düşmanlar üzerinden geçemez, etrafından dolaşmak zorunda. Silahlar/mermiler engellere bakmıyor (bilinçli basitleştirme).
- **Sandıklar:** Yaklaşık her 90 saniyede bir haritada beliren altın bir sandık; üzerine yürüyünce can tam yenilenir + 40 XP kazanılır (birden fazla seviye atlamayı tetikleyebilir), bildirim çıkar.

## Son güncellemeler (gerçek oynanış geri bildirimine göre)

İlk sürüm bu ortamda sadece headless simülasyonla test edilmişti; gerçek tarayıcıda oynandıktan sonra şu düzeltmeler yapıldı:
- **Fırlatan bıçak görünmüyordu** — mekanik olarak hasar veriyordu ama çizim kodu hiç yazılmamıştı, artık bir iz + uç noktasıyla görünüyor.
- **Kırbaç görseli yanıltıcıydı** — sadece dış çizgiyi çiziyordu, oysa hasar alanı oyuncu ile o çizgi arasındaki bütün dilim (wedge) şeklindeydi; artık dolu bir dilim olarak çiziliyor, gerçek hasar alanıyla birebir eşleşiyor.
- **Zorluk dengesi** — başlangıçta düşmanlar çok güçlü geliyordu: artık oyunun başında daha zayıf/yavaşlar, 3 dakika içinde tam güce ulaşıyorlar, sonrasında hem zamanla hem de **oyuncu seviyesiyle** (her seviye +%6 düşman gücü) birlikte güçlenmeye devam ediyorlar — böylece silahların/pasiflerin güçlenmesi düşmanların da güçlenmesiyle dengeleniyor.
- **Mobilde oyun alanı küçük kalıyordu** — sabit 960×540 kutuyu küçültmek yerine canvas artık gerçek ekran boyutuna göre yeniden boyutlanıyor (yukarıya bakın).

## Bu ortamda yapılan doğrulama

Bu geliştirme ortamında görsel tarayıcı testi mümkün değil, bu yüzden kod-seviyesinde şunlar yapılıyor:
- Her `js/*.js` dosyası `node --check` ile sözdizimi açısından doğrulanıyor.
- Saf yardımcı fonksiyonlar (`pickRandomUnique`, `xpToNextLevel`, `circleHit`, `getDifficultyScale`) `node -e` ile sağlanıyor.
- Tüm oyun, Node'un `vm` modülüyle DOM'u taklit eden bir "headless" ortamda gerçekten çalıştırılıp simüle ediliyor (farklı viewport boyutlarıyla da) — mantık hatalarını (ReferenceError, yanlış state geçişleri vb.) yakalamak için, gerçek tarayıcı testinin yerine değil.
- Bunlara ek olarak oyun artık gerçekten oynanıp (canlı sitede) geri bildirim alınarak da doğrulanıyor — yukarıdaki "Son güncellemeler" bu şekilde bulunan sorunları yansıtıyor.

## Manuel test checklist (tarayıcıda)

1. Start ekranı → "Oyunu Başlat" → oyuncu görünür, WASD/ok tuşlarıyla kamera dünyada kayar.
2. Kırbaç (başlangıç silahı) yakındaki düşmanlara dolu dilim şeklinde vurup öldürür; Fırlatan Bıçak alındığında en yakın düşmana iz bırakarak uçar; gem'ler toplama menziline girince oyuncuya uçar.
3. Bir düşmana değmek HP düşürür; bir küme içinde ~1sn durmak HP'yi anında sıfırlamaz (i-frame).
4. XP bar dolunca oyun durup tam 3 farklı seçenek gösterir; tıklama veya 1/2/3 ile seçim uygulanıp oyun devam eder; bir silah max seviyeye ulaşınca artık önerilmiyor.
5. Düşman kümesinde HP sıfırlanınca GAME_OVER ekranı (süre/seviye/öldürme istatistiği) çıkar, "Tekrar Oyna" temiz reset yapar.
6. Zamanla `fast` (~60sn), `tank` (~120sn) düşmanları ve elite'lerin (~180sn) sırayla belirdiği, hem zamanla hem seviye arttıkça zorluğun yükseldiği gözlemlenir (hızlı test için `js/config.js`'teki `unlockAt`/`DIFFICULTY`/`ELITE_DEF.every` değerleri geçici değiştirilebilir).
7. Genel "oyun hissi": `js/config.js` içindeki sayılar ince ayar isteyebilir — bu adım gerçek oynanış gerektirir, kod incelemesiyle yapılamaz.

**Mobil test:**

8. Telefonda sayfa açıldığında oyun alanı ekranı gerçekten dolduruyor mu (dikey ve yatay modda), boş/letterbox alan kalmıyor mu.
9. Sol alt köşede joystick görünüyor mu (masaüstünde görünmemeli, sadece dokunmatik cihazda), parmakla sürükleyince karakter o yönde hareket edip parmak çekilince duruyor mu.
10. Seviye atlama seçenekleri dar ekranda alt alta dizilip dokunarak seçilebiliyor mu.

**v2 test:**

11. Haritada dağınık kayalar görünüyor mu, üzerlerinden geçilemiyor ama etraflarından dolaşılabiliyor mu; bir kayanın hemen arkasında durup düşmanların birikip birikmediğini, birkaç saniye içinde etrafından dolanıp dolanmadığını gözle.
12. Yaklaşık her 90 saniyede bir altın sandık beliriyor mu, üzerine yürüyünce can tam doluyor ve XP artıyor mu, bildirim görünüyor mu.
13. Bir silahı max seviyeye (5) ve eşleşen pasifi max sayıya (5) çıkarınca otomatik evrim gerçekleşiyor mu (bildirim + kırbaç tam çember vuruyor mu, bıçak aynı anda birden fazla düşmana gidiyor mu, aura oyuncunun canını yeniliyor mu).
14. Çoklu seviye atlama sırasında (bir sandık/elite öldürme sonrası) bildirimin level-up ekranının üstünde görünüp görünmediği.

## v2 sonrası hâlâ kapsam dışı

Kalıcı ilerleme (localStorage meta-progression), ses/müzik.
