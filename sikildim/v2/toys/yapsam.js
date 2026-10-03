/* Ne yapsam? — fikir destesi */
(() => {
'use strict';
const CATS = { yarat: 'Yarat', hareket: 'Hareket', disari: 'Dışarı', ogren: 'Öğren', kafa: 'Kafa', rahatla: 'Rahatla', sosyal: 'Sosyal' };
const TIMES = { hepsi: ['Hepsi', () => true], hemen: ['10 dk’ya kadar', m => m <= 10, '≤ 10 dk'], biraz: ['15–30 dk', m => m > 10 && m <= 30], uzun: ['1 saat+', m => m > 30] };
const IDEAS = [
  ['yarat', 5, 'Gözlerini kapat ve bir dakikada kendi portreni çiz. Sonra aç ve sonuca gül.'],
  ['yarat', 15, 'Odadaki üç rastgele eşyayı birleştirip bir ürün icat et. Adını ve reklam sloganını da yaz.'],
  ['yarat', 10, 'Bugün başına gelen en sıradan şeyi, epik bir film fragmanının anlatıcısı gibi yaz.'],
  ['yarat', 20, 'Telefonla tek bir renkte on fotoğraf çek. Hepsi kırmızı ya da hepsi mavi.'],
  ['yarat', 5, 'Kalemi kâğıttan hiç kaldırmadan, tek çizgiyle bir hayvan çiz.'],
  ['yarat', 15, 'Var olmayan bir ülkenin bayrağını tasarla ve tek cümleyle hikâyesini anlat.'],
  ['yarat', 10, 'Altı kelimelik bir hikâye yaz. Ne bir kelime fazla, ne bir kelime eksik.'],
  ['yarat', 20, 'Bir A4’ü sekiz kareye katla ve her kareye bir sahne çiz. İşte kendi mini çizgi romanın.'],
  ['yarat', 15, 'Kâğıda otuz daire çiz ve her birini başka bir şeye dönüştür: saat, top, gezegen, yüz.'],
  ['yarat', 15, 'Bildiğin bir masalı kötü karakterin gözünden yeniden anlat.'],
  ['yarat', 15, 'Bir yıl sonraki kendinden bugünkü sana kısa bir mektup yaz.'],
  ['yarat', 60, 'Evdeki malzemelerle daha önce hiç denemediğin bir tarif dene.'],
  ['yarat', 15, 'Sevdiğin bir şarkının davul kalıbını Ritim’de kurmaya çalış.', 'ritim'],
  ['yarat', 10, 'Kaleydoskop’ta tek bir renk paletiyle, sadece yavaş çizgiler kullanarak bir desen yap.', 'kaleydoskop'],
  ['hareket', 5, 'Sevdiğin bir şarkıyı aç ve şarkı bitene kadar dans et. Kimse bakmıyor.'],
  ['hareket', 5, '20 squat, 10 şınav, 30 saniye plank. Bitince bir bardak su.'],
  ['hareket', 10, 'Merdivenleri üç kez in, üç kez çık.'],
  ['hareket', 5, 'Gözlerin kapalıyken tek ayak üstünde 30 saniye dur. Sonra diğer ayak.'],
  ['hareket', 5, 'Boynunu, omuzlarını ve bileklerini yavaşça çevir. Kaç saattir oturduğunu düşün.'],
  ['hareket', 10, 'Bir çorabı top yap ve duvara elli kez at, tut.'],
  ['hareket', 30, 'Üç portakalla jonglörlüğe başla. İlk hedef: iki topla on atış.'],
  ['disari', 15, 'On dakikalık bir yürüyüşe çık ve yolda beş farklı ağaç, kuş ya da kedi say.'],
  ['disari', 30, 'Hiç girmediğin bir sokağa sap. Sırf merak ettiğin için.'],
  ['disari', 20, 'Yakındaki fırından sıcak bir şey al ve soğumadan ye.'],
  ['disari', 5, 'Pencereden bulutlara bak ve birinin neye benzediğine karar ver.'],
  ['disari', 30, 'Bir parka git ve on dakika hiçbir şey yapmadan otur. Telefon cepte kalsın.'],
  ['disari', 60, 'Bugün güneşin kaçta batacağına bak ve izleyebileceğin bir yer bul.'],
  ['disari', 60, 'Hiç gitmediğin bir semte git ve ilk gördüğün yerde bir şey iç.'],
  ['ogren', 10, 'Bilmediğin bir dilde “merhaba”, “teşekkürler” ve “bu ne kadar?” demeyi öğren.'],
  ['ogren', 60, 'Rubik küpün ilk katmanını çözmeyi öğren. Gerisi sonra.'],
  ['ogren', 20, 'Elindeki sıradan bir eşyanın nasıl üretildiğini araştır: kalem, ayakkabı, gözlük.'],
  ['ogren', 20, 'İki farklı kâğıt uçak katla ve hangisinin daha uzağa gittiğini test et.'],
  ['ogren', 15, 'Bir takımyıldızın şeklini öğren ve bu akşam gökyüzünde bulmaya çalış.'],
  ['ogren', 30, 'Sevdiğin bir şarkının sözlerini, ikinci kıtası dahil ezberle.'],
  ['ogren', 10, 'Adını Mors alfabesiyle yazmayı öğren.'],
  ['ogren', 15, 'Kâğıttan bir turna katla.'],
  ['ogren', 30, 'Bir enstrümanda tek bir ritim ya da akor öğren. Masa da bir enstrümandır.'],
  ['kafa', 5, '1’den 100’e kadar olan sayıların toplamını kâğıtsız bul. İpucu: uçları eşleştir.'],
  ['kafa', 10, 'Alfabedeki her harfle başlayan bir şehir say. Ğ’de takılırsan normal, öyle bir şehir yok.'],
  ['kafa', 5, 'Gözlerini kapat ve evinin planını kafanda çiz. Kaç pencere var? Sonra gidip say.'],
  ['kafa', 5, 'Kafandan 2’nin kuvvetlerini say: 2, 4, 8, 16… Nerede takıldın?', '2048'],
  ['kafa', 10, 'Bugün yaptığın her şeyi tersten, akşamdan sabaha doğru hatırla.'],
  ['kafa', 15, 'Uzun bir kelime seç ve harflerinden kaç yeni kelime türetebildiğini dene.'],
  ['kafa', 5, 'Refleks’te 250 milisaniyenin altına inmeyi dene.', 'refleks'],
  ['kafa', 10, 'Hızlı yaz’da 30 saniyelik testte kendi rekorunu kır.', 'yaz'],
  ['rahatla', 15, 'Bir çay ya da kahve demle ve hiçbir ekrana bakmadan iç.'],
  ['rahatla', 60, 'Sevdiğin bir albümü baştan sona, hiç atlamadan dinle.'],
  ['rahatla', 30, 'Telefonu başka odaya bırak ve yirmi dakika kitap oku.'],
  ['rahatla', 5, 'Kutu nefesi dene: dört saniye al, dört tut, dört ver, dört bekle. Beş tur.', 'nefes'],
  ['rahatla', 20, 'Masanı tamamen boşalt, sil ve sadece gerçekten kullandığın şeyleri geri koy.'],
  ['rahatla', 5, 'Pencereyi aç, gözlerini kapat ve duyduğun beş farklı sesi say.'],
  ['rahatla', 10, 'On dakika boyunca sadece balon patlat. Düşünmek yasak.', 'patlat'],
  ['rahatla', 30, 'Kısa bir uyku çek. En fazla yirmi dakika, alarmı kur.'],
  ['sosyal', 5, 'Uzun zamandır konuşmadığın birine “aklıma geldin” diye yaz.'],
  ['sosyal', 15, 'Ailenden birine çocukken en çok neyi sevdiğini sor.'],
  ['sosyal', 60, 'Bir arkadaşınla aynı filmi aynı anda başlatın ve mesajlaşarak birlikte izleyin.'],
  ['sosyal', 30, 'Birine kâğıda, el yazısıyla gerçek bir mektup yaz.'],
  ['sosyal', 10, 'Bir arkadaşına sadece emojilerle bir film anlat ve tahmin etmesini bekle.'],
  ['sosyal', 15, 'Biriyle kelime zinciri oyna: son harfle yeni kelime. Takılan kaybeder.'],
  ['sosyal', 30, 'Bir arkadaşına en sevdiği üç filmi sor ve birini bu hafta izle.'],
  /* v2 — appended only. V1 stores done ideas by index in 'ys-done', so never reorder or edit the entries above. */
  ['yarat', 10, 'Melodi’de sadece beş kare kullanarak bir zil sesi yap. Kısa olsun, akılda kalsın.', 'melodi'],
  ['yarat', 15, 'Evdeki bir eşyanın ağzından kısa bir şikâyet mektubu yaz: buzdolabı, çorap ya da uzaktan kumanda.'],
  ['yarat', 20, 'Bir yaprağı kâğıdın altına koy ve üstünü kurşun kalemle tara. Çıkan izden bir yaratık çiz.'],
  ['yarat', 30, 'Eski bir dergiden harfler kes ve alışveriş listeni fidye notu gibi yapıştır.'],
  ['yarat', 60, 'Karton kutular, kâğıt rulolar ve bantla bir bilye pisti kur. Bilye yoksa nohut da olur.'],
  ['hareket', 5, 'Yere bir kemer ser ve üstünde ip cambazı gibi yürü: her adımda topuk öbür ayağın burnuna değsin.'],
  ['hareket', 5, 'Tek ayak üstünde dur ve havadaki ayağının bağcığını çözüp yeniden bağla. Sonra ayak değiştir.'],
  ['hareket', 10, 'Yere bir kâğıt koy, sadece ayak parmaklarınla buruşturup top yap. Sonra öbür ayakla geri aç.'],
  ['hareket', 10, 'Yılan’da her kaybettiğinde kalk ve on kez zıpla. Dikkatli oynamak için güzel bir sebep.', 'yilan'],
  ['hareket', 15, 'Bir balon şişir ve yere düşürmeden yüz kez havaya vur. Eller, dizler, kafa: hepsi serbest.'],
  ['hareket', 30, 'Sevdiğin beş şarkıdan bir liste yap ve liste bitene kadar evi topla. Şarkı atlamak yasak.'],
  ['disari', 15, 'Beş farklı yaprak topla ve büyükten küçüğe diz. En tuhaf şekilli olanı sakla.'],
  ['disari', 20, 'Yürürken tabelalarda alfabeyi sırayla bul: A, B, C… Ğ için kelimenin içi de sayılır.'],
  ['disari', 20, 'Yerdeki dokuların fotoğrafını çek: rögar kapakları, parke taşları, çatlaklardaki yosun.'],
  ['disari', 30, 'Her köşede yazı tura at: yazı sağ, tura sol. Yirmi dakika sonra nereye çıktığına bak.'],
  ['disari', 30, 'Pazara ya da manava git ve daha önce hiç tatmadığın bir meyve ya da sebze al.'],
  ['disari', 60, 'Bir otobüse ya da vapura bin, hattın sonuna kadar git ve geri dön. Cam kenarı şart.'],
  ['ogren', 10, 'Komşu illerin plaka kodlarını öğren. Sonra yoldaki arabaların nereden geldiğini plakasından bul.'],
  ['ogren', 10, 'El gölgesiyle kuş, köpek ve tavşan yapmayı öğren. Bir lamba ve boş bir duvar yeter.'],
  ['ogren', 15, 'Üç farklı düğüm öğren ve gözlerin kapalıyken atmayı dene. Bir ayakkabı bağcığı yeter.'],
  ['ogren', 15, 'Türk İşaret Dili’nde 1’den 10’a kadar saymayı öğren.'],
  ['ogren', 30, 'Bir kart hilesi öğren ve birine göster. Sırrı söylemek yok.'],
  ['kafa', 5, 'Günün kelimesini Kelime’de en fazla dört denemede bulmaya çalış.', 'kelime'],
  ['kafa', 5, 'Bir dakikada “ka” ile başlayan kaç kelime sayabilirsin? Sonra aynısını “ke” ile dene.'],
  ['kafa', 5, '100’den başla ve yedişer yedişer geri say: 93, 86, 79… Takılmadan 2’ye inebilecek misin?'],
  ['kafa', 10, 'Hafıza’da 10 adımlık bir diziyi hatasız tekrarlamayı dene. Sonra Zor seviyeye geç.', 'hafiza'],
  ['kafa', 10, 'Akrep ile yelkovan bir günde kaç kez üst üste biner? Önce tahmin et, sonra kâğıtta hesapla.'],
  ['kafa', 15, 'Kâğıda üçe üç dizilmiş dokuz nokta çiz. Kalemi kaldırmadan, dört düz çizgiyle hepsinden geç.'],
  ['rahatla', 5, 'Nefes’te Sakin ritmini ve 1 dk’lık seansı seç, gözlerini kapat. Zil çalınca açarsın.', 'nefes'],
  ['rahatla', 10, 'Bir parça çikolatayı çiğnemeden, ağzında eriyene kadar bekle. Acele etmek yok.'],
  ['rahatla', 10, 'Patlat’ta balon boyunu Küçük’e al ve bir sayfayı acele etmeden, baştan sona patlat.', 'patlat'],
  ['rahatla', 15, 'Bir leğene ılık su doldur, ayaklarını sok ve on dakika öylece otur.'],
  ['rahatla', 20, 'Galeride tam bir yıl öncesine git ve o günden bir fotoğrafa uzun uzun bak.'],
  ['rahatla', 30, 'Evdeki bir yapbozu çıkar ve sadece kenarlarını tamamla. Ortası başka güne.'],
  ['sosyal', 5, 'Yanındakiyle Düello’da üç el XOX oyna. Kaybeden çayları demlesin.', 'duello'],
  ['sosyal', 10, 'Birine “bugün seni ne güldürdü?” diye sor ve cevabı gerçekten dinle.'],
  ['sosyal', 10, 'Ailene ya da arkadaş grubuna tek bir soru at: “Çocukken ne olmak istiyordun?” Cevapları topla.'],
  ['sosyal', 15, 'Bugün başına gelen sıradan bir olayı, maç spikeri heyecanıyla sesli mesaj olarak birine anlat.'],
  ['sosyal', 30, 'Bir tabak kurabiye ya da meyve hazırla ve komşuna götür. Sebebi yok, öyle.'],
  ['sosyal', 60, 'Birini bir saatlik yürüyüşe davet et. Telefonlar cepte, konu serbest.'],
];
const validDone = () => { const d = store.get('ys-done', []); return Array.isArray(d) ? d.filter(i => Number.isInteger(i) && i >= 0 && i < IDEAS.length) : []; };

registerToy('yapsam', {
  name: 'Ne yapsam?', color: 'yellow', cf: 'on-light', kind: 'Fikir', open: 'Ne yapsam’ı aç',
  cats: ["kafa"],
  desc: `${IDEAS.length} fikirlik bir deste. Beğenmediğini kaydır, gerisini yap.`,
  art: '<div class="art-cards"><i></i><i></i><i>?</i></div>',
  stat: () => { const done = validDone().length; return done ? `${done} / ${IDEAS.length} fikir yapıldı` : `${IDEAS.length} fikir`; },
  css: `
.art-cards { position: relative; width: 64px; height: 84px; }
.art-cards i {
  position: absolute; inset: 0; border-radius: 11px; background: var(--paper);
  box-shadow: 0 8px 16px -8px rgba(0, 0, 0, .3); transition: transform .55s var(--spring);
}
.art-cards i:nth-child(1) { transform: rotate(-13deg) translateX(-24px); opacity: .7; }
.art-cards i:nth-child(2) { transform: rotate(10deg) translateX(22px); opacity: .85; }
.art-cards i:nth-child(3) { display: grid; place-items: center; font: 800 42px/1 var(--f-display); font-style: normal; color: var(--on-light); }
.tile:hover .art-cards i:nth-child(1) { transform: rotate(-22deg) translate(-40px, 6px); }
.tile:hover .art-cards i:nth-child(2) { transform: rotate(18deg) translate(38px, 6px); }
.tile:hover .art-cards i:nth-child(3) { transform: translateY(-6px) rotate(-3deg); }

.yapsam-root .ys-filters { display: grid; justify-items: center; gap: 10px; width: 100%; }
.yapsam-root .ys-time { max-width: 100%; }
.yapsam-root .ys-time button { padding: 0 12px; white-space: nowrap; }
.yapsam-root .ys-short { display: none; }
@media (max-width: 420px) {
  .yapsam-root .ys-time button { padding: 0 10px; }
  .yapsam-root .ys-long { display: none; }
  .yapsam-root .ys-short { display: inline; }
}
.yapsam-root .deck { position: relative; width: min(100%, 640px); height: clamp(250px, 46vh, 430px); }
.yapsam-root .deck-ghost { position: absolute; inset: 0; border-radius: var(--r-xl); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.yapsam-root .deck-ghost.g1 { transform: translateY(12px) scale(.955) rotate(1.6deg); }
.yapsam-root .deck-ghost.g2 { transform: translateY(24px) scale(.91) rotate(-2.2deg); background: var(--panel-2); }
.yapsam-root .idea {
  position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; gap: 12px;
  padding: clamp(20px, 3vw, 32px); border-radius: var(--r-xl); background: var(--c); color: var(--cf);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35), 0 22px 44px -26px var(--shade);
  touch-action: pan-y; user-select: none; -webkit-user-select: none; cursor: grab;
}
.yapsam-root .idea.dragging { cursor: grabbing; }
.yapsam-root .idea.leaving { z-index: 3; pointer-events: none; }
.yapsam-root .idea-top { display: flex; justify-content: space-between; gap: 12px; opacity: .75; }
.yapsam-root .idea-text { margin-block: auto; max-width: 22ch; font-size: clamp(24px, 3.3vw, 38px); font-weight: 650; line-height: 1.1; letter-spacing: -.025em; }
.yapsam-root .idea-text.long { max-width: 25ch; font-size: clamp(22px, 3vw, 34px); }
@media (max-height: 640px) { .yapsam-root .idea-text { font-size: 21px; } .yapsam-root .idea-text.long { font-size: 19px; } }
.yapsam-root .idea-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; }
.yapsam-root .idea-no { opacity: .6; margin-left: auto; }
.yapsam-root .idea-link {
  display: inline-flex; align-items: center; gap: 8px; min-width: 0; height: 44px; padding: 0 16px; border-radius: 999px;
  background: var(--on-light); color: var(--paper); font-size: 15px; font-weight: 600; text-decoration: none; white-space: nowrap;
  transition: transform .3s var(--spring);
}
.yapsam-root .idea-link:hover { transform: translateX(3px); }
.yapsam-root .idea-link:active { transform: scale(.96); }
.yapsam-root .idea-link i { flex: none; width: 10px; height: 10px; border-radius: 3px; background: var(--lc); }
.yapsam-root .idea-link span:first-of-type { overflow: hidden; text-overflow: ellipsis; }
.yapsam-root .stamp {
  position: absolute; top: 24%; right: clamp(16px, 4vw, 40px); padding: 8px 16px; border: 3.5px solid currentColor; border-radius: 12px;
  font: 800 clamp(22px, 3vw, 30px)/1 var(--f-mono); letter-spacing: .06em; opacity: 0; transform: rotate(-10deg);
}
.yapsam-root .ys-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.yapsam-root .ys-empty { display: grid; place-content: center; gap: 16px; text-align: center; justify-items: center; }
@media (max-width: 359px) {
  .yapsam-root .ys-actions .btn { padding: 0 16px; }
  .yapsam-root .chips .chip { padding: 0 10px; font-size: 13.5px; }
}
@media (max-height: 640px) {
  .yapsam-root { gap: 10px; }
  .yapsam-root .deck { height: clamp(220px, 40vh, 430px); }
}
`,
  hint: 'Boşluk başka · Y yaptım · kartı kaydır',
  mount(el) {
    let time = store.get('ys-time', 'hepsi'), cat = store.get('ys-cat', 'hepsi');
    if (!TIMES[time]) time = 'hepsi';
    if (cat !== 'hepsi' && !CATS[cat]) cat = 'hepsi';
    const done = new Set(validDone());
    const timeBtn = ([k, [label, , short]]) => `<button type="button" data-time="${k}" aria-pressed="${k === time}">${short ? `<span class="ys-long">${label}</span><span class="ys-short">${short}</span>` : label}</button>`;
    el.innerHTML = `
      <div class="toy yapsam-root">
        <div class="ys-filters">
          <div class="seg ys-time" role="group" aria-label="Süre">${Object.entries(TIMES).map(timeBtn).join('')}</div>
          <div class="chips" role="group" aria-label="Tür">${[['hepsi', 'Hepsi'], ...Object.entries(CATS)].map(([k, label]) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === cat}">${label}</button>`).join('')}</div>
        </div>
        <div class="deck" id="ys-deck"><div class="deck-ghost g2"></div><div class="deck-ghost g1"></div></div>
        <div class="ys-actions">
          <button type="button" class="btn" id="ys-done">Bunu yaptım <kbd>Y</kbd></button>
          <button type="button" class="btn primary" id="ys-next">Başka bir şey <kbd>Boşluk</kbd></button>
        </div>
        <p class="mono note" id="ys-meta"></p>
      </div>`;
    const deck = $('#ys-deck', el), meta = $('#ys-meta', el), doneBtn = $('#ys-done', el);
    let order = [], pos = 0, card = null, curIdx = -1, busy = false, drag = null, doneT = 0;
    const pool = () => IDEAS.map((_, i) => i).filter(i => { const [c, m] = IDEAS[i]; return (cat === 'hepsi' || c === cat) && TIMES[time][1](m) && !done.has(i); });
    const timeLabel = m => m >= 60 ? `${m / 60} saat` : `${m} dk`;
    function updateMeta() { meta.textContent = `Bu filtrede ${pool().length} fikir · ${done.size} yapıldı`; doneBtn.disabled = curIdx < 0; }
    function makeCard(i) {
      const [c, m, text, link] = IDEAS[i];
      const a = document.createElement('article'); a.className = 'idea';
      a.innerHTML = `<header class="idea-top mono"><span></span><span></span></header><p class="idea-text"></p><footer class="idea-foot"><span class="mono idea-no"></span></footer>`;
      a.querySelector('.idea-top span:first-child').textContent = CATS[c];
      a.querySelector('.idea-top span:last-child').textContent = timeLabel(m);
      const tx = a.querySelector('.idea-text'); tx.textContent = text; if (text.length > 80) tx.classList.add('long');
      a.querySelector('.idea-no').textContent = `№ ${String(i + 1).padStart(2, '0')}`;
      const lt = link ? TOYS[link] : null;   // a toy that failed to load is simply not linked
      if (lt && lt.open) {
        const l = document.createElement('a'); l.className = 'idea-link'; l.href = '#' + link; l.dataset.go = link;
        l.innerHTML = `<i></i><span></span><span aria-hidden="true">→</span>`;
        l.querySelector('i').style.setProperty('--lc', `var(--${lt.color || 'yellow'})`);
        l.querySelector('span').textContent = lt.open;
        a.querySelector('.idea-foot').prepend(l);
      }
      return a;
    }
    function emptyCard() {
      const a = document.createElement('article'); a.className = 'idea ys-empty';
      a.innerHTML = `<p class="idea-text">Bu filtrede yapmadığın fikir kalmadı.</p><button type="button" class="btn primary" data-reset>Filtreyi temizle</button>`;
      return a;
    }
    function fly(old, dir) {
      old.classList.add('leaving');
      if (!motionOK()) { old.remove(); return; }
      const from = old.style.transform || 'none';
      old.animate([{ transform: from, opacity: 1 }, { transform: `translate(${dir * 125}%, -5%) rotate(${dir * 16}deg)`, opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.4,.1,.6,1)', fill: 'forwards' }).onfinish = () => old.remove();
    }
    function next(dir = -1) {
      if (busy) return;
      if (pos >= order.length) {
        order = shuffle(pool()); pos = 0;
        if (order.length > 1 && order[0] === curIdx) order.push(order.shift());
      }
      const old = card;
      if (!order.length) { card = emptyCard(); curIdx = -1; } else { curIdx = order[pos++]; card = makeCard(curIdx); }
      deck.append(card);
      if (old) fly(old, dir);
      if (motionOK()) card.animate([{ transform: 'translateY(14px) scale(.955) rotate(1.6deg)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: old ? 70 : 0, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      updateMeta();
    }
    function markDone() {
      if (busy || curIdx < 0) return;
      busy = true; done.add(curIdx); store.set('ys-done', [...done]);
      const stamp = document.createElement('div'); stamp.className = 'stamp'; stamp.textContent = 'YAPILDI'; card.append(stamp);
      Sound.chime(); vibrate(10); say('Yapıldı olarak işaretlendi.');
      if (motionOK()) stamp.animate([{ transform: 'rotate(-10deg) scale(1.9)', opacity: 0 }, { transform: 'rotate(-10deg) scale(1)', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.3,1.4,.6,1)', fill: 'forwards' });
      else stamp.style.opacity = 1;
      doneT = setTimeout(() => { busy = false; next(1); }, motionOK() ? 680 : 250);
    }
    function refilter() { store.set('ys-time', time); store.set('ys-cat', cat); order = []; pos = 0; next(-1); }
    el.addEventListener('click', e => {
      const tb = e.target.closest('[data-time]'), cb = e.target.closest('[data-cat]');
      if (tb) { time = tb.dataset.time; $$('[data-time]', el).forEach(b => b.setAttribute('aria-pressed', b === tb)); refilter(); }
      else if (cb) { cat = cb.dataset.cat; $$('[data-cat]', el).forEach(b => b.setAttribute('aria-pressed', b === cb)); refilter(); }
      else if (e.target.closest('[data-reset]')) { time = 'hepsi'; cat = 'hepsi'; $$('[data-time]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.time === 'hepsi')); $$('[data-cat]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === 'hepsi')); refilter(); }
    });
    $('#ys-next', el).addEventListener('click', () => next(-1));
    doneBtn.addEventListener('click', markDone);
    deck.addEventListener('pointerdown', e => {
      if (!card || busy || e.button > 0 || e.target.closest('a, button')) return;
      drag = { x: e.clientX, dx: 0, id: e.pointerId, el: card };
      card.classList.add('dragging');
      try { deck.setPointerCapture(e.pointerId); } catch (err) {}
    });
    deck.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      drag.el.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx * 0.05}deg)`;
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const { dx, el: c } = drag; drag = null; c.classList.remove('dragging');
      if (Math.abs(dx) > 90 && c === card) next(dx > 0 ? 1 : -1);
      else { if (Math.abs(dx) > 2 && motionOK()) c.animate([{ transform: c.style.transform }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,1.4,.6,1)' }); c.style.transform = ''; }
    };
    deck.addEventListener('pointerup', endDrag);
    deck.addEventListener('pointercancel', endDrag);
    next(-1);
    return {
      onKey(e) {
        if (isField(e.target)) return;
        if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); next(-1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); next(1); }
        else if (e.key.toLocaleLowerCase('tr') === 'y' && !e.repeat) { e.preventDefault(); markDone(); }
      },
      destroy() { clearTimeout(doneT); },
    };
  },
});
})();
