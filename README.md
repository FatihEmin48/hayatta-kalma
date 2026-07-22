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
- **Kayan sanal joystick**: hareket — dokunmatik cihazda ekrana nerede basarsan joystick orada belirir
- Silahlar otomatik saldırır, hedef seçmene gerek yok
- Seviye atladığında **1 / 2 / 3** tuşları veya fare/dokunma ile seçim yap

## Mobil / telefon desteği

Canvas'ın çizim çözünürlüğü, sabit bir boyutu küçültmek yerine **gerçek cihaz ekranına göre dinamik olarak** ayarlanıyor (`js/ui.js` → `applyCanvasSize`, `320`–`1600` piksel arası sınırlarla, `resize`/`orientationchange` olaylarında yeniden hesaplanıyor). Böylece telefonda (dikey ya da yatay) ekranın büyük kısmı boş kalmıyor, oyun alanı gerçekten ekranı dolduruyor. Dokunmatik cihaz tespit edilince (`navigator.maxTouchPoints` / `ontouchstart`) **kayan (floating) sanal joystick** devreye girer: oyun alanına (canvas) nerede basarsan joystick tam o noktada belirir, parmağını takip eder, parmağını çekince kaybolur — sabit köşe değil (gerçek oynanış geri bildirimi). Joystick görseli `pointer-events:none` olduğundan girişi engellemez; tüm dokunuş mantığı canvas + `window` dinleyicileriyle yürür, bu yüzden UI butonlarına (dash/ayar/duraklat — ayrı, üstteki elemanlar) basınca joystick çıkmaz. Klavye ve oyun kolu `getMoveVector`'da önceliklidir (üçü çakışmaz).

## v2 — Silah evrimleri + harita içeriği

- **Silah evrimleri:** Kırbaç + Hasar pasifi (ikisi de max seviye/sayı) → **Kırbaç Fırtınası** (360° tam çember vuruş). Fırlatan Bıçak + Toplama Yarıçapı pasifi → **Bıçak Yağmuru** (tek hedef yerine aynı anda 3 düşmana mermi). Alan Hasarı + Can Yenilenmesi pasifi → **Yaşam Auraı** (daha büyük yarıçap + verdiği hasarın bir kısmını can olarak geri veriyor). Şartlar sağlanınca otomatik gerçekleşir, ekranda kısa bir bildirim (toast) çıkar.
- **Harita engelleri:** Dünyada dağınık ~40 statik engel (kaya); oyuncu ve düşmanlar üzerinden geçemez, etrafından dolaşmak zorunda. Silahlar/mermiler engellere bakmıyor (bilinçli basitleştirme).
- **Sandıklar:** Yaklaşık her 90 saniyede bir haritada beliren altın bir sandık; üzerine yürüyünce can tam yenilenir + 40 XP kazanılır (birden fazla seviye atlamayı tetikleyebilir), bildirim çıkar.

## v26 — Yeni boss çeşitleri

Boss'lar artık tek tip değil; her boss'ta sırayla değişen 3 çeşit (`BOSS_VARIANTS`):

- **Kâhin (radial):** Tam çember mermi saçar (eski davranış).
- **Koçbaşı (charger):** Periyodik olarak oyuncuya kilitlenip **yüksek hızla hücum** eder (`chargeSpeed`/`chargeDuration`); hücum sırasında temas ölümcül.
- **Efendi (summoner):** Etrafına periyodik **minyon düşman çağırır** (basic/fast).

Boss barı artık çeşidin adını ve rengini gösterir; run başı bildirim hangi boss'un geldiğini yazar. Boss sayacı (`state.bossesSpawned`) çeşidi döndürür.

## v25 — Codex / Rehber

- **Rehber (`js/ui.js` `renderCodex`):** Başlangıç ekranında 📖 Rehber düğmesiyle açılan referans ekranı — tüm silahlar ve **evrim tarifleri** (hangi silah maks + hangi pasif maks → hangi evrim), düşman tipleri (davranışlarıyla) ve biyomlar (tehlikeleriyle). Tamamen `WEAPON_DEFS`/`EVOLUTION_DEFS`/`PASSIVE_DEFS`/`ENEMY_DEFS`/`BIOMES` config'inden üretilir, ayrı veri tutmaz.

## v24 — Kariyer istatistikleri

- **Kariyer (`js/career.js`, localStorage):** Tüm run'lar boyunca biriken ömür boyu istatistikler — oynanan oyun, toplam öldürme, toplam süre, öldürülen boss, en yüksek combo, en yüksek seviye, toplam kazanılan altın. Her run sonunda (`endRunRewards`) güncellenir.
- **Panel:** Başlangıç ekranında 📈 Kariyer düğmesiyle açılan liste (buton oynanan oyun sayısını gösterir).

## v23 — Yoldaş / pet

- **Yoldaş (`COMPANION` + `companion` meta yükseltmesi):** Mağazadan alınınca (seviye 1-3) oyuncunun biraz üstünde süzülen, en yakın düşmana **otomatik mermi atan** bir eşlikçi belirir. Hasar seviyeyle artar; mermiler kritik yapabilir ve run özetinde "Yoldaş" olarak sayılır. Alınmadıysa run'da yoldaş yok.

## v22 — Biyoma özel tehlikeler

Biyomlar artık sadece görsel değil, mekanik de: her biri `BIOMES` içinde bir tehlike taşır ve run başı bildirimde belirtilir.

- **Çöl — dar görüş:** Oyuncunun etrafında görüş vinyeti; düşmanları daha geç görürsün (`drawBiomeVision`).
- **Buz Diyarı — kaygan zemin:** Hareket atalet kazanır (anında durmaz/dönmez); oyuncuda `vx/vy` ile yumuşak geçiş.
- **Kan Bataklığı — çamur:** Hareket hızı %12 düşer (`speedMult`).
- Gece nötr (tehlikesiz). Dash biyom etkilerini bypass eder (kaçış hep güvenilir).

## v21 — Combo / seri çarpanı

- **Combo (`COMBO_CONFIG`, `js/leveling.js`):** Art arda öldürme bir çarpan biriktirir (her öldürme +%2, en fazla +%150 → 2.5x). `window` saniye (3sn) içinde öldürme olmazsa **veya hasar alınca** combo sıfırlanır — risk-ödül.
- **Ödül:** Combo çarpanı hem **skoru** (`comboScore` · `comboWeight`) hem **altını** (`comboGold` · `goldWeight`) artırır. En yüksek combo game-over özetinde gösterilir.
- **HUD:** Üst-ortada (boss geri sayımının altında) combo çarpanı ve kalan süre barı; çarpan yükseldikçe kızarır. combo ≥ 2'de görünür.

## v20 — Kayan (floating) joystick

- **Gerçek oynanış geri bildirimi:** Mobilde kontroller sabit köşede değil, **parmağını bastığın yerde** çıksın istendi. Joystick artık kayan: oyun alanına dokunulan noktada belirir, parmağı takip eder, bırakınca kaybolur (`js/input.js` `initJoystick`). Görsel `pointer-events:none`, tüm giriş canvas + `window` dokunuş dinleyicileriyle işlenir; UI butonları etkilenmez.
- Bununla birlikte artık gereksiz kalan **sol/sağ taraf seçicisi kaldırıldı** (kayan joystick zaten her yerden erişilebilir olduğu için el tercihini kendiliğinden çözer).

## v19 — Boss geri sayımı (HUD)

- **Boss geri sayımı:** Üst-ortada bir sonraki boss'a kalan süre gösterilir (⚔️ Boss: M:SS); son 10 saniyede kırmızıya döner. Boss sahnedeyken gizlenir (o an alttaki boss can barı görünür). Oyuncu boss'a hazırlanabilsin diye.

## v18 — Zırh + kritik vuruş

- **Zırh (`armor` meta yükseltmesi):** Gelen her hasarı düz olarak azaltır (en az 1 hasar geçer). `applyPlayerDamage` içinde uygulanır — hem temas hem düşman/boss mermileri için.
- **Kritik vuruş (`crit` meta yükseltmesi):** Silah kaynaklı her isabette kritik şansı; kritikte hasar **x2** (`CRIT_MULT`) ve hasar sayısı turuncu/büyük + "!" ile gösterilir. `damageEnemy` içinde merkezî olarak yuvarlanır (bomba gibi silah-dışı hasarlar kritik yapmaz). İkisi de mağazadan alınır.

## v17 — Run özeti + mobil/denge düzeltmeleri

- **Run özeti (game-over):** Ölünce/bitince istatistik satırı: **Hasar/sn (DPS)**, **toplam hasar** ve **en etkili silah** (yüzdesiyle). `damageEnemy` artık kaynak silahı da alıp `state.weaponDamage`'de toplar (overkill sayılmaz).
- **Mobil seviye atlama ekranı düzeltmesi:** Telefonda seçenekler ekrana sığmıyordu; `.screen` artık `safe center` + kaydırma ile taşan içeriği kırpmadan gösterir, kartlar dar/kısa ekranlarda kompaktlaşır.
- **Denge — patlayan düşman zayıflatıldı:** `exploder` patlama hasarı 18→9, yarıçapı 70→50, hızı 95→78. Artık ölürken oyuncuyu tek seferde ağır cezalandırmıyor.

## v16 — Gamepad (oyun kolu) desteği

- **Gamepad API (`js/input.js`):** Sol analog çubuk + D-pad ile hareket; **A / RB / RT** ile atılma (dash). Öncelik sırası: klavye > oyun kolu > dokunmatik joystick — çakışmazlar. Oyun kolu bağlanınca bildirim çıkar. Kol yokken tüm okumalar güvenle 0 döner.

## v15 — Oyun modları

- **Modlar (`GAME_MODES`, `js/modes.js`):** Başlangıç ekranında seçilir (localStorage'da kalıcı), run'ın kurallarını değiştirir:
  - **Normal** — klasik sonsuz hayatta kalma.
  - **Boss Yağmuru** — boss'lar çok sık (45sn), normal düşman yoğunluğu yarıya iner.
  - **Süre Saldırısı** — 5 dakika dayanınca "Hayatta Kaldın!" zaferi; biraz daha yoğun.
- Mod ayarları (`bossEvery`, `victoryTime`, `spawnScale`) `state.modeConfig`'e kopyalanır; spawner ve zafer kontrolü bunları kullanır.

## v14 — Başarımlar + kilit açma

- **Başarımlar (`ACHIEVEMENTS`, `js/achievements.js`):** Run sonunda değerlendirilir (`kills`, `timer`, `level`, `bossKills`, toplam altın). Örnekler: İlk Kan, Kıyıcı (100 öldürme), Katliam (500), Dayanıklı (5dk), Kaya Gibi (10dk), Tecrübeli (sv 20), Boss Avcısı, Zengin (300 altın). Kazanıldıkça localStorage'a yazılır ve bildirim çıkar.
- **Kilit açma:** Başarımlar karakter açabilir — **Büyücü** karakteri (Dönen Kalkanla başlar, güçlü ama narin) "Boss Avcısı" başarımıyla açılır. Kilitli karakterler başlangıç ekranında 🔒 ile pasif görünür.
- **Başarım listesi:** Başlangıç ekranında 🏆 Başarımlar panelinde tüm başarımlar ve tamamlanma durumu (✅/🔒) + sayaç.

## v13 — Atılma (dash) yeteneği

- **Dash (`DASH`, `js/main.js` + `input.js`):** **Boşluk** tuşu (masaüstü) veya alt-ortadaki ⚡ butonu (dokunmatik) ile hareket yönünde (yoksa bakış yönünde) kısa süreli hızlı hamle. Dash sırasında kısa **i-frame** (dokunulmazlık) vardır, yani düşman kümesinden sıyrılmak için kullanılır. Cooldown'lu; alt-ortadaki halka göstergesi cooldown dolunca yeşile döner.

## v12 — Level-up kolaylıkları (çevir / atla / kilitle / sil)

Seviye atlama ekranı Vampire Survivors tarzı kontrollerle zenginleşti (`LEVELUP_QOL`, `js/leveling.js`):

- **🎲 Yeniden Çevir:** Altın karşılığı (varsayılan 5) üç seçeneği yeniden üretir. Klavyede **R**.
- **Kilitle (🔒):** Bir seçeneği kilitler; yeniden çevirince o slot korunur, diğerleri değişir.
- **Sil (✖):** Bir seçeneği bu run'ın geri kalanında havuzdan çıkarır (run başına sınırlı hak).
- **Atla:** Seçim yapmadan geçer, küçük bir altın kazandırır.

Altın harcaması `Meta.spend` ile kalıcı mağaza altınından düşülür.

## v11 — Biyomlar

- **Biyomlar (`BIOMES`, `js/render.js`):** Her run başında rastgele bir biyom seçilir (Gece / Çöl / Buz Diyarı / Kan Bataklığı) ve başta bildirim çıkar. Arka plan rengi, ızgara ve engel renkleri biyoma göre değişir. Oynanışı etkilemez, görsel çeşitlilik katar.

## v10 — Karakter seçimi

- **Karakterler (`CHARACTERS`, `js/characters.js`):** Başlangıç ekranında 3 karakterden biri seçilir (tercih localStorage'da):
  - **Savaşçı** — dengeli, Kırbaçla başlar.
  - **Nişancı** — +%15 hız, −20 can, +%5 hasar; Fırlatan Bıçakla başlar.
  - **Tank** — +45 can, −%10 hız; Alan Hasarıyla başlar.
- Karakter modları oyuncunun stat fonksiyonlarına (Meta yükseltmelerinin yanında) eklenir; başlangıç silahı da karaktere göre değişir. Karakterlere `unlock` alanı verilerek başarımla kilitlenebilir (bkz. başarımlar).

## v9 — Duraklat menüsü + mini-harita

- **Duraklat:** Oyun sırasında sol üstteki ⏸️ butonu veya **ESC** / **P** tuşu oyunu duraklatır ("Duraklatıldı" ekranı + "Devam Et" / "Ana Menü"). Duraklatınca güncelleme durur, sahne donar, müzik susar; devam edince kaldığı yerden sürer. Yeni durum: `STATE.PAUSED`.
- **Mini-harita:** Sağ üstte tüm dünyayı özetleyen küçük harita — oyuncu (yeşil), düşmanlar (kırmızı), elit (sarı), boss (mor, büyük), sandıklar (altın) ve engeller. Kameradan/sarsıntıdan bağımsız çizilir.

## v8 — Düşman & pickup çeşitliliği

- **Yeni düşman davranışları (`ENEMY_DEFS`):**
  - **Bölünen (`splitter`, 90sn):** Ölünce birkaç küçük/zayıf düşmana ayrılır.
  - **Mesafeli (`ranged`, 150sn):** Tercih ettiği menzili korur (uzaksa yaklaşır, yakınsa uzaklaşır, menzildeyse yanlamasına kayar) ve oyuncuya nişan alıp mermi atar (düşman mermisi sistemi, boss'la ortak).
  - **Patlayan (`exploder`, 200sn):** Hızlı; ölünce yakındaysa oyuncuya alan hasarı verir + genişleyen patlama halkası.
- **Pickup'lar (`PICKUP_CONFIG`, `js/world.js`):** Düşman ölünce küçük olasılıkla düşer, üzerine yürüyünce etki eder:
  - **Can iksiri (➕):** Maks canın %30'unu iyileştirir.
  - **Bomba (💣):** Ekrandaki düşmanları yok eder (boss'a büyük hasar).
  - **Mıknatıs (🧲):** Haritadaki tüm elmasları oyuncuya çeker.

## v7 — Yeni silahlar

Toplam silah sayısı 3'ten 6'ya çıktı (`WEAPON_DEFS` + `fireWeapon` switch'i; her biri 5 seviye + evrim):

- **Dönen Kalkan (`orbit`):** Oyuncunun etrafında dönen top(lar); değdikleri düşmanlara hasar verir. Seviye arttıkça top sayısı/yarıçapı büyür. Evrim: **Yıldız Kalkanı** (Hareket Hızı maks → +2 top, daha büyük yarıçap, daha çok hasar).
- **Zincir Şimşek (`chain`):** En yakın düşmana vurur, oradan yakındaki düşmanlara sıçrar (her sıçramada hasar azalır). Evrim: **Fırtına Zinciri** (Maks. Can maks → +3 sıçrama, daha çok hasar).
- **Bumerang (`boomerang`):** En yakın düşmana fırlatılır, menzil sonunda oyuncunun güncel konumuna geri döner; gidiş-dönüş boyunca değdiği düşmanları deler (aynı düşmana kısa aralıkla). Evrim: **Çift Bumerang** (Toplama Yarıçapı maks → aynı anda 2 bumerang, daha çok hasar).

## v6 — Boss düşmanlar

- **Boss (`BOSS_DEF`, `js/enemies.js`):** Her `every` saniyede bir (varsayılan 180) ekran-dışından güçlü, iri, mor bir boss belirir ("⚠️ Boss geliyor!" bildirimi). Yüksek canı vardır, oyuncuya yürür ve periyodik olarak **tam çember (radyal) mermi saldırısı** yapar — oyuncuya hizalanır, bu yüzden boşluklardan sıyrılmak için hareket etmek gerekir. Stat'lar spawn anındaki zorluk ölçeğiyle çarpılır, geç bosslar daha ölümcüldür. Aynı anda tek boss olur.
- **Düşman mermileri:** Yeni `state.enemyProjectiles` sistemi — oyuncuya hasar veren kırmızı mermiler (i-frame'e saygılı, `applyPlayerDamage` ile temas hasarıyla ortak). Boss saldırısı bunu kullanır (ileride mesafeli düşmanlar da kullanacak).
- **Boss barı:** Ekranda boss varken alt-ortada sabit bir can barı çizilir (kameradan/sarsıntıdan bağımsız).
- **Ödül:** Boss öldürülünce altın (`goldReward`) + bir sandık + XP bırakır, güçlü parçacık patlaması ve ekran sarsıntısı olur.

## v5 — Kalıcı ilerleme (meta-progression)

- **Altın (`js/meta.js`, localStorage):** Her run sonunda performansa göre altın kazanılır (`öldürme·1 + saniye·0.2 + (seviye−1)·3`, "Altın Bulma" yükseltmesiyle çarpan; `GOLD_CONFIG`). Toplam altın cihazda saklanır.
- **Kalıcı yükseltme mağazası:** Başlangıç ekranındaki 🛒 Mağaza'da altın **run'lar arası kalıcı** yükseltmelere harcanır: Başlangıç Canı, Hasar, Hareket Hızı, Can Yenilenmesi, Altın Bulma (`META_UPGRADES`). Her seviyenin maliyeti üstel artar (`baseCost·costGrowth^seviye`). Bonuslar oyuncunun stat fonksiyonlarına (`getPlayerMaxHp/DamageMult/Speed/Regen`) eklenir; oyuncu her run'a bu kalıcı güçle ve tam (yükseltilmiş) canla başlar.
- **Ana Menü:** Game-over ekranında kazanılan altın gösterilir; "Ana Menü" butonu başlangıç ekranına dönüp mağazada harcama yapmayı sağlar ("Tekrar Oyna" ise doğrudan yeni run başlatır).
- Bozuk/eksik localStorage verisine karşı savunmacı okuma (parse hatası → varsayılan boş durum).

## v4 — En yüksek puanlar tablosu

- **Yerel skor tablosu (`js/scores.js`, localStorage):** Her run sonunda bir **puan** hesaplanır: `öldürme·10 + saniye·3 + (seviye−1)·20` (ağırlıklar `js/config.js` → `SCORE_CONFIG`). En yüksek 10 skor tarayıcıda saklanır. Backend yok — skorlar cihaz/tarayıcı başınadır.
- **Nerede görünür:** Başlangıç ekranında "En Yüksek Puanlar" tablosu (skor varsa) + "Skorları Temizle" butonu; game-over ekranında o an biten run'ın puanı, tüm zamanların rekoruysa **🏆 Yeni Rekor!** ya da kaçıncı sıraya girdiği, ve senin satırının vurgulandığı ilk-10 tablosu (sıra · puan · süre · seviye · öldürme).
- Bozuk/eksik localStorage verisine karşı okuma savunmacıdır (parse hatası → boş liste, oyun çökmez).

## v3 — Ses & görsel efektler

- **Ses (WebAudio, dosyasız):** Tüm sesler `js/sound.js` içinde çalışma anında sentezlenir — harici asset yok, build adımı yine yok. SFX'ler: düşman vuruşu/ölümü, oyuncu hasar alması, level-up, sandık, silah evrimi, bıçak atışı, game-over. Ayrıca A-minör tonda hafif, döngüsel bir arka plan müziği (lookahead scheduler ile zamanlanır). Aynı SFX çok sık tetiklenirse (yüzlerce düşman aynı anda ölürken) throttle edilir, gürültü makinesine dönüşmez. Desteklenmeyen/headless ortamda tüm ses çağrıları sessizce no-op olur.
- **Mobil ses:** iOS/Android tarayıcılarında AudioContext ancak bir kullanıcı jestiyle "unlock" edilirse ses çıkarır. Bu yüzden ilk dokunuş/tıklama/tuşta (`pointerdown`/`touchend`/`mousedown`/`keydown`) context resume edilip bir sessiz buffer çalınarak kilit açılır — böylece telefonda da sesler duyulur. (Not: iOS'ta cihazın fiziksel sessiz/zil anahtarı açıksa WebAudio sesleri yine kısılır; bu donanımsal, koddan aşılamaz.)
- **Efekt sesi ve müzik ayrı ayrı:** Sağ alttaki ⚙️ butonu, **efekt seslerini** ve **müziği** bağımsız açıp kapatan iki anahtarlı bir panel açar (ayrı gain düğümleri). **M** tuşu ikisini birden aç/kapatır. Her iki tercih de `localStorage`'a (`hk_sfx` / `hk_music`) yazılır, sonraki açılışta hatırlanır.
- **Görsel efektler (`js/effects.js`):** Düşman ölümünde renk uyumlu parçacık patlaması, vuruşta küçük kıvılcım, uçuşan hasar sayıları (elit vuruşları sarı/büyük), hasar alınca ekran kenarında kırmızı vinyet + kısa **ekran sarsıntısı** (elit ölümü ve sandıkta da hafif sarsıntı). Parçacık ve hasar-sayısı adetleri `js/config.js`'teki `EFFECTS` ile sert biçimde üst sınırlanır, böylece kalabalık sahnede bile kare hızı sabit kalır. `EFFECTS.showDamageNumbers = false` ile hasar rakamları tamamen kapatılabilir.

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
9. Telefonda oyun alanına parmakla basınca joystick tam o noktada beliriyor mu; parmağı sürükleyince karakter o yönde gidiyor, çekince joystick kaybolup hareket duruyor mu; UI butonlarına (dash/ayar/duraklat) basınca joystick çıkmıyor mu.
10. Seviye atlama seçenekleri dar ekranda alt alta dizilip dokunarak seçilebiliyor mu.

**v2 test:**

11. Haritada dağınık kayalar görünüyor mu, üzerlerinden geçilemiyor ama etraflarından dolaşılabiliyor mu; bir kayanın hemen arkasında durup düşmanların birikip birikmediğini, birkaç saniye içinde etrafından dolanıp dolanmadığını gözle.
12. Yaklaşık her 90 saniyede bir altın sandık beliriyor mu, üzerine yürüyünce can tam doluyor ve XP artıyor mu, bildirim görünüyor mu.
13. Bir silahı max seviyeye (5) ve eşleşen pasifi max sayıya (5) çıkarınca otomatik evrim gerçekleşiyor mu (bildirim + kırbaç tam çember vuruyor mu, bıçak aynı anda birden fazla düşmana gidiyor mu, aura oyuncunun canını yeniliyor mu).
14. Çoklu seviye atlama sırasında (bir sandık/elite öldürme sonrası) bildirimin level-up ekranının üstünde görünüp görünmediği.

**v3 test (ses & efektler):**

15. Başlat'a basınca müzik başlıyor mu; düşman öldürünce/vurunca, hasar alınca, level-up/sandık/evrimde farklı SFX'ler duyuluyor mu.
16. Sağ alttaki ⚙️ butonu ses ayar panelini açıyor mu; "Efektler" ve "Müzik" anahtarları bağımsız çalışıyor mu (biri kapalıyken diğeri açık kalabiliyor mu); **M** tuşu ikisini birden aç/kapatıyor mu; sayfa yenilenince tercihler hatırlanıyor mu. Telefonda ilk dokunuştan sonra sesler geliyor mu.
17. Düşman ölümünde parçacık, vuruşta hasar sayısı görünüyor mu; hasar alınca ekran kızarıp hafifçe sarsılıyor mu; elit ölümü/sandık daha belirgin sarsıyor mu.
18. Yoğun sahnede (çok sayıda düşman) efektler kare hızını düşürmüyor mu (adetler `EFFECTS` ile sınırlı).

**v4 test (skor tablosu):**

19. Öldükten sonra game-over ekranında bir puan görünüyor mu; ilk oyunda "🏆 Yeni Rekor!" çıkıyor mu.
20. Birkaç run oynayınca ilk-10 tablosu doluyor mu, sıralama puana göre azalan mı, en son run'ın satırı vurgulanıyor mu.
21. Sayfayı yenileyince skorlar başlangıç ekranında hatırlanıyor mu; "Skorları Temizle" hepsini silip tabloyu gizliyor mu.

**v5 test (kalıcı ilerleme):**

22. Öldükten sonra game-over ekranında "+N altın kazandın · Toplam: M" görünüyor mu; "Ana Menü" başlangıç ekranına dönüyor mu.
23. Başlangıç ekranında 🛒 Mağaza açılıp altınla yükseltme alınabiliyor mu; yeterli altın yoksa/maks seviyede buton pasif mi; alım sonrası altın düşüp seviye artıyor mu ve sayfa yenilenince kalıcı mı.
24. Yükseltme alınca sonraki run gerçekten daha güçlü mü başlıyor (örn. Başlangıç Canı alınca daha yüksek maks canla).

**v6 test (boss):**

25. ~180. saniyede "⚠️ Boss geliyor!" bildirimi ve iri mor boss beliriyor mu; alt-ortada boss can barı görünüyor mu (hızlı test için `BOSS_DEF.every` düşürülebilir).
26. Boss periyodik olarak çember şeklinde kırmızı mermi saçıyor mu; mermiler oyuncuya değince hasar veriyor mu (i-frame çalışıyor mu).
27. Boss ölünce altın + sandık + XP bırakıyor, güçlü patlama/sarsıntı oluyor mu.

**v7 test (yeni silahlar):**

28. Level-up seçeneklerinde Dönen Kalkan / Zincir Şimşek / Bumerang çıkıyor mu; alınınca çalışıyor mu (kalkan topları dönüp değince öldürüyor, şimşek düşmandan düşmana sıçrıyor, bumerang gidip geri dönüyor mu).
29. İlgili silah maks + eşleşen pasif maks olunca evrim (Yıldız Kalkanı / Fırtına Zinciri / Çift Bumerang) gerçekleşiyor mu.

**v8 test (düşman & pickup çeşitliliği):**

30. Zamanla bölünen (turuncu, ölünce parçalanan), mesafeli (mor, uzaktan mermi atan) ve patlayan (ölünce halka açan) düşmanlar beliriyor mu; mesafeli düşman mermileri hasar veriyor mu.
31. Düşman ölümlerinden ara sıra can iksiri (➕) / bomba (💣) / mıknatıs (🧲) düşüyor mu; üzerine gidince sırasıyla can dolduruyor, ekranı temizliyor, elmasları çekiyor mu.

**v9 test (duraklat + mini-harita):**

32. Oyun sırasında ⏸️ / ESC / P duraklatıyor mu; "Devam Et" kaldığı yerden sürdürüyor, "Ana Menü" başlangıca dönüyor mu; duraklatınca düşmanlar donuyor mu.
33. Sağ üstteki mini-harita oyuncu/düşman/boss/sandık konumlarını doğru gösteriyor mu.

**v10 test (karakter seçimi):**

34. Başlangıç ekranında 3 karakter görünüyor, seçilen vurgulanıp açıklaması değişiyor mu; seçim sayfa yenilenince hatırlanıyor mu.
35. Nişancı bıçakla + daha hızlı, Tank auraile + daha çok canla, Savaşçı kırbaçla başlıyor mu.

**v11 test (biyomlar):**

36. Her oyun başında farklı bir biyom bildirimi çıkıp arka plan/engel renkleri değişiyor mu.

**v12 test (level-up kolaylıkları):**

37. Seviye atlama ekranında Yeniden Çevir (altın düşüyor mu / R tuşu), Atla (+altın), her seçenekte 🔒 kilitle ve ✖ sil çalışıyor mu; kilitli seçenek yeniden çevirince kalıyor, silinen seçenek bir daha çıkmıyor mu.

**v13 test (dash):**

38. Boşluk (veya ⚡ butonu) hareket yönünde hızlı atılma yapıyor mu; atılma anında düşmandan hasar almıyor (i-frame) mu; alt-ortadaki halka cooldown dolunca yeşile dönüyor ve tekrar atılınabiliyor mu.

**v14 test (başarımlar):**

39. İlgili şartlar sağlanınca (ör. 100 öldürme, 5 dk, boss öldürme) run sonunda "🏆 <ad>" bildirimi çıkıyor mu; başlangıç ekranındaki 🏆 Başarımlar panelinde ✅ oluyor mu ve sayaç artıyor mu.
40. Boss öldürüp Boss Avcısı başarımını alınca Büyücü karakteri kilidi açılıp seçilebiliyor mu; sayfa yenilenince başarımlar/kilit açılışı hatırlanıyor mu.

**v15 test (oyun modları):**

41. Başlangıç ekranında mod seçici çalışıyor mu; Boss Yağmuru'nda boss'lar çok sık gelip normal düşman azalıyor mu; Süre Saldırısı'nda ~5 dakikada "Hayatta Kaldın!" ekranı çıkıyor mu.

**v16 test (gamepad):**

42. Oyun kolu bağlanınca bildirim çıkıyor mu; sol analog/D-pad ile hareket, A/RB/RT ile dash çalışıyor mu; klavye/kol/dokunmatik çakışmadan çalışıyor mu.

**v17 test (özet + düzeltmeler):**

43. Game-over ekranında Hasar/sn, toplam hasar ve en etkili silah görünüyor mu.
44. Telefonda (özellikle yatay/kısa ekran) seviye atlama seçenekleri ekrana sığıyor / kaydırılabiliyor mu.
45. Patlayan düşmanlar artık daha makul mü (patlama daha az can götürüyor mu).

**v18 test (zırh + kritik):**

46. Mağazadan Zırh alınca gelen hasar azalıyor mu; Kritik Şans alınca ara sıra turuncu "x2!" hasar sayıları çıkıyor mu.

**v21–v24 test:**

47. Combo: art arda öldürünce üst-ortada çarpan yükseliyor, hasar alınca/süre dolunca sıfırlanıyor; skor/altın artıyor mu.
48. Biyom tehlikeleri: Çöl'de görüş dar, Buz'da zemin kaygan, Bataklık'ta yavaş mı; run başı bildirim tehlikeyi yazıyor mu.
49. Mağazadan Yoldaş alınca eşlikçi çıkıp düşmanlara ateş ediyor, oyuncuyu takip ediyor mu.
50. Başlangıç ekranında 📈 Kariyer paneli ömür boyu toplamları gösteriyor, her oyundan sonra artıyor mu.

## v14 sonrası hâlâ kapsam dışı

Farklı oyun modları (boss rush / süre saldırısı), çevrimiçi skor tablosu, gamepad desteği, animasyonlu sprite'lar.
