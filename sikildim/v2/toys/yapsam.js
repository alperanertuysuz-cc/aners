/* Ne yapsam? — fikir destesi */
(() => {
'use strict';
const CATS = { yarat: 'Yarat', hareket: 'Hareket', disari: 'Dışarı', ogren: 'Öğren', kafa: 'Kafa', rahatla: 'Rahatla', sosyal: 'Sosyal' };
const TIMES = { hepsi: ['Hepsi', () => true], hemen: ['10 dk’ya kadar', m => m <= 10], biraz: ['15–30 dk', m => m > 10 && m <= 30], uzun: ['1 saat+', m => m > 30] };
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
];

registerToy('yapsam', {
  name: 'Ne yapsam?', color: 'yellow', cf: 'on-light', kind: 'Fikir', open: 'Ne yapsam’ı aç',
  cats: ["kafa"],
  desc: '60 fikirlik bir deste. Beğenmediğini kaydır, gerisini yap.',
  art: '<div class="art-cards"><i></i><i></i><i>?</i></div>',
  stat: () => { const done = store.get('ys-done', []).length; return done ? `${done} fikir yapıldı` : `${IDEAS.length} fikir`; },
  css: `
.art-cards i {
  position: absolute; width: 64px; height: 84px; border-radius: 11px; background: var(--paper);
  box-shadow: 0 8px 16px -8px rgba(0, 0, 0, .3); transition: transform .55s var(--spring);
}
.art-cards i:nth-child(1) { transform: rotate(-13deg) translateX(-24px); opacity: .7; }
.art-cards i:nth-child(2) { transform: rotate(10deg) translateX(22px); opacity: .85; }
.art-cards i:nth-child(3) { display: grid; place-items: center; font: 800 42px/1 var(--f-display); font-style: normal; color: var(--on-light); }
.tile:hover .art-cards i:nth-child(1) { transform: rotate(-22deg) translate(-40px, 6px); }
.tile:hover .art-cards i:nth-child(2) { transform: rotate(18deg) translate(38px, 6px); }
.tile:hover .art-cards i:nth-child(3) { transform: translateY(-6px) rotate(-3deg); }

.ys-filters { display: grid; justify-items: center; gap: 10px; }
.deck { position: relative; width: min(100%, 640px); height: clamp(320px, 46vh, 430px); }
.deck-ghost { position: absolute; inset: 0; border-radius: var(--r-xl); background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); }
.deck-ghost.g1 { transform: translateY(12px) scale(.955) rotate(1.6deg); }
.deck-ghost.g2 { transform: translateY(24px) scale(.91) rotate(-2.2deg); background: var(--panel-2); }
.idea {
  position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column; gap: 12px;
  padding: clamp(20px, 3vw, 32px); border-radius: var(--r-xl); background: var(--c); color: var(--cf);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35), 0 22px 44px -26px var(--shade);
  touch-action: pan-y; user-select: none; -webkit-user-select: none; cursor: grab;
}
.idea.dragging { cursor: grabbing; }
.idea.leaving { z-index: 3; pointer-events: none; }
.idea-top { display: flex; justify-content: space-between; gap: 12px; opacity: .75; }
.idea-text { margin-block: auto; max-width: 22ch; font-size: clamp(24px, 3.3vw, 38px); font-weight: 650; line-height: 1.1; letter-spacing: -.025em; }
.idea-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; }
.idea-no { opacity: .6; }
.idea-link {
  display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 999px;
  background: var(--on-light); color: var(--paper); font-size: 15px; font-weight: 600; text-decoration: none;
  transition: transform .3s var(--spring);
}
.idea-link:hover { transform: translateX(3px); }
.idea-link i { width: 10px; height: 10px; border-radius: 3px; background: var(--lc); }
.stamp {
  position: absolute; top: 24%; right: clamp(16px, 4vw, 40px); padding: 8px 16px; border: 3.5px solid currentColor; border-radius: 12px;
  font: 800 clamp(22px, 3vw, 30px)/1 var(--f-mono); letter-spacing: .06em; opacity: 0; transform: rotate(-10deg);
}
.ys-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.ys-empty { display: grid; place-content: center; gap: 16px; text-align: center; justify-items: center; }
`,
  hint: 'Boşluk başka · Y yaptım · kartı kaydır',
  mount(el) {
    let time = store.get('ys-time', 'hepsi'), cat = store.get('ys-cat', 'hepsi');
    if (!TIMES[time]) time = 'hepsi';
    if (cat !== 'hepsi' && !CATS[cat]) cat = 'hepsi';
    const done = new Set(store.get('ys-done', []));
    el.innerHTML = `
      <div class="toy yapsam">
        <div class="ys-filters">
          <div class="seg" role="group" aria-label="Süre">${Object.entries(TIMES).map(([k, [label]]) => `<button type="button" data-time="${k}" aria-pressed="${k === time}">${label}</button>`).join('')}</div>
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
    let order = [], pos = 0, card = null, curIdx = -1, busy = false, drag = null;
    const pool = () => IDEAS.map((_, i) => i).filter(i => { const [c, m] = IDEAS[i]; return (cat === 'hepsi' || c === cat) && TIMES[time][1](m) && !done.has(i); });
    const timeLabel = m => m >= 60 ? `${m / 60} saat` : `${m} dk`;
    function updateMeta() { meta.textContent = `Bu filtrede ${pool().length} fikir · ${done.size} tanesini yaptın`; doneBtn.disabled = curIdx < 0; }
    function makeCard(i) {
      const [c, m, text, link] = IDEAS[i];
      const a = document.createElement('article'); a.className = 'idea';
      a.innerHTML = `<header class="idea-top mono"><span></span><span></span></header><p class="idea-text"></p><footer class="idea-foot"><span class="mono idea-no"></span></footer>`;
      a.querySelector('.idea-top span:first-child').textContent = CATS[c];
      a.querySelector('.idea-top span:last-child').textContent = timeLabel(m);
      a.querySelector('.idea-text').textContent = text;
      a.querySelector('.idea-no').textContent = `№ ${String(i + 1).padStart(2, '0')}`;
      if (link) {
        const l = document.createElement('a'); l.className = 'idea-link'; l.href = '#' + link; l.dataset.go = link;
        l.innerHTML = `<i style="--lc: var(--${TOYS[link].color})"></i><span></span><span aria-hidden="true">→</span>`;
        l.querySelector('span').textContent = TOYS[link].open;
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
      Sound.chime(); say('Yapıldı olarak işaretlendi.');
      if (motionOK()) stamp.animate([{ transform: 'rotate(-10deg) scale(1.9)', opacity: 0 }, { transform: 'rotate(-10deg) scale(1)', opacity: 1 }], { duration: 280, easing: 'cubic-bezier(.3,1.4,.6,1)', fill: 'forwards' });
      else stamp.style.opacity = 1;
      setTimeout(() => { busy = false; next(1); }, motionOK() ? 680 : 250);
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
    };
  },
});
})();
