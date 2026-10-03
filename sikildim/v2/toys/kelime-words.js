/* Kelime — word lists for the daily Turkish 5-letter puzzle (toys/kelime.js).
   answers: 753 common, family-friendly dictionary lemmas (nouns, adjectives; no inflected forms, proper nouns or abbreviations).
   allowed: answers + 5899 more valid 5-letter words (dictionary lemmas plus common inflected forms) that are accepted as guesses.
   Sources for `extra`: every word appears in Vikisözlük’s Turkish word list (CC BY-SA, via github.com/mertemin/turkish-word-list)
   or in FrequencyWords tr_50k by Hermit Dave (CC BY-SA 4.0, github.com/hermitdave/FrequencyWords); this file is shared under CC BY-SA 4.0.
   The `answers` list was picked by hand.
   Every word is exactly 5 letters of a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z, lowercase, no circumflex.

   The daily word is answers[perm[(n - 1) % N]] where n is the puzzle number (#1 = 2026-10-03, Europe/Istanbul calendar date)
   and perm is a fixed Fisher–Yates permutation from a seeded PRNG (see kelime.js). Editing or reordering `answers`
   changes which word falls on which day, so treat the list as frozen once the toy is live; new guessable words go into `extra`.

   Self-check: `node sikildim/v2/toys/kelime-words.js` (asserts length, charset, answers ⊆ allowed, no duplicates). */
(() => {
'use strict';
const answers = `
acele acemi açlık adres ahlak ahşap ajans akrep akşam aktif alaka alarm albüm alkış altın ambar ampul anlam
anten antik araba arazi arıza armut artış asker aslan aşağı aşama aşure avize aylık ayran bacak badem bagaj
bahar bahçe bakım bakır bakış balık balon balta banka banyo baraj barış basit başka bavul bayat bebek bedel
beden bekçi belge besin beton beyaz beyin bıçak bıyık biber biçim bilek bilet bilge bilgi bilim bilye birey
birim bitiş bitki boğaz bordo borsa boyun boyut bozuk böcek bölge bölüm börek bronz buçuk bugün buhar buluş
bulut burun bütçe büyük cadde canlı cazip ceket cesur cevap ceviz ciddi ciğer cihaz cümle çadır çağrı çakal
çakıl çanta çarşı çatal çekiç çelik çevre çıkış çınar çırak çiçek çilek çimen çizgi çizim çizme çoban çocuk
çorap çorba çörek çözüm çubuk çukur çuval çürük daire dalga dalış damar damla davet davul değer delik demir
deney denge deniz dergi derin desen detay devam devir deyim diken dikey dikiş dilek dilim dişli diyet doğal
doğru doğum dokuz dolap dolma dosya dönem döngü dönüş drama dudak duman durak durum duvar duygu düdük düğme
düğün dümen dünya düşük düzen düzey ekmek ekran eksik elmas engel engin erkek erken erzak esmer esnek eşsiz
evcil evren evrim eylem eylül fakir fayda fazla fener fıkra fırça fırın fidan fikir final firma fiyat fizik
forma fosil garaj garip gazoz geçiş geçit gelin geliş genel geniş geyik gidiş giriş gitar giyim giysi gizem
gizli goril göbek göğüs gölge gönül görev görüş gövde gurur gübre güçlü gümüş güneş güney güreş güveç güven
güzel haber hafif hafta hakem haklı halat halka hamam hamle hamsi hamur hanım hasat hasta havlu havuç havuz
hayal hayat hazır hedef hekim helva hesap hızlı hindi horoz hukuk hurda hurma huzur hücre hüzün ırmak ıslak
ıslık ideal ikili iklim ikram iksir ileri ilham inanç incir insan iplik israf istek joker kabak kabin kablo
kabuk kader kadın kafes kağıt kahve kalem kalfa kalın kalıp kanal kanat kanca kapak karar karga kargo karlı
karne kasap kasım kaşar kaşık katır katkı kavak kaval kavun kayak kayık kayıp kayıt kazak kazan kebap kekik
keman kemer kemik kenar kesim keşif keyif kırık kısım kızıl kibar kiler kilim kilit kimya kiraz kirli kirpi
kitap kitle koala kobra kolay kolej kolye komik komşu konuk konum kopya korku kovan koyun köfte kömür köpek
köprü köpük kredi krema kubbe kucak kukla kulak kulüp kumaş kumru kural kurgu kurum kuruş kurye kuşak kuşku
kutlu kutup kuzey küçük kümes kürek kütle kütük küvet lamba lider liman limon liste litre lokma lokum lüfer
lütuf madde maden makas makul manav manda mantı marka marul masaj masal maske masum mayıs medya mekik melek
melez memur merak mesaj metal metin metre metro meyve mezun mısır midye mimar minik miras mizah model moral
motor mutlu müdür mühim mühür müzik nabız nadir narin nazik nefes nehir nemli nesil nesne nisan nişan niyet
nohut nokta nöbet nüfus olgun omlet opera optik organ orman ortak ortam ödeme öğlen öneri ördek örnek özgün
özgür özlem paket palto pamuk panda parça parka parke parti pasif pasta paten pazar pembe pençe perde peruk
pilav pilot pizza plaka posta poşet prens proje radar radyo rahat rakam raket rakip rapor reçel refah rekor
rende resim ritim robot roket roman rozet rutin sabah sabır sabit sabun sadık sahil sahne sakal sakar sakız
sakin saklı saksı salep salon saman sanal sanat saray sarma satır satış sayfa saygı sebep sebze seçim sedef
sefer sehpa sekiz selam sepet serçe sergi serin sesli sevgi seyir sıcak sıfır sınav sınıf sınır sihir silgi
simit sinek siren sirke sivil sivri siyah soğan soğuk sokak solak soluk somon somut sonuç sosis soylu söğüt
sprey stres sucuk sunum susam susuz sürat süreç sürüş süslü sütlü şafak şahin şapka şarkı şehir şeker şekil
şeref şerit şifre şirin şoför şubat şüphe tabak tablo tahıl tahta takım takla taksi taraf tarım tarif tarih
tarla tatil tatlı tavan tavır tavla tavuk teker tekme tekne telaş temas temel temiz tenis teori tepki tepsi
teras terim terzi teyze tıraş tilki tipik titiz tohum topaç toplu topuk topuz torba torun tören tuğla tuhaf
turşu turta tutam tutku tuval tuzak tuzlu tünel türkü tüylü uyarı uygun uysal uzman ücret üçgen üstat üstün
üzgün vagon vakit valiz vapur varış vatan vergi video villa virüs vişne vites vücut yağlı yakın yakıt yakut
yanak yanık yanıt yapay yarım yarın yarış yasak yaşam yaşlı yatak yatay yavaş yavru yayın yazar yazık yazım
yedek yelek yemek yenge yerli yeşil yetki yığın yılan yiğit yirmi yoğun yolcu yorum yosun yudum yulaf yunus
yürek yüzey yüzme yüzük zafer zaman zarar zarif zayıf zebra zemin zerre zihin zirve zurna
`.trim().split(/\s+/);
const extra = `
abacı abadi abalı abani abaşo abayı abbas abdal abece abide abime abimi abine abini abisi abiye ablak ablam ablan
abone abraş abril abuli acaba aceze acıca acıdı acılı acıma acımı acını acısı acıya acıyı acibe acile acube acuze
açana açgöz açıcı açığa açığı açısı açmak açmam açman açmaz açmış açsam açsan açsın açtık açtım açtın açval adada
adadı adale adalı adama adamı adası adaya adayı adese adeta adıma adımı adına adını adice adsız afaki afazi affet
afgan afife afili afişe afoni afsun aftos afyon agami agora agraf ağaca ağacı ağcık ağılı ağına ağını ağlar ağmak
ağnam ağraz ağrım ağrın ağyar ağzım ağzın ahali ahbap ahcar ahenk ahfat ahıra ahırı ahize ahlaf ahlat ahmak ahraz
ahval aidat aidim ailem ailen aitim aitti ajana ajanı ajite akabe akait akaju akala akbaş akçıl akdut akemi akıcı
akımı akışı akide akkor akkuş aklan aklen aklık aklım aklın akmak akman akmaz akont akort akpas akran aksak aksam
aksan aksın akson akşın aktar aktör akvam alaca alana alanı alaya alayı alaza albay alçak aldık aldım aldın alemi
aleni alete aleti alevi aleyh algın alıcı alımı alize alkan alkım alkil alkol allah allak allem allık almaç almak
almam alman almaş almaz almış alnaç alsak alsam alsan alsın altes altık altız altlı altta alyan alyon amaca amacı
amade aması amber amcam amcan amele amigo amiri amorf amper ampir amudi anaca analı anane anası ancak andaç andan
andıç andık andır andız anele anemi angıç angın angut anına anını anısı anıtı anıyı anide anime anjin anket anlak
anlar anlat anlık anmak annem annen anons ansız antet antlı antre anüri anyon apacı apiko aplik aport apoşi apotr
april apsis aptal araca aracı arada aradı araka arama aramı aranı arası araya arayı ardak ardıç ardıl arena argaç
argın argıt argon arıcı arısı arızi arife ariya ariza arkaç arkıt arkoz armuz aroma arpçı arpej arsız arşın arşiv
artan artar artçı arter artık artım artın artma arttı arzum arzun asabi ashap asılı aside asidi asist askat asklı
aslen aslık asmak asmış aspur astar astat astım astın astik asude asyön aşari aşevi aşıcı aşığı aşılı aşırı aşısı
aşıyı aşina aşkım aşkın aşkla aşkta aşktı aşlık aşmak aşmış aştık aştım aştın atadı atağa atama atana atari ataşe
ateşe ateşi atfen atıcı atılı atımı atına atını atışa atışı atlar atlas atlet atmak atmam atman atmaz atmık atmış
atsam atsan atsın attan attık attım attın avans avara avare avdet avene avına avını avlak avlar avrat avret avunç
avurt ayağa ayağı ayarı aydan aydın aydır ayevi aygın aygır aygıt ayıcı ayımı ayını ayırt ayısı ayıya ayıyı ayine
ayini aylak aylar aymak aymaz aynaz aynen ayraç ayrıç ayrık ayrıl ayrım ayrıt aysar aysız ayvan ayvaz ayyar ayyaş
ayyuk azabı azade azalt azami azcık azdır azgın azılı azını azize azlık azmak azman azmış aznif azoik azvay babaç
babam baban bacım baççı badas badat badıç badik badya baget bağan bağcı bağda bağıl bağım bağın bağır bağış bağıt
bağla bağlı bahir bahis bahri bahse bahsi bakaç bakam bakan bakar bakın bakıp bakir bakla bakma baksa baktı balar
balat balcı baldo balet balım baliğ balkı ballı baloz balya bambu bamya banak banal banço bandı bando banko banma
barak baran barba barcı barça barda bardo barem baret barın barit bariz barka barok baron barut basak basan basar
basen basık basım basın basıp basış basil baskı basma basso bastı basur basya başak başat başçı başım başın başla
başlı başta batak batan batar batık batıl batın batış batik batkı batma baton batöz battı batur bavcı bavlı bayan
bayım bayır bayma bayrı bazal bazen bazik bazit bazlı becer becet bedii bedik bedir bedük begüm beğen beher behey
behre bekar bekas bekle bekri belce belde belek belen beleş belgi beliğ belik belim belit belki belli bemol bence
benci bende benek bengi benim beniz benle benli bense berat beril berri besle besni beste beşer beşik beşiz beşli
beşme beşon beşte beter betik betim beyan beyim beyit beyne beyni beyzi bezci bezek bezen bezgi bezik bezir bezme
bezsi bıcıl bıçık bıçkı bıdık bıkış bıkma bıktı bırak bızır biblo bicik biçem biçiş biçki biçme bidar bidat bidon
bihuş bikes bikir bilar bildi bilen bilin bilip bilir biliş bilme bilse binde bindi binek binen biner bingi binin
binip biniş binit binme biram biraz birci birer birli birun bişek bitap bitek biten biter bitey bitik bitim bitip
bitir bitli bitme bitti bitüm biyel bizar bizce bizde bizim biziz bizle bizon bizse bloke bobin bocuk boduç bodur
boğak boğdu boğma boğuk boğum bohça bohem boklu boksu bolca bomba bombe borak boran borat borca borcu borda borik
boruk bosna boşta boştu boşum botta botun boyar boyca boyda boylu boyna boynu boyoz boyum bozan bozar bozca bozdu
bozma bozum bozup böbür böğür bölen bölme bölük bölüş bölüt bönce böyle branş bravo bronş bröve bucak budak budun
budur buğra buğur buğuz buhur buket bukle bulak bulan buldu bulgu bulma bulsa bulun bulup bulur bunak bunca bunda
bunla bunlu bunma bunun burak burcu burgu burma burnu bursu buruk buşon butik butlu buton buydu buyma buyot buysa
buyum buyur buzcu buzda buzla buzlu buzul buzun bücür büğet büğlü büken bükme büküç bükük büküm bükün büküş büluğ
bünye bürgü bürük bürüm bütan büten bütün büvet büyün büyür büyüt büzgü büzme büzük cacık cahil caize calip camcı
camda camın camız camia camit camlı camsı canan canım canın canip carlı carta casus cayır cayış cayma cazcı cazlı
cebel cebin cebir cedel cedit cedre cehil cehre cehri celal celbe celbi celep celil celse cemal ceman cemil cemre
cenah cenap cenin cenup cepçi cephe cepte ceren ceset cesim cevaz cevir cevvi cezai cezam cezan cezbe cezir cezve
cıbıl cıcık cıdak cılız cıvık cıvıl cıvma cızık cibin cibre cicik cicim cicoz cidal cidar cihan cihar cihat cihet
cildi cilve cimri cinai cinas cinci cinli cinsi cipsi cirim cirit cisim civan civar cizye conta corum coşku coşma
cudam cukka cumba cunda cunta cuşiş cübbe cücük cülus cünha cünun cünüp cüret cüruf cürüm cüsse çabuk çağda çağın
çağır çağla çağma çakar çaker çakım çakın çakır çakış çakma çakra çaktı çalak çalan çalar çaldı çalgı çalık çalım
çalın çalıp çalış çalkı çalma çaltı çamat çamça çamur çanak çancı çandı çapak çapar çapla çaplı çapma çapta çapul
çaput çarem çaren çarık çarka çarkı çarpı çasar çaşıt çatak çatık çatış çatkı çatma çattı çavlı çavma çavun çavuş
çayan çaycı çayın çayır çaylı çebiç çecik çeçen çedik çehre çekek çekel çekem çeken çeker çekik çekil çekim çekin
çekip çekiş çekme çekti çekül çelek çelen çelgi çelim çello çelme çemçe çemen çemiç çemiş çenek çenem çenen çenet
çengi çepel çeper çepez çepin çerçi çerez çerge çeşit çeşme çeşni çetin çevik çevir çevri çeyiz çıban çıdam çıfıt
çığır çıkak çıkan çıkar çıkık çıkın çıkıp çıkıt çıkma çıkra çıksa çıktı çıngı çıpır çırağ çırpı çıtak çıtır çıvma
çıyan çifte çifti çiğde çiğin çiğit çiğne çilli çimek çimme çince çinko çinli çipil çiriş çiroz çişik çişim çitar
çiten çitin çitme çivit çizdi çizen çizer çizge çizik çizin çizip çiziş çoğul çoğun çokal çokça çokçu çoklu çolak
çolpa çoluk çomak çomar çopra çopur çorak çorlu çotra çotuk çöğme çöğür çökek çökel çöken çöker çökme çöktü çökük
çöküm çökün çöküp çöküş çölde çölün çömçe çömez çömme çöpçü çöplü çöpte çöpün çörkü çörtü çöven çözdü çözen çözer
çözgü çözme çözük çözün çözüp çözüş çulcu çulha çupra çuşka çükür çünkü dadaş dağar dağcı dağda dağın dağıt dağlı
dahil daima daimi dakik dalak dalan dalar dalaş daldı dalgı dalın dalıp dalız dallı dalma dalsı dalya damak damat
damga damlı danış dansa dansı daraç daraş darbe darca darla dasit datif davam davan davar davya dayak dayan dayım
dayın debbe debil dedem deden dedik dedim dedin defin defne defol degaj değdi değil değim değin değiş değme deist
deizm dekan dekar dekor deler delgi delil delip delme delta demeç demek demem demen demet demez demin demiş demli
dendi denek denen dener denet dengi denim denir denli denme denyo depar derbi derde derdi derim deriz derli derme
derse dersi derun derya desek desem desin deste deşik deşme devce devim devin devre devri deyin deyip deyiş dığan
dılak dışık dışkı dibek didar didik didon diğer dikçe dikeç dikel dikim dikip dikit dikiz dikme dikse dikta dikte
dikti dilci dilde diler dilin diliş dille dilli dilme dilsi dimağ dinar dince dinci dinek dinen dingi dinin diniş
dinle dinli dinme dipli dipte direk diren direy diriğ diril dirim diski disko dişçi dişil dişim dişin ditme dival
divan divik divit diyar diyen diyez diyin diyor dizek dizel dizem dizge dizgi dizim dizin diziş dizme dobra dogma
doğaç doğan doğar doğdu doğma doğup doğuş dokun dolak dolam dolan dolar dolaş dolay doldu dolgu dolum dolup doluş
domur domuz donam dondu donlu donma donör donra donuk donup dorse doruk dorum dosta dostu doygu doyma doyum doyuş
dozaj dozda dozer döken döker dökme döktü dökük dökül döküm dökün döküp dölek dölüt döndü döneç dönek dönel dönen
döner dönme dönük dönüm dönün dönüp dönüt dörde dördü döşek döşem döşlü dövdü döveç döven döver döviz dövme dövüp
dövüş draje duacı dualı duanı duası dubar duble duhul dulda duluk dumur duraç dural duran durdu durgu durma duruk
durun durup durur duruş duşak duşta duvak duyan duyar duydu duyma duysa duyum duyun duyup duyuş dübel dübeş düçar
düden düğüm dündü dünit dünkü dünün dünür dürme dürtü dürüm dürzü düşçü düşen düşer düşes düşeş düşey düşkü düşme
düşse düştü düşün düşüp düşür düşüş düşüt düvel düven düver düyek düyun düzce düzeç düzem düzgü düzme ebcet ebedi
ebeli ebleh ecdat eçhel edalı edebi edene edeni edici edinç edvar efdal efece efekt eflak efrat efriz efsun efsus
eglog egosu egzoz eğlek eğlen eğmeç eğmek eğrez eğrim ehram ehven ejder ekibe ekibi ekici ekili eklem ekler ekose
eksen ekser eksin eksiz elbet elcik elçek elçim elden eleji eleme elgin elhak elime elimi eline elini elips eller
ellik elmek elvan elyaf elzem emare emaye emcek emcik emeği emici emlak emlik emmeç emmek emraz emret emrim emrin
emsal emtia emval emzik enayi encam endam ender eneme enfes enine enkaz enlem enöte ensar enser ensiz entel enzim
eosen epeyi epope erbap erbaş erbin ercik erdem erden ergen ergin eridi erika erime erinç erkeç erkin erkli erlik
ermek ermez ermin ermiş eroin ersiz ervah erzel esami esans esasi esbak esbap eseme eseri esham esire esiri eskiz
eslaf eslek esmek esnaf espas espri esrar esrik essah ester estet esvap eşarp eşeği eşhas eşime eşimi eşine eşini
eşkin eşlek eşlem eşler eşlik eşmek eşraf eşref eşyam etçik etçil eteği etene etfal etine etini etken etkin etler
etlik etmek etmem etmen etmez etmiş etnik etraf etsek etsem etsen etsin etsiz etten ettik ettim ettin ettir evaze
evcek evcik evden evdeş evgin evham evime evimi evine evini eviye evkaf evlat evlek evlen evler evlik evrak evrat
evrik evsaf evsel evsin evsiz evvel eytam eyvah eyvan eyyam ezani ezber ezeli ezgiç ezgin ezici ezinç ezmek facia
fagot fahiş fahri fahte fahur faili faizi fakat fakih fakül falan falcı falez falso falya fanta fanti fanus fanya
farad faraş farba fariğ faril farkı faset fasık fasıl fasih fasit faska faslı fason fatih fauna fazıl fecir fedai
fehim fehva fekül felah felci felek fenci fenik fenol ferağ ferah ferda ferde ferdi ferih ferik ferli ferma fesat
fesih fetha fetih fetiş fetüs fetva fevri feyiz fıkıh fırka fırla fışkı fıtık fıtri fiber fidye fifre figan figür
fikre fikri filan filar filet filin filiz filme filmi filoz filsi filum finiş firak firar firez firik fiske fisto
fişek fişka fişli fitçi fitil fitin fitne fitre flama fleol flora flori flöre flört fodla fodra fodul fokus folyo
fonda fonem formu foroz forsa forte forum foton frank frape frene freni fresk freze frigo frisa fuarı fuaye fuhuş
fujer fular fulya funda furya fülüs fünye füsun fütur füzen gabin gabro gabya gadir gafil gafur gaile gaita galat
galip galiz galon galop galoş gamba gamet gamlı gamze garaz garoz gasıp gasil gaşiy gauss gavot gayda gayet gayrı
gayri gayur gayya gazal gazap gazel gazın gazla gazlı gazve geber gebeş gebre gecem gecen geççe geçek geçen geçer
geçim geçin geçip geçir geçme geçse geçti gedik gedme geldi gelen gelip gelir gelme gelse gemim gemin gence genci
geniz genom geoit gerçi gereç gerek geren gergi geriş geriz germe getir getto geven geviş gevme gevşe geyşa gezen
gezer gezip geziş gezme gıcık gıcır gıdık gıdım gıpta gırla gıyap giden gider gidin gidip gidon giray girdi giren
girer girim girin girip girme girse gitme gitse gitti giydi giyen giyer giyin giyip giyiş giyit giyme gizil glase
gnays gocuk godoş golcü gollü gonca gotik göbel göcen göçer göçme göçük göçüm göçüp göçüş göden gödeş göğem göğsü
gökçe gökte gölde gölek gölet gölük gölün gömdü gömme gömük gömün gömüş gömüt göncü gönen gönye gördü gören görgü
görme görse görüm görün görüp görür götür gövek gövel gövem göyme göyük gözcü gözde gözer gözgü gözle gözlü gözüm
gözün grado grena greve grevi gribi grizu grogi grosa gruba grubu guano guatr gudde guguk gulaş gulet gurme gurup
gusto gusül gübür gücük gücüm gücün güçle güçte güdek güdük güdüm güfte güğüm gülcü güldü güleç gülen güler gülle
güllü gülme gülük gülüm gülün gülüp gülüş gülüt gümeç gümül günah günce günde gündü güneç günkü günle günlü günüm
günün güpür güruh gütme güvez güzaf güzey güzün habbe habeş habip habis hacet hacim hacir haciz haçlı hadde hadım
hadim hadis hafız hafit haham hahha haile haini hakan hakça hakim hakir hakkı hakla halam halan halas halay halde
halef halel halen halfa haliç halim halin halis halkı halta haltı haluk hamak hamal hamız hamil hamiş hamla hamse
hamut hanay hancı handa hande hanek hangi hanut hapaz hapçı hapis hapse hapsi hapşu haraç haram harap harar harbe
harbi harca harem harfi harıl harım harın hariç harim harir haris harlı harta hasar hasbi hasep haset hasıl hasım
hasır hasis haspa hassa hasse hasut haşat haşıl haşır haşin haşir haşiş haşiv hatam hatan hatıl hatır hatif hatim
hatip hatmi hatta hattı hatun havai havan havas havil havlı havra havut havva havya havza haybe hayda haydi hayfa
hayıf hayır hayıt hayız hayli hayra hayta hazan hazar hazcı hazık hazım hazin hazne hecin heder hedik helak helal
helen helik helis helke helme hemen hempa hemze henüz hepsi herek herif herik herke hertz herze heves heybe heyet
hezel hıdiv hıfız hımış hırbo hırka hırlı hırsı hısım hışım hışır hıyar hızar hızda hızın hızır hızla hızma hicap
hicaz hiciv hicri hiççi hidra hikem hilaf hilal hilat hilye himen hindu hippi hisar hisli hisse hissi hitam hitan
hitap hizip hobim hocam hocan hodan hodri hokey hokka hoppa horon horst hoşaf hoşça hoştu hoşur hotoz hozan hödük
höyük hudut hulul hulus humar humma humor humus hurra huruç husuf husul husus husye hutbe hutut huylu huyum hücum
hükmi hükmü hüküm hülle hülya hüner hünsa hürle hürya hüsün hüzme ığrıp ıhmak ılgar ılgım ılgın ılıca ılıma ıltar
ırama ırgat ırkçı ırkın ısısı ısıyı ıskat ıslah ısrar ıssız ıstar ışığa ışığı ışıma ışını ışkın ıştır ıtlak ıtrah
ızgın ızrar ibare ibate ibdai iblağ iblis ibraz ibret ibrik ibzal icabı icadı icbar icmal içeri içici içime içimi
içine içini içkin içlem içler içlik içmek içmem içmen içmez içmiş içrek içsek içsel içsem içsin içsiz içten içtik
içtim içtin içyüz idadi idama idame idamı idare idari iddia idman idrak idrar ifade iffet ifham iflah iflas ifrağ
ifrat ifraz ifrit ifsat iftar iğdiş iğfal iğlik ihale ihata ihbar ihdas ihlal ihlas ihmal ihraç ihram ihraz ihsan
ihsas ihtar ihvan ihzar ikame ikbal ikdam ikici ikide ikile ikisi ikiye ikiyi ikizi ikmal ikrah ikrar ikraz ilaca
ilacı ilahe ilahi ilanı ilave ilbay ilenç ileti ilgeç ilgim ilgin ilhak ilhan iliği ilkah ilkel ilkin illet ilmek
ilmik ilzam imajı imale imalı imame imbat imbik imdat imece imkan imleç imlik imren imroz imsak imzan incik incil
indik indim indin indir indis ineğe ineği infak infaz ingin inine inişe inkar inmek inmem inmez inmiş insaf insin
inşat intaç intak intan inzal ipçik ipeka ipham ipini ipler ipsiz iptal ipucu irade iradi irfan irice irkme irmik
ironi irsal irsen irşat isale ishal isini iskoç islam isler islim ismen ismet ismim ismin isnat ispat ispir ispit
istem ister istif istim istop isveç isyan işedi işeme işgal işime işimi işine işini işkil işlek işlem işler işlev
işlik işmar işmiş işret işsiz iştah işten işteş iştir işyar itaat iteği ithaf ithal itham itici itila itina itlaf
itlik itmam itmek ittim ittin ittir ivedi ivesi ivmek iyice iyisi iyiye iyiyi izabe izafe izafi izale izhar izimi
izine izini izlek izlem izler iznim iznin izole izzet japon jarse jeloz jeton jikle jilet jokey jüpon kaban kabız
kabil kabir kabul kabus kabza kaçak kaçan kaçar kaçık kaçın kaçıp kaçış kaçlı kaçma kaçta kaçtı kadar kadeh kadem
kadim kadir kadit kadro kadük kafam kafan kafir kağan kağnı kahır kahin kahir kahpe kahya kaide kaime kakaç kakao
kakıç kakım kakış kakma kalak kalan kalas kalay kalbe kalbi kalcı kalça kaldı kalıç kalık kalım kalır kalış kalıt
kalma kalsa kalya kamçı kamer kamet kamga kamış kamil kampa kampı kamus kanan kanda kanık kanım kanın kanış kanıt
kaniş kanka kanla kanlı kanma kanon kanto kanun kaosa kapan kapar kapat kapım kapın kapıp kapış kapik kaplı kapma
kaptı kaput kapuz karat karda kargı karha karık karım karın karış karla karma karnı karni karst karşı karta kartı
karun karye kasem kaset kasık kasıp kasır kasıt kasis kaskı kasko kaslı kasma kasnı kasti kaşan kaşif kaşlı katar
katık katıl katım katın katil katla katlı katma katot katre katta kattı kavaf kavas kavat kavga kavil kavim kavis
kavkı kavuk kavut kavuz kayaç kayan kayar kaybı kayda kaydı kaygı kayın kayır kayış kayma kayme kayra kayşa kazaz
kazık kazıl kazım kazın kazıp kazma kebir kebze keder kedim kedin kefal kefek kefen kefil kefir kefne kehle kekeç
kekin kekre kelam kelek kelem kelep keler keleş kelik kelle kelli kemal kemha kemre kendi kenef kenet kente kenti
kenya kepçe kepek kepez kepir kepme kerde kerem keres kerih kerim keriz kerki kerte kerti kesat kesek kesel kesen
keser kesif kesik kesin kesip kesir kesiş kesit keski kesme kesre kesti keşen keşfe keşfi keşik keşiş keşke keşki
ketal keten keton ketum kevel keyfi kıble kıçım kıçın kıçlı kıdem kılan kılar kıldı kılgı kılıç kılıf kılık kılır
kılış kıllı kılma kımıl kımız kınlı kıpık kıpır kıpma kıraç kıran kırar kırat kıray kırba kırca kırcı kırdı kırım
kırın kırıp kırkı kırma kısas kısık kısır kısış kısıt kıska kıskı kısma kısmı kısmi kıssa kışın kışır kışla kıtal
kıtık kıtır kıvam kıvır kıyak kıyam kıyas kıygı kıyık kıyım kıyın kıyış kıyma kıyye kızak kızan kızar kızda kızdı
kızım kızın kızış kızla kızma kibir kifaf kikla kiliz killi kilsi kilüs kimde kimdi kimim kimin kimiz kimle kimse
kimüs kinci kinik kinin kiniş kinli kirde kireç kiriş kirve kisve kitin kitre kizir klanı klapa klima klips klişe
kobay kocam kocan koçak koçan koçma koçum koçun kodes kodun kofra koful koğuş kokak kokan kokar koket kokla kokma
kokot kokoz kokun kokuş kolaj kolan kolcu kolik kolit kolla kollu kolon kolpo kolsu kolum kolun kolza komar kombi
komot komut komün konak konan kondu kongo konik konma konsa kontu konur konuş konut kopal kopan kopar kopça kopek
kopil kopma kopoy koptu kopuk kopuz koral korna korno korse korte koruk korun korur korza koşaç koşam koşan koşar
koşin koşma koştu koşuk koşul koşum koşun koşup koşut kotan koton kotra kovar kovcu kovdu kovma kovuk kovuş koyak
koyan koyar koydu koyma koyul koyup koyut kozak köçek köhne kökçü köken köklü köksü kölem kölen kölük kömbe kömeç
kömüş körpe körük körüm kösçü kösem kösnü köşek kötek köycü köyde köylü köyün kraça krala kralı kramp krank kravl
kremi kriko krize krizi kroki krome kroşe kubat kubur kudas kuduz kudüm kulaç kulis kulun kumar kumcu kumda kumla
kumlu kumsu kumuç kumul kumun kunda kupes kuple kupon kupür kurak kuram kuran kurar kurca kurda kurdu kurma kurna
kuron kursa kursu kurul kurun kurup kurut kurya kusan kusma kustu kusur kuşçu kuşet kuşum kuşun kutan kutbu kutnu
kutsa kutsi kutum kutur kuver kuvöz kuvve kuytu kuyum kuzay kuzen kuzin kuzum kübik küflü küfür kükre külah külçe
külek külli küllü külot külte küncü künde künye küplü kürar kürdi kürit kürkü kürsü küskü küsme küspe küsuf küsur
küşat küşne küşüm kütin kütlü kütör laçın laçka laden lades ladin lafçı lafım lafın lafız lafzi lagar lagün lağım
lağıv lahit lahos lahut lahza lakap lakçı lakin lakoz lamel lando lanet lanse largo larva laski lasta latif latin
lavaj lavaş lavta lavuk layık lazer lazım lazut leçek ledün legal leğen lehçe lehim lemis lenfa lento lepra lerze
levha levye leydi leyli lezar leziz lığlı lıkır libas liboş libre libya lifli ligde liken likit likör limbo limit
linet linin lipit lipom liret lirik lisan livar liyan lizol lizöz lobut lodos logos lojik lokal lonca longa lopur
lordu lorta loşça lotus lökoz löpür lügat lügol lümen lünet lüpçü lüzum maada maaşı mabat mabet mabut macar macun
maçım maçın maçta maçtı madam maddi madem mader madik madun mafiş mafya magma magri mahal mahfe mahfi mahıv mahir
mahra mahur mahut mahya maile majör makak makam makat maket makro maksi makta maktu malak malaz malca malen malım
malın malik malta malul malum malya mambo mamul mamur mamut manas manat manca manej manen manga mango manik manti
manto mapus maral maraz marda mariz marke marki maron marşı martı maruf maruz marya masam masan masat masif masnu
mason masör masöz mastı masun maşer maşuk matah matbu matem matiz matla matuf matuh maval maviş mavna mavra mayın
mayna mazak mazot mazur mebde mebiz mebni mebus mecal mecaz mecmu mecra medar medet medih medüz meful meğer mehaz
mehdi mehel mehil mehle mekan melal melas melce meles meleş melik melon melul melun memat memba memnu memul menfa
menfi menşe menus meral meram merci merek meres meret mermi mersi mesai mesel mesen mesih mesmu mesul mesut meşbu
meşin meşru meşum metan metbu metil metis metni metot mevdu mevki mevla mevta mevut mevzi mevzu meyan meyil meyus
mezar mezat mezon mezra mezru mezür mıcır mıdır mıgır mıgri mıhlı mırra mısın mısra mışıl mıydı mıyım mıyız miçel
midem miden midir mikoz mikro milat milel milim milis milli mimik mimli minör miraç mirat mirim mirza misak misal
misel misil misin misis misli mitil mitos mitoz miyar miyav miyaz miydi miyim miyiz miyom miyop mizaç mizan mobil
modem modül moğol moher molas molla moloz monat monte montu moren morga morto moruk motel motif mozak möble mösyö
muare mucip mucir mucit mucuk mucur mudil mudur mufla muhal muhat muhik muhil muhip muhit mujik mukim mukni mukus
mulaj mumcu mumlu mumya munis murat muris musap musır muska muson musun muşta muştu mutaf mutat muydu muylu muyum
muyuz muzır muzip muzlu muzsu mübah müfit müftü mühre mührü müjde mülga mülke mülki mülkü mümas mümin münşi mürai
mürit mürur müsün müşir müydü müyüm müyüz müziç nabzı nacak naçar naçiz nadan nadas nadim nafia nafiz nafta nağme
nahak nahır nahif nahiv nahoş nakde nakıs nakış nakız nakil nakip nakit nakli nalan nalça nalın namaz namlı namlu
namus nanay nanik nasıl nasıp nasır nasip nasir naşir natır natuk natür nazal nazar nazım nazır nazil nazir nazlı
nebat nebze necat necip nedbe neden nedim nedir nefer nefha nefir nefis nefiy nefsi nehiy nehre nehri nekes nekre
neler nesep nesiç nesih nesim nesin nesir nesli neşet neşir nevir neyçe neyde neydi neyim neyin neyiz neyle neyse
nezif nezih nezir nezle nısıf nicel niçin nifak nihai nihan nikah nikap nikel nimet ninem ninen ninni nipel nisai
nisap nispi nitel niyaz nizam nodul nokra nonoş notam noter notla notta notun nöron nukut numen nurlu nutuk nüans
nüfuz nükte nüsha nüzul oberj obruk ocağı ocuma odacı odada odağı odalı odama odamı odana odanı odası odaya odayı
odeon odsuz ofise ofisi oflaz ofris ofset oğlak oğlan oğlum oğlun ojeli okapi oklar okluk oksit oktan oktav okudu
okula okulu okuma okume olalı olana olanı olası olaya olayı olçum olduk oldum oldun oleik olein olmak olmam olman
olmaz olmuş olsak olsam olsan olsun oluru oluşu ombra omuza omzum onama onayı ondan ongen ongun oniks onlar onluk
onmak onsuz ontik onuru oosit orada oralı oranı orası oraya orayı orcik ordum orfoz orgcu orion orkit orlon ortaç
ortay ortoz otacı otama otçul otele oteli otist otizm otlak otlar otluk otsul otsuz ovalı ovmaç ovmak oyacı oyala
oyalı oydaş oylar oylum oymak oymuş oynak oynar oynaş oynat oyumu oyuna oyunu ozmos ozuga öbürü öcünü ödedi ödevi
ödlek ödüle ödülü ödümü ödünç ödünü öfken öğrek öğren öğret öksüz ölçek ölçer ölçme ölçüm ölçün ölçüş ölçüt öldük
öldüm öldün öldür öleli ölene ölgün ölmek ölmem ölmen ölmez ölmüş ölsem ölsen ölsün ölüme ölümü ölüsü ölüye ölüyü
ömrüm ömrün öncel öncül önden önder öneme önemi öneze önlem önler önlük önsel önüme önümü önüne önünü öpmek öptüm
öptün örcin öreke örgen örgün örgüt örmek örtme örtük örtün örtüş örücü örülü ötede öteki ötesi öteye ötmek ötücü
ötürü övmek övücü övünç özdek özden özdeş özeme özenç özeni özerk özeti özgül özlük öznel özrün özsel özüne özünü
pabuç paçal paçoz padok pafta pagan pahal palan palas palaz palet pampa panel panik papak papaz papel paraf param
paran parkı parpa parsa parya pasaj pasak paslı pasör paşam patak patik paunt payan payda payen payet payım payın
paylı pazen peçiç pedal peder pekçe pelin pelit pelte pelür pelüş penes pengö penis pense penye peren perki perma
permi peron perva pesek pesüs peşin peşli petek peyda peyke pıhtı pınar pırıl pırpı pırtı pısma pigme pikaj pikap
piket piliç pilli pinel pines pinti pipet pirit pisik pisin piste pisti pişek pişik pişim pişir pişme pişti piton
piyan piyaz piyes piyon plağı plaja plajı plana planı plase plati plato plaza plöra poker polar polat polen polip
polis polka pomat pompa ponje ponza popçu popom popon porno porte porto postu potas potin potuk potur poyra pöçük
prafa prese print prova pruva puanı pudra pufla pulcu pullu puluç pumba punto pusat puset puslu pusma pünez püren
pürüz püskü püsür pütür rabbi rabıt racon radde radon rafit rafta rafya ragbi rahim rahip rahle rahne rakım rakik
rakit rakor rakun ralli ramak rambo rampa randa ranza rasat rasıt raspa ratıp raund raunt rayiç reaya rebap recep
recim redif refik refüj rehin reisi rejim rekiz remel remil remiz renge rengi resen resif resme resmi resul reşit
reşme revaç revak revan revir reviş reybi reyon rezil rızık rical ricam ricat rimel ringa ringe riske riski ritmi
riyal rodaj rodeo rolcü rolüm rolün rosto rotil rotor röfle rögar rötar rötuş rubai ruble rugan ruhen ruhla ruhlu
ruhum ruhun rujlu rulet rumba rumuz runik rusça rusya rüesa rükün rüküş rüsum rüsup rüsva rütbe rüyam rüyan rüyet
saate saati saban sabık sabrı sabuh sabur saçak saçan saçık saçım saçın saçış saçlı saçma sadak sadet sadır sadik
sadme safça safer safha safir safra sagar sağcı sağda sağım sağın sağır sağla sağma sağrı sahaf sahan sahih sahip
sahra sahre sahte sahur saika sakaf sakak sakat sakın sakıt sakil sakim sakit sakla salah salak salam salaş salat
salcı salça saldı salgı salık salın salik salim salip salla sallı salma saloz salpa salsa salta salto salvo salya
samba samsa samur samut sanan sancı sandı sanem sangı sanık sanıp sanır sanki sanlı sanma sanrı sapak sapan sapık
sapış sapkı sapla saplı sapma saraç sarak saran sarar sarat sardı sargı sarık sarıl sarım sarın sarıp sarış sarig
sarih sarpa sarpi satan satar saten sathi satıh satım satın satıp satir satma sattı sauna savak savan savaş savat
savca savcı savla savma savun sayaç sayan sayar sayha sayım sayın sayıp sayış sayma sayrı sazak sazan sazcı sazlı
seans sebat sebil secde seçal seçen seçer seçik seçin seçip seçiş seçki seçme seçti sedan sedir sedye sefih sefil
sefir seher sehim sehiv sekel sekiş sekme seksi sekte selef selek selen selim selis selva semah semai seman semen
semer semih semiz sence sende senek senet senin senir senit senle sense sepek sepya serak serap serdi seren serim
seriş serme serum servi sesçi sesim sesin sesle seter setik setir setre sette sevap sevda sevdi seven sever sevim
sevin sevip seviş sevme seyek seyis seyit sezgi seziş sezme sezon sıçan sıçma sıçra sıfat sığar sığın sığır sığla
sığma sıhhi sıhri sıkan sıkar sıkça sıkım sıkın sıkıp sıkıt sıkma sıktı sımak sınai sındı sınık sınma sıram sıran
sırat sırça sırık sırım sırlı sırma sırra sırrı sırta sırtı sıska sıtma sıvık sıyga sıygı sızak sızan sızdı sızıp
sızış sızma sicil sicim sidik sifin sifon sigar siğil sihri sikke silah silaj sildi siler silik silin silip silis
siliş silki sille silme simge simya sinik sinir siniş sinle sinme sinsi sinüs siper sipsi sirer sirki sirmo siroz
sirto sisin sisli sitem sitil siyak siyek siyer siyme sizce sizde sizin sizle sizse skala sking skoru slayt sofra
softa sokan sokar soket sokma sokra soktu sokum sokun sokup sokur sokuş solar solcu solda solma soluş somak somun
somya sonar sonat sonda sonla sonlu sonra sonum sonun soran sorar sordu sorgu sorit sorma sorti sorum sorun sorup
soslu soyan soydu soyka soyma soyun soyup soyuş soyut söğüş sökel söker sökme sökük sökül söküm sökün söküp söküş
sölom söndü sönen sönme sönük sönüm söven sövgü sövme sövüş söyle sözce sözcü sözde sözel sözlü sözüm sözün spazm
sperm spora sporu stant statü steno stent stili stilo streç suare subay subra subye sucul suçla suçlu suçum suçun
sudak sudan sufle sukut sulak sular sulta suluk sumak sunak sunan sunar sundu sungu sunma sunta sunun sunuş suoku
supap surat suret susak susan susar susku susma susta sustu susun susuş suvat suyla suyuk suyum suyun sübek sübut
sübye sücut süfli süiti sükse süluk sülük sülün sülüs sümek sümen sümük süngü sünme süper sürdü sürek sürem süren
sürer sürfe sürgü sürme sürre sürse sürur sürüm sürün sürüp süsen süsme sütçü sütle sütre sütsü sütun sütün süven
süyek süyüm süzek süzgü süzme süzük şaban şaful şahap şahım şahıs şahit şahne şahsi şaibe şaire şakak şakul şalak
şaman şamar şamil şanlı şansa şansı şapçı şaplı şarap şarjı şarki şarpi şartı şaryo şaşaa şaşma şataf şatır şavul
şayak şayan şayet şayia şayka şebek şedde şedit şefik şefim şefin şefle şehit şehla şehre şehri şekel şekle şekli
şekva şelek şemse şepit şeran şerha şerif şerik şerir şetim şeyde şeydi şeyim şeyin şeyle şeyse şınav şıpka şırak
şifon şiiri şilem şilep şilin şilte şimal şimdi şinik şişek şişko şişme şişti şokta şopar şoset şoson şovda şoven
şovum şovun şölen şömiz şöyle şuara şudur şunca şunda şunun şurup şuydu şükür şümul taban tabii tabip tabir tabla
tabur tabut tabya tacil tacir taciz taçlı tadat tadım tadın tadil tafra tafta tahin tahra tahtı takan takar takas
takat takıl takın takıp takim takip takke takma takoz taksa taktı takti takva talak talan talaş talaz talep talih
talik talil talim talip tamah tamam tamik tamim tamir tanem tanen tango tanık tanım tanır tanış tanıt tanin tankı
tanrı tapan tapış tapir tapma tapon tarak taraş taraz taret tarik tariz tartı tarzı tasar tasdi tasım tasma tasni
taşan taşçı taşıl taşım taşın taşır taşıt taşla taşlı taşma taşra taşsı taştı tatar tatma tavaf tavcı tavik taviz
tavlı tavrı tavus tayfa tayga tayın tayin tayip tazim tazip taziz teali teati tebaa teber tecil tecim tedai tedip
tefek teğet tehir teizm tekçi tekel tekil tekin tekir tekit tekke tekli tekst telef telek telem teles telif telin
telis telli telsi telve temek temin tempo tenge tenha tenim tenin tenli tenor tente tenya tepem tepik tepir tepiş
tepke tepme tepti terbi terek teres terfi terki terli terme terör tersi tesir tesis tesit tesri teste testi teşci
teşne teşri teşyi tetik tetir tevdi tevek tevil tevki tevsi tevzi teybi teyel teyit tezat tezce tezek tezli tıbba
tıbbı tıbbi tıfıl tıkaç tıkım tıkır tıkız tıkla tıkma tımar tınaz tınma tıpış tıpkı tıpta tırak tırık tırıl tırıs
tibet tifüs tikel timüs tiner tipim tipin tipli tipte tiraj tiran tirat tirit tiriz tirle tirsi tirşe titan tokaç
tokat toklu tokuş tokuz tokyo tolga tomak tomar tonaj tonda toner tonga tonik tonla tonoz tonya topak topal topaz
topçu topik topla topum topun topur toput torak torik torna tortu torum tostu tosun total totem toyca toycu toyga
tozan tozlu törel törpü tövbe tözel trafo trake trans tranş trata trene treni trias triko tromp tröst tufan tugay
tuğcu tuğlu tuğra tuluk tulum tulup tuman tumba tunik tunus turaç turba turbo turda turfa turna turne turno turun
tutaç tutak tutan tutar tutma tuttu tutuk tutum tutun tutup tutuş tutya tuyuğ tuzcu tuzla tuzsu tüfek tükür tümce
tümel tümen tümör tümür tünek tünme tüpçü tüplü türap türbe türde türel türev türlü türüm türün tüten tütme tütsü
tütün tüvit tüyme tüzel tüzük tvist ucube ucuna ucunu ucuza uçağa uçağı uçarı uçkun uçkur uçmak uçman uçmaz uçmuş
uçsuz uçtan uçtum uçtun uçucu uçuşa uçuşu uğrak uğrar uğraş uğrun ukala uknum ulama ulema ulufe uluma ulusa ulusu
umacı umdum ummak umman umuda umudu umumi unluk unsur unvan urgan usanç usare uskur ussal ustam usulü uşağı uşkun
uşşak utanç utmak uydum uydur uygar uykum uykun uyluk uymak uymaz uyruk uyudu uyuma uyumu uyuya uzadı uzağa uzama
uzaya uzayı uzlet uzluk üçgül üçler üçlük üçtaş üçten üçünü üdeba üfleç üğrüm ülfet ülger ülkem ülken ülser ümera
ümidi ümmet ümran ündeş ünite ünlem ünsüz ününü ürdün üreme üremi ürkek ürkme ürküş ürüme ürünü üryan üsera üsküf
üslup üssün üstel üsten üstlü üstte üstüm üşenç üşmek üşüme ütmek ütücü ütülü üyesi üzdüm üzere üzeri üzlük üzmek
üzücü üzümü üzünç vacip vahim vahit vahiy vahşi vakar vakfe vakfı vakıa vakıf vakte vakti vakum vakur valör varak
varan varda vardı vargı varım varıp varır varız varil varis varit varma varoş varsa varta vasat vasıf vasıl vaşak
vatka vatoz vazıh vebal vecih veciz veçhe vedia vefat vehim vekil velet velev velur velut venüs verdi verem veren
verev verim verin verip verir veriş verit verme verse vezin vezir vezne vıcık vigla vinci viraj viral viran visal
viski vitir viyak viyol vizon vizör vokal volan volta vonoz votka voyvo vukuf vulva vuraç vuran vurdu vurgu vurma
vuruk vurun vurup vurur vuruş vusul vuzuh vürut vüsat yaban yabgu yafta yağan yağar yağcı yağda yağdı yağır yağış
yağız yağla yağma yahey yahni yahşi yahut yakan yakar yakım yakıp yakış yakin yakma yaktı yalak yalan yalaz yalım
yalın yalız yalpa yalpı yamaç yamak yaman yamçı yamuk yanal yanan yanar yanay yancı yanda yandı yangı yanım yanın
yanıp yanış yankı yanlı yanma yansı yapak yapan yapar yapık yapım yapın yapıp yapış yapıt yapma yapsa yaptı yaram
yaran yarar yaraş yarat yarda yarga yargı yarık yarıp yarka yarma yasal yaslı yasma yassı yaşar yaşça yaşım yaşın
yaşıt yaşta yatan yatar yatçı yatık yatım yatın yatıp yatır yatış yatma yatsı yattı yatuk yavan yaver yavsı yavuz
yayan yayar yaygı yayık yayım yayış yayla yaylı yayma yazan yazdı yazgı yazın yazıp yazış yazıt yazma yedik yedim
yedin yediz yedme yeğen yeğin yeğni yekta yeleç yelin yelli yelme yelve yemci yemem yemen yemez yemin yemiş yendi
yenen yener yengi yenik yenip yenir yenli yenme yerde yerdi yerel yerey yergi yerim yerin yeriz yerle yerme yerse
yesek yesem yesin yeşim yeten yeter yetik yetim yetiş yetke yetme yetti yevmi yeygi yezit yığış yığma yıkan yıkar
yıkık yıkıl yıkım yıkıp yıkış yıkma yıktı yılda yıldı yılgı yılık yılım yılın yılkı yılki yılma yırık yirik yitik
yitim yitip yitme yivli yiyen yiyim yiyin yiyip yiyiş yiyor yobaz yokçu yoksa yoktu yokum yokuş yokuz yolak yolda
yoldu yolla yollu yolma yoluk yolum yolun yonca yonga yonma yontu yordu yorga yorma yortu yosma yönde yönlü yörük
yufka yukaç yular yumak yumma yumru yumuk yunak yunan yunma yurda yurdu yutak yutar yutma yuttu yutum yuvak yuvam
yuvar yuvgu yükçü yükle yüklü yüküm yükün yülgü yülük yünlü yürük yürür yüsrü yüzde yüzen yüzer yüzle yüzlü yüzüm
yüzün yüzüp yüzüş zaafı zabıt zabit zağar zağcı zağlı zahir zahit zalim zamir zamlı zamme zanka zanlı zarcı zarfı
zarsı zarta zaten zeban zebun zecir zefir zehap zehir zehri zeker zelil zelve zenci zenne zerde zeval zevat zevce
zevke zevki zeyil zıbın zıhlı zımba zımni zıpır zıpka zıpla zırhı zırva zıttı zıvır zifaf zifin zifir zifos zigon
zigot zihaf zihni zikir zilli zimmi zinde zirai ziyan zloti zombi zorba zorca zorda zordu zorgu zorla zorlu zuhur
zulüm zübde zühul zülal zülüf zümre züppe zürra züyuf
`.trim().split(/\s+/);
const lists = { answers, allowed: answers.concat(extra) };
(typeof window !== 'undefined' ? window : globalThis).KELIME_WORDS = lists;

if (typeof module !== 'undefined' && typeof require !== 'undefined' && require.main === module) {
  const assert = require('assert');
  const RE = /^[abcçdefgğhıijklmnoöprsştuüvyz]{5}$/u;
  const check = (name, arr) => {
    const bad = arr.filter(w => Array.from(w).length !== 5 || !RE.test(w));
    assert.deepStrictEqual(bad, [], `${name}: invalid words`);
    const seen = new Set(), dup = arr.filter(w => (seen.has(w) ? true : (seen.add(w), false)));
    assert.deepStrictEqual(dup, [], `${name}: duplicates`);
  };
  check('answers', lists.answers);
  check('allowed', lists.allowed);
  const all = new Set(lists.allowed);
  assert.deepStrictEqual(lists.answers.filter(w => !all.has(w)), [], 'answers must be inside allowed');
  assert.ok(lists.answers.length >= 300, 'need at least 300 answers');
  assert.ok(lists.allowed.length >= 1500, 'need at least 1500 allowed words');
  assert.ok(!/[âîûÂÎÛ]/.test(lists.allowed.join('')), 'no circumflex letters');
  console.log(`kelime-words ok · ${lists.answers.length} answers · ${lists.allowed.length} allowed`);
}
})();
