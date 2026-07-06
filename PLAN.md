# Plan: "Hayatta Kalma" horde-survival browser oyunu + gece GitHub'a push + yarın sabah otonom implementasyon

## Context

Kullanıcı web'de oynanan bir oyun istedi; platformer fikrinden vazgeçip "Vampire Survivors" tarzı, üstten görünümlü, otomatik saldırılı bir horde-survival oyununa karar verdi. Bu oturumda kullanım limiti dolmak üzere olduğu için önce bu planı (kod yazmadan) netleştirip GitHub'a private bir repo olarak push etmek istiyor. Yarın sabah okula gitmeden önce implementasyonu **tek bir mesajla, soru sormadan tamamen otonom** başlatmak istiyor, çünkü 8 saat boyunca bilgisayara erişimi olmayacak ve döndüğünde oyunun hazır olmasını istiyor.

Doğrulanan ortam bilgileri:
- `/workspace` boş bir proje alanı; paylaşılan build tooling/konvansiyon yok.
- `/workspace/platform-oyunu/index.html` daha önce başlanıp bırakılan platformer denemesinin tek dosyasıydı (game.js/style.css hiç oluşturulmadı) — kayıpsız silindi.
- `gh` CLI `/home/node/.local/bin/gh` üzerinde kurulu ve **zaten `FatihEmin48` hesabıyla `repo` scope'uyla authenticate** (PATH'e ekli değil, tam yol veya `export PATH` gerekiyor). SSH anahtarı yok ama gerek de yok, gh HTTPS credential helper üzerinden push edebiliyor.
- Bu isimde bir GitHub reposu henüz yok.
- Bu ortamda görsel tarayıcı otomasyonu (Playwright/Puppeteer benzeri) yok — doğrulama kod-seviyesinde (`node --check`, mantık izleme) yapılacak, tarayıcıda gerçek oynanış testi kullanıcıya bırakılacak.

## Bölüm A — Şimdi yapılacaklar (kullanım limiti dolmadan önce)

1. `/workspace/platform-oyunu` dizinini sil (ölü stub, onaylandı). ✅
2. `/workspace/hayatta-kalma/` altında iskelet dizin yapısını oluştur (`js/` alt klasörü dahil), aşağıdaki mimariye göre **henüz kod yazmadan** sadece bu plan dosyasının bir kopyasını `PLAN.md` olarak repoya koy (yarın sabah otonom çalışma bu dosyayı referans alacak).
3. `git init`, ilk commit (`PLAN.md` + boş `.gitignore`).
4. `gh repo create hayatta-kalma --private --source=. --remote=origin --push` ile private repo oluştur ve push et (mevcut `FatihEmin48` kimliğiyle, kullanıcıya ekstra login sormadan).
5. Kullanıcıya repo URL'sini bildir.

Not: Bu ortamdaki dosyalar (`/workspace`) container'a özel — yarın sabah **aynı ortamda/oturumda** devam edilmezse (örn. container yeniden oluşturulursa) yerel dosyalar kaybolabilir, ama GitHub'daki push edilmiş kopya her durumda güvende kalır.

## Bölüm B — Yarın sabah: tek mesajla otonom implementasyon

Kullanıcı yerel arka plan sürecini seçti (bulut/remote agent değil). Bunun çalışması için **kullanıcının okula çıkmadan önce sağlaması gerekenler**:
- Laptop fişte kalmalı, uyku/hazırda bekletme (sleep/suspend) kapalı olmalı ("kapak kapansa bile uyumasın" ayarı).
- İnternet bağlantısı kesilmemeli.
- Bu Claude Code terminal/oturum penceresi kapatılmamalı.
- Yeterli kullanım kotası olmalı (bu tam otonom, 8 saatlik implementasyon epey mesaj/araç çağrısı tüketecek).

Tetikleme: yarın sabah kullanıcı tek satırlık bir mesaj yazacak (örn. "başlat"). Bu mesaj geldiğinde, **hiçbir soru sormadan**, aşağıdaki inşa sırasını uçtan uca uygulayacağım; belirsiz noktalarda en makul varsayımı yapıp bu dosyaya veya commit mesajlarına not düşeceğim. Her adımdan sonra çalışır bir checkpoint commit + push yapacağım (kesinti olursa ilerleme GitHub'da güvende olsun, kullanıcı telefonundan bile bakabilsin diye).

Dürüst risk notu: 8 saatlik tamamen gözetimsiz bir çalışma, hiçbir geri bildirim olmadan ilerlediği için bazı tasarım/his (oyun "feel"i) kararlarını tek başıma vermek zorunda kalacağım ve tarayıcıda görsel doğrulama yapamıyorum — bunu en aza indirmek için mimari aşırı detaylı belirlendi (aşağıda) ve sık checkpoint commit atılacak, ama sıfır risk garanti edemem.

## Oyun mimarisi (v1 kapsamı)

**Proje:** `/workspace/hayatta-kalma/` — saf HTML5 Canvas + vanilla JS, framework yok, build adımı yok, `index.html`'i doğrudan çift tıklayarak da çalışmalı (bu yüzden ES modules değil, düz `<script>` etiketleri, bağımlılık sırasına göre yüklenecek).

**Dosya listesi:**

| Dosya | Amaç |
|---|---|
| `index.html` | Canvas + `#game-wrap` overlay div'leri (start/HUD/level-up/game-over) + script tag'leri |
| `style.css` | Koyu tema, `.screen` overlay göster/gizle, HP/XP bar doluluk |
| `js/config.js` | Sabitler: canvas/dünya boyutu, oyuncu base stats, `WEAPON_DEFS`, `ENEMY_DEFS`, `ELITE_DEF`, `SPAWN`, `PASSIVE_DEFS`, XP eğrisi |
| `js/utils.js` | `clamp`, `randRange`, `circleHit`, `inWhipArc`, `pickRandomUnique`, `removeDead`, vektör yardımcıları |
| `js/input.js` | WASD/ok tuşu durumu → normalize hareket vektörü; level-up modalı için 1/2/3 tuş kancası |
| `js/weapons.js` | Silah cooldown/tetikleme (`melee_arc` / `projectile_nearest` / `aura`), mermi güncelleme+çarpışma |
| `js/enemies.js` | Düşman factory, oyuncuya doğru steering (+ erratic sallanma), ekran-dışı spawner (zamanla artan hız, unlock kapıları, elite zamanlayıcı, eşzamanlı üst sınır), ölüm→gem drop |
| `js/leveling.js` | Gem mıknatıs/toplama, XP birikimi, level-up tetikleme (çoklu level-up kuyruğu dahil), 3 seçenek üretimi (tekrarsız, maxlenmiş hariç), seçim uygulama |
| `js/render.js` | Kamera takip+clamp, dünya→ekran dönüşümü, arkaplan/gem/düşman/oyuncu/silah-efekti çizimi |
| `js/ui.js` | DOM HUD senkronu, `.screen` overlay göster/gizle, level-up seçenek butonları, game-over/victory istatistik paneli |
| `js/main.js` | Paylaşılan `state`, `STATE` enum, dt-clamp'li rAF döngüsü, state machine geçişleri, start/restart bağlama |

**Script yükleme sırası:** `config.js → utils.js → input.js → weapons.js → enemies.js → leveling.js → render.js → ui.js → main.js`.

**Entity modeli:** class değil, factory fonksiyonlarının döndürdüğü düz objeler (`player`, `enemy`, `projectile`, `gem`), hepsi tek bir paylaşılan `state` objesinde dizi olarak tutulur; her modül `update(state, dt)` / `draw(ctx, state)` alır. Ölü entity'ler `dead:true` ile işaretlenir, her frame'de tek seferlik `removeDead()` filtresiyle temizlenir.

**Çarpışma:** `circleHit` (mesafe karşılaştırma) + kırbaç için `inWhipArc` (açı+menzil). 150-200 eşzamanlı düşmanda bu yaklaşım fazlasıyla yeterli, spatial grid/quadtree v1'de gereksiz.

**Kamera:** Dünya (örn. 3000×3000) canvas'tan (örn. 960×540) büyük; `camera.x/y = clamp(player - canvas/2, 0, world - canvas)`; render dünya→ekran koordinatını `sx = wx - camera.x` ile çevirir; spawner ekran-dışı noktaları kameraya göre seçer.

**Silahlar (v1'de tam 3 tane, genişletilebilir config formatı):**
- **Kırbaç** (`melee_arc`): periyodik, oyuncunun baktığı yöne dar açılı vuruş — başlangıç silahı, oyuncu 1. seviyeden itibaren sahip.
- **Fırlatan Bıçak** (`projectile_nearest`): en yakın düşmanı otomatik hedefleyip mermi fırlatır.
- **Alan Hasarı** (`aura`): oyuncu etrafında sürekli düşük periyodik hasar.

Her silahın `baseStats` + `perLevel` (1-5 arası level) tanımı `WEAPON_DEFS` içinde; yeni silah eklemek tek bir obje + `switch(kind)`'a bir `case` eklemekten ibaret.

**Düşmanlar (3 temel tip + elite varyant):**
- `basic`: yavaş, düşük can, oyundan itibaren.
- `fast`: hızlı, erratic hareket, düşük can, ~60. saniyede unlock.
- `tank`: yavaş, yüksek can, yüksek temas hasarı, ~120. saniyede unlock.
- **Elite**: `ELITE_DEF` ile stat çarpanlı, ~her 180 saniyede bir, farklı renk/boyut, garanti daha büyük XP drop'u.

Spawner: zamanla artan spawn hızı (`baseIntervalSec → minIntervalSec`, `rampSeconds` üzerinden lerp), eşzamanlı üst sınır (`SPAWN.maxConcurrent`, örn. 180), sadece "oyuncuya doğru hareket" steering — pathfinding yok.

**Oyuncu hasarı + i-frame:** Temas anında `now >= player.invulnUntil` ise hasar uygulanır ve `invulnUntil = now + 600ms` set edilir; aynı frame içindeki diğer temaslar `now` sabit kaldığı için ikinci hasarı tetiklemez — bu, aynı anda dokunan bir düşman kümesinin oyuncuyu anında öldürmesini engelleyen mekanizma (implementasyonda özellikle dikkatle yazılıp tekrar okunacak).

**XP/Leveling:** Gem'ler `player.pickupRadius` içine girince mıknatıslanıp oyuncuya doğru hareket eder; XP eşiği aşıldığında `pendingLevelUps` sayacı artar (elite düşman tek vuruşta 2 seviye atlatabilir), her seferinde 3 farklı, tekrarsız, maxlenmemiş seçenek sunulur (yeni silah / silah yükseltme / pasif stat); seçim sonrası `pendingLevelUps>0` ise hemen bir modal daha gösterilir.

**Durum makinesi:** `START → PLAYING ⇄ LEVEL_UP(paused overlay) → GAME_OVER` (opsiyonel `VICTORY` sabit süre sonunda, config'te aç/kapa flag'i ile). `LEVEL_UP` sırasında `update()` çağrılmaz (basit pause), `render()` her zaman son sahneyi çizmeye devam eder (modal donmuş sahnenin üstünde görünür).

**HUD (Türkçe metin):** Can, Seviye, Süre (mm:ss), Öldürülen, Deneyim (XP bar), "Oyunu Başlat", "Seviye Atladın!" (1/2/3 tuş veya tıklama), "Öldün" / "Hayatta Kaldın!", "Tekrar Oyna" — eski `platform-oyunu` denemesindeki `#game-wrap` + overlay `.screen` div deseni yeniden kullanılacak.

**Performans:** Sert eşzamanlı düşman üst sınırı, tek seferlik `removeDead` süpürmesi, object pooling ve spatial partitioning v1'de bilinçli olarak atlandı (bu ölçekte gereksiz).

**v1 kapsamı dışında bırakılanlar:** Silah evrimleri/birleşimleri, localStorage ile kalıcı meta-ilerleme, engel/terrain çarpışması, sandık/hazine odaları, ses/müzik, mobil dokunmatik kontroller.

## İnşa sırası (yarın sabah otonom olarak uygulanacak)

0. ~~`platform-oyunu` sil~~ ✅, ~~`hayatta-kalma/js/` iskeleti~~ ✅ (bu gece yapıldı).
1. `index.html` iskeleti (canvas + overlay div'ler + script tag'leri) — konsolda hata vermeden yüklendiğini doğrula.
2. `style.css` — layout, tema, `.screen` toggle, bar CSS.
3. `config.js` — tüm sabitler/tanımlar.
4. `utils.js` — matematik/random/çarpışma yardımcıları (`node --check` + küçük `node -e` ile sağlama).
5. `input.js` — klavye durumu + hareket vektörü.
6. `main.js` iskeleti — `state`, `STATE` enum, dt-clamp'li rAF döngüsü; boş arenada oyuncu kamerayla dolaşabilsin (uçtan uca ilk çalışan versiyon).
7. `render.js` — kamera dönüşümü + arkaplan/oyuncu çizimi.
8. `enemies.js` — factory + steering + spawner (henüz çarpışma yok, sadece görünüp yaklaşsınlar).
9. `main.js`'e temas hasarı + i-frame + `GAME_OVER` stub'ı bağla.
10. `weapons.js` — önce kırbaç (en basit), sonra aura, sonra bıçak (mermi dizisi gerektirir).
11. `enemies.js` — ölüm→gem drop.
12. `leveling.js` — mıknatıs/toplama, XP, level-up tetikleme + seçenek üretimi/uygulama.
13. `ui.js` — HUD senkronu, tüm ekranlar, `main.js` geçişlerine bağlama.
14. Kod-seviyesi doğrulama: her JS dosyasında `node --check`, kritik mantığı (state machine, i-frame, pendingLevelUps) tekrar okuyup izleme.
15. Her adımdan sonra checkpoint commit + push; son adımda kullanıcı için elle test checklist'ini bu dosyaya/`README.md` içine yaz (adımlar aşağıda, Doğrulama bölümünde).

## Doğrulama

**Kod seviyesinde (bu ortamda, tarayıcı olmadan):**
- Her `js/*.js` dosyası için `node --check` (sözdizimi hatası yakalar).
- Saf/DOM'suz yardımcı fonksiyonlar (`XP_CURVE`, `statAt`, `circleHit`, `pickRandomUnique`) için `node -e` ile hızlı sağlama (örn. `pickRandomUnique` 1000 denemede hiç tekrar döndürmüyor mu).
- State machine, i-frame mantığı ve `pendingLevelUps` kuyruğu yazıldıktan sonra tekrar okunup elle izlenecek.

**Kullanıcının dönüşünde tarayıcıda deneyeceği adımlar (README'ye yazılacak):**
1. `cd hayatta-kalma && python3 -m http.server 8000`, `http://localhost:8000/` aç; ayrıca `index.html`'e çift tıklayarak da (build adımı olmadığı için) çalıştığını doğrula.
2. Start ekranı → "Oyunu Başlat" → oyuncu görünür, WASD/ok tuşlarıyla kamera dünyada kayar.
3. Kırbaç birkaç saniye içinde yakındaki düşmanlara vurup öldürür; gem'ler toplama menziline girince oyuncuya uçar.
4. Bir düşmana değmek HP düşürür; bir küme içinde ~1sn durmak HP'yi anında sıfırlamaz (i-frame çalışıyor).
5. XP bar dolunca oyun durup tam 3 farklı seçenek gösterir; tıklama veya 1/2/3 ile seçim uygulanıp oyun devam eder; bir silah max seviyeye ulaşınca artık önerilmiyor.
6. Düşman kümesinde HP sıfırlanınca GAME_OVER ekranı (süre/seviye/öldürme istatistiği) çıkar, "Tekrar Oyna" temiz reset yapar.
7. Zamanla `fast` (~60sn), `tank` (~120sn) ve elite'lerin (~180sn) sırayla belirdiği, spawn yoğunluğunun arttığı gözlemlenir (hızlı test için `config.js`'teki süreler geçici kısaltılabilir).

## Kullanıcıya net hatırlatma

Yarın sabah okula çıkmadan önce: laptop fişte + uyku modu kapalı, internet bağlı, bu terminal penceresi açık kalmalı; tek mesajla ("başlat" gibi) tetiklendiğinde tüm inşa süreci soru sormadan, checkpoint commit'lerle uygulanacak; tarayıcıda gerçek oynanış testi kullanıcı döndüğünde kendisi yapacak (bu ortamda görsel test aracı yok).
