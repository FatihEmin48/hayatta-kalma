# Hayatta Kalma

Üstten görünümlü, otomatik saldırılı bir horde-survival tarayıcı oyunu (Vampire Survivors tarzı). Saf HTML5 Canvas + vanilla JavaScript, framework yok, build adımı yok.

Mimari ve tasarım kararlarının tam dökümü için `PLAN.md` dosyasına bakın.

## Nasıl çalıştırılır

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

`#game-wrap` (canvas + HUD + joystick) ekran boyutuna göre `transform: scale()` ile bütün olarak küçültülüyor, bu yüzden telefonda da orantılı görünür. Dokunmatik cihaz tespit edilince (`navigator.maxTouchPoints` / `ontouchstart`) sol alt köşede otomatik bir sanal joystick beliriyor; klavye her zaman önceliklidir (ikisi çakışmaz). Bu, bu ortamda gerçek bir telefon/tarayıcıda test edilemedi — aşağıdaki checklist'e mobil adımları da eklendi.

## Bu ortamda yapılan doğrulama

Bu geliştirme ortamında görsel tarayıcı testi mümkün değildi, bu yüzden şunlar yapıldı:
- Her `js/*.js` dosyası `node --check` ile sözdizimi açısından doğrulandı.
- Saf yardımcı fonksiyonlar (`pickRandomUnique`, `xpToNextLevel`, `circleHit`) `node -e` ile sağlandı.
- Tüm oyun, Node'un `vm` modülüyle DOM'u taklit eden bir "headless" ortamda gerçekten çalıştırılıp simüle edildi (bkz. bulgular aşağıda) — bu, gerçek bir tarayıcı testinin yerini tutmaz ama mantık hatalarını (ReferenceError, yanlış state geçişleri vb.) yakalamak için kullanıldı.

**Headless simülasyon bulguları:**
- Oyun döngüsü, kamera, düşman spawn/steering, silah hasarı, XP/gem toplama, çoklu seviye atlama kuyruğu (`pendingLevelUps`) ve GAME_OVER geçişi hatasız çalıştı.
- Temas hasarı + i-frame mekaniği doğrulandı: `performance.now()` ile senkron bir sanal saat kullanıldığında, oyuncu çevresini saran çok sayıda düşman olsa bile hasar her ~600ms'de bir kez uygulanıyor (beklenen davranış).
- Not: Headless testte oyuncu hiç hareket etmiyor (sabit bot), bu yüzden ölüm süresi (~17sn) gerçek bir insan oyuncunun performansını yansıtmaz — bu tür oyunlarda hayatta kalmanın temeli sürekli hareket/kaçınmadır. Gerçek "oyun hissi" ve zorluk dengesi için aşağıdaki manuel test şart.

## Manuel test checklist (tarayıcıda, senin yapman gereken)

1. Start ekranı → "Oyunu Başlat" → oyuncu görünür, WASD/ok tuşlarıyla kamera dünyada kayar.
2. Kırbaç (başlangıç silahı) birkaç saniye içinde yakındaki düşmanlara vurup öldürür; gem'ler toplama menziline girince oyuncuya uçar.
3. Bir düşmana değmek HP düşürür; bir küme içinde ~1sn durmak HP'yi anında sıfırlamaz (i-frame).
4. XP bar dolunca oyun durup tam 3 farklı seçenek gösterir; tıklama veya 1/2/3 ile seçim uygulanıp oyun devam eder; bir silah max seviyeye ulaşınca artık önerilmiyor.
5. Düşman kümesinde HP sıfırlanınca GAME_OVER ekranı (süre/seviye/öldürme istatistiği) çıkar, "Tekrar Oyna" temiz reset yapar.
6. Zamanla `fast` (~60sn), `tank` (~120sn) düşmanları ve elite'lerin (~180sn) sırayla belirdiği, spawn yoğunluğunun arttığı gözlemlenir (hızlı test için `js/config.js`'teki `unlockAt`/`rampSeconds`/`ELITE_DEF.every` değerleri geçici kısaltılabilir).
7. Genel "oyun hissi": `js/config.js` içindeki sayılar (hasar, cooldown, spawn hızı) ilk oynanışta muhtemelen ince ayar isteyecektir — bu adım gerçek oynanış gerektirir, kod incelemesiyle yapılamaz.

**Mobil test (telefonda, aynı Wi-Fi ağındaysan `http://<bilgisayarının-ip'si>:8000` ile erişebilirsin):**

8. Sayfa telefon ekranına sığacak şekilde küçülüyor mu, taşma/scroll oluyor mu kontrol et.
9. Sol alt köşede joystick görünüyor mu (masaüstünde görünmemeli, sadece dokunmatik cihazda).
10. Joystick'e parmağını koyup sürükleyince karakter o yönde hareket ediyor mu, parmağını çekince duruyor mu.
11. Klavyesi olmayan telefonda seviye atlama seçimini dokunarak (tıklama) seçebiliyor musun.

## v1 kapsamı dışında bırakılanlar

Silah evrimleri/birleşimleri, localStorage ile kalıcı meta-ilerleme, engel/terrain çarpışması, sandık/hazine odaları, ses/müzik.
