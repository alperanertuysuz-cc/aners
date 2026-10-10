# SAHA 27

Tarayıcıda çalışan, ücretsiz 3D futbol oyunu. Kurulum yok, hesap yok. İlk açılıştan sonra internet olmadan da açılır (PWA).

EA SPORTS FC 27 Lite'ın ücretsiz sürümde kapattığı şeyleri hedefler: kariyer ligi, ek modlar, yerel 2 oyuncu, takım editörü. Grafik ve fizik AAA seviyesinde değil; avantajı erişilebilirlik ve mod çeşitliliği.

## Modlar

| Mod | İçerik |
| --- | --- |
| Hızlı Maç | 16 kurgusal takım, 4 diziliş, 4 zorluk, 3/5/8/12 dk, gece/gündüz, beraberlikte penaltı seçeneği. 1P, 2P (rakip veya aynı takım) ya da CPU vs CPU izleme. |
| Kariyer | 16 takımlı tek devre lig (15 hafta). Kendi maçını oyna ya da simüle et. Puan tablosu, form, haftalık sonuçlar, gol krallığı. `localStorage`'da saklanır. |
| Sokak 5v5 | Kafes saha, duvardan sekme, taç/korner yok. Maç başı ~8 gol. |
| Penaltı Atışları | Nişan + güç çubuğu, kalecide yön tutup vuruşta atlama, ani ölüm. |
| Antrenman | Sen, takım arkadaşların ve rakip kaleci. |
| Takım Editörü | Takım adı, kısaltma, forma renkleri ve deseni, kaleci forması, oyuncu adları ve numaraları. |

## Oynanış sistemleri (`js/sim.js`)

- Top fiziği: yerçekimi, hava sürtünmesi, yuvarlanma sürtünmesi, falso (Magnus), sekme, direk/üst direk çarpması, file içinde top tutma.
- Pas / ara pas / orta (havadan) / şut: basılı tut-bırak güç sistemi, stick yönüne göre alıcı seçimi, ilk dokunuşta vuruş (tuşu top gelmeden bırak), kafa vuruşları, voleler.
- Savunma: baskı (pas basılı), müdahale, kayarak müdahale, takım arkadaşını baskıya çağırma, otomatik/manuel oyuncu değiştirme.
- Kaleci: açı kapatma, plonjon (görsel ve temas kapsülü aynı geometri), yakalama/çelme, köşeye çelme, 1'e 1 çıkış, topu elden/ayaktan dağıtma, geri pas kuralı.
- Kurallar: taç, korner, kale vuruşu, frikik (baraj dahil), ofsayt, faul, sarı/kırmızı kart, oyun içi penaltı, devre arası taraf değişimi.
- Yapay zekâ: diziliş tabanlı pozisyon alma, adam markajı, destek koşuları, ofsayt çizgisine göre derin koşular, xG tabanlı şut kararı, pas başarı tahmini, dripling güvenliği, zorluk seviyesine göre tepki/hata/baskı.

## Kontroller

Klavye (tek oyuncu): `WASD`/yön tuşları hareket · `J`/`Boşluk` pas · `K` şut · `L` ara pas · `I` orta · `Shift` sprint · `Q` oyuncu değiştir · `Esc` duraklat. Ok tuşu kullananlar için `X C V Z` eşdeğerleri var.
Gamepad: A pas · B şut · Y ara pas · X orta · RT sprint · LB değiştir · Start duraklat.
İki oyuncu ve dokunmatik kontroller oyun içindeki Kontroller ekranında.

## Dosyalar

```
index.html           ekranlar + HUD iskeleti, three.js importmap (jsDelivr, three@0.180.0)
app.css              arayüz
js/main.js           ekran akışı, kariyer, editör, ayarlar, HUD, tekrar, oyun döngüsü
js/sim.js            maç motoru (DOM/three bağımsız, Node'da çalışır)
js/render.js         stadyum / sokak sahası, oyuncu iskeletleri, kameralar
js/input.js          klavye, gamepad, dokunmatik
js/audio.js          prosedürel ses (WebAudio, ses dosyası yok)
js/data.js           takımlar, kadrolar, dizilişler, zorluk tabloları
sw.js, manifest      çevrimdışı çalışma
tools/sim-test.mjs   başsız CPU-CPU maç testi
tools/human-test.mjs insan kontrol yollarını senaryolu bot ile test eder
```

## Çalıştırma ve test

Yerel sunucu: `npx serve saha27` (ES modülleri `file://` ile açılmaz).

```
node tools/sim-test.mjs 12 11 pro    # 12 maç, 11v11
node tools/sim-test.mjs 8 5 pro      # sokak 5v5
node tools/human-test.mjs 6 11       # 1P/2P, penaltılar, duran toplar
```

Son ölçüm (5 dk maç, CPU-CPU, Profesyonel): maç başı ~2 gol, ~7 şut, ~97 pas, %68 pas isabeti, 0 takılma. Sokak 5v5: ~8 gol.

## Bilinen sınırlar

- Oyuncu modelleri prosedürel (ilkel geometri), motion-capture animasyon yok.
- Tüm kulüp ve oyuncu isimleri kurgusal; gerçek isimler editörden girilebilir.
- Grafik testleri GPU'suz yazılım render ile yapıldı; gerçek cihaz FPS'i ölçülmedi.
