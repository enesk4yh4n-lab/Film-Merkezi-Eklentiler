## Eklenti güncellemeleri · 26 Kasım 2026

- **P013 1.0.2:** Eserin kategori bilgisi, çekirdeğin yetişkin içerik filtresine aktarılır. Filtre için çekirdek 2.1.18 gerekir.
- **P019 / R019 1.0.0:** Film ve dizi kataloğu, arama ve sezon/bölüm listeleri eklendi. VIP ve Moly kaynakları Tizen 3 emülatöründe denendi. Liste ilk sayfayı gösterir.

## P013 1.0.1 / R013 1.0.3 — 25 Kasım 2026

- P013 yeni adresiyle yeniden yayında. Eski içerik bağlantıları aynı kayıt kimliğiyle yeni adrese yönlendiriliyor.

## 25 Kasım 2026 · Depo revizyonu 158

- P001 ve P010 ile çözümleyicileri R001 ve R010 yayından kaldırıldı. Bu değişiklik cihazda kurulu paketleri otomatik olarak kaldırmaz.

## Eklenti güncellemeleri — 24 Kasım 2026

- **R002 1.0.7:** Bazı bölümlerin yeni yayın sunucusu imzalı izin listesine eklendi.
- **R007 1.0.6:** Tizen 6.0’da büyük video parçaları aynı oynatma oturumunda yeniden kullanılıyor. Geri sarma için gereksiz yeniden indirme azaltıldı.
- **P012 1.0.1:** Sağlayıcının geçerli boş arama yanıtı, katalog hatası yerine boş sonuç olarak işleniyor.

## R007 1.0.4 — 20 Kasım 2026

- Tizen 8.0’da bazı yayınların başladıktan kısa süre sonra takılması giderildi. Uygulama bu yayınlar için oynatma motorunu otomatik seçer.

Güncellemeyi **WGT 2.0.3 / çekirdek 2.1.15** ile Güncelleme Merkezi’nden alabilirsiniz.

## R006 1.0.4 — 20 Kasım 2026

- Tizen 3.0’da bazı altyazılı MP4 videoların oynatılması iyileştirildi.
- Tizen 3.0’da ayrı ses izi olan ilgili yayınlar otomatik olarak en fazla 720p ile başlıyor. Elle kalite seçimi kullanılabilir.

Güncellemeyi **WGT 2.0.3 / çekirdek 2.1.15** ile Güncelleme Merkezi’nden alabilirsiniz.

## Eklenti güncellemeleri — 20 Kasım 2026

| Paketler | Değişiklik |
|---|---|
| P001 2.0.8, R001 1.0.5 | Tizen 7’de iki bölüm kaynağının AVPlay ile açılması iyileştirildi. |
| R002 1.0.6, R003 1.0.2, R004 1.0.2 | Tizen 7’de bazı yayınların açılışı düzeltildi. R003’e eksik medya sunucusu izni eklendi. |
| R005 1.0.1, R009 1.0.1, R011 1.0.2, R014 1.0.2 | Kaynağa ve Tizen sürümüne göre motor seçimi iyileştirildi. R009’da geri sarma, R011’de sunucu izni düzeltildi. |
| R006 1.0.3, R007 1.0.3, R008 1.0.3, R012 1.0.2 | Kaynağa göre video parçalarının yüklenmesi, motor seçimi ve ayrı ses izi desteği iyileştirildi. |
| R013 1.0.2 | Kaynak tarama bildirimi düzeltildi. Erişimi kapanan bir kaynak kaldırıldı. |

Güncellemeler için **WGT 2.0.3 / çekirdek 2.1.15** kullanabilirsiniz. Uygulama, kurulu sürüme uygun paketleri seçer.

## Eklenti güncellemeleri — 18 Kasım 2026

| Paketler | Değişiklik |
|---|---|
| P010 1.0.1, P011 1.0.1 | Katalog isteklerinin TV tarayıcısıyla uyumluluğu iyileştirildi. |
| R001 1.0.4, R010 1.0.1, R011 1.0.1, R012 1.0.1 | Bazı içerikler açılırken kullanılan bağlantı ve kaynak okuma yolları güncellendi. R010’da eski bir oynatıcı yanıtı biçimi de düzeltildi. |
| R003 1.0.1, R004 1.0.1, R007 1.0.2, R008 1.0.2 | Yeni Tizen sürümlerinde video listelerini alma uyumluluğu iyileştirildi. R007’de büyük parçalı bir kaynak için özel boyut izni eklendi. |
| R006 1.0.2 | Bir kaynak zaman aşımına uğradığında önceden bulunan seçenekler korunuyor. Eksik medya sunucusu izni eklendi. |
| R013 1.0.1 | Değişen medya sunucularının izinleri güncellendi, yedek sunucuya geçiş iyileştirildi ve kapanan kaynaklar listeden çıkarıldı. |
| R014 1.0.1 | Kaynak tarama durumunun ekrana doğru iletilmesi düzeltildi. |

Güncel depo adresi **filmmerkezi-repository.json**. Uygulama eklentilerin WGT ve çekirdek gereksinimlerini denetler.

**SDK 2.0.2:** Video CDN izinleri tek dosyada tutuluyor. Yeni çözümleyiciler kullandıkları kaynak grubunu seçebiliyor.

## R001 1.0.3 / R008 1.0.1 — 16 Kasım 2026

- **R001 1.0.3:** Close kaynaklarında HTML verisine bağlı anahtar biçimleri ve Rapidrame'in kaynak alanındaki yeni literal çağrı biçimi desteklendi. Site betikleri çalıştırılmaz; ilgisiz/yanıltıcı veriler kaynak sayılmaz.
- **R008 1.0.1:** Gerçek oynatıcı kökenine ait eksik ağ izni eklendi. Çalıştırılabilir çözümleyici kodu değişmedi.
- İlgili kısa Tizen 3 emülatör oynatma, duraklatma/devam ve eski yanıt kontrolleri geçti. Bu tur fiziksel TV sesi/senkronu kabulü değildir.

**P001/P008 site paketleri ve diğer 26 depo girdisi değişmedi.** WGT ve SDK güncellemesi gerekmez; mevcut minimum WGT 2.0.1 / çekirdek 2.1.8 koşulları korunur. Ayrı çekirdek 2.1.9 güncellemesi uygulama deposundan sunulur. TLS, imzalar ve izin sınırları açık kalır.

## P008–P014 1.0.0 / R007 1.0.1 — 15 Kasım 2026

- **P008–P014 ve R008–R014 1.0.0:** yedi yeni site ve bunların bağımsız çözümleyici paketleri eklendi. Katalog, arama ve sitenin sunduğu gerçek içerik/bölüm bilgileri desteklenir.
- **R007 1.0.1:** KSD kaynağının izinli büyük medya parçaları mevcut 24 MiB WGT tavanına uygun yüklenir; diğer kaynakların varsayılan sınırı korunur.
- **P010/P011:** katalog metni taşıma uyumu; **R011:** gerçek medya sunucusu izinleri düzenlendi.
- **R012:** ek HLS ve MP4 kaynakları, oturumluk MP4 Range yükleyicisi ve çoklu kalite desteği eklendi.
- **P013/R013:** native metin taşıması, aktif kaynakların ayrıştırılması, video kimliği ve altyazı doğrulaması; resmî fragmanın tam bölüm gibi sunulmaması düzenlendi. **R014:** Referer uyumu düzeltildi.
- İlgili kısa Tizen 3 TV oynatma ve kontrol turları yapıldı. Bu, her içerik ve kaynak için kesintisiz oynatma garantisi değildir. TLS ve paket imzaları korunur.

Yeni paketler yalnız **WGT 2.0.1 / çekirdek 2.1.8** ile çalışan `filmmerkezi201-repository.json` listesinde sunulur. Önceki WGT 2.0.0 listesi ve paketleri korunur. Toplam izin bütçesi WGT kapasitesine tabidir. WGT, çekirdek, SDK ve Apps2Samsung kaydı bu yayında değişmez.

## WGT 2.0.1 / Çekirdek 2.1.8 — 14 Kasım 2026

- Ana menüye **ÇizgiFilm/Anime** ve **Drama/Short** eklendi; Keşfet kaldırıldı. Drama/Short, Kore/Asya ve kısa bölümlü diziler içindir.
- Yeni bölümleri destekleyen P001 **2.0.7**, P004 **1.0.3**, P007 **1.0.2** hazırlandı. R paketleri değişmedi.
- Kumanda odağı, menü geçişleri ve kaydırılmış listeden araçlara dönüş düzenlendi.
- İlk kurulum öncesi çekirdek denetimi WGT'ye bağlandı; güncelleme yoksa kurulum normal devam eder.
- Native taşımanın tavanı **24 MiB** oldu. Varsayılan 8 MiB ve daha küçük istek sınırları korunur; kullanılacak miktarı çekirdek belirler.
- Paket temizliği bitmeden yeni iş başlamasına izin veren işlem kilidi hatası düzeltildi.
- Yeni çekirdek kanalı **github-eklenti/201/update.json**, yeni eklenti listesi **filmmerkezi201-repository.json**. Eski WGT 2.0.0'ın kanalı, imzalı listeleri ve uyumlu paketleri korunur.
- SDK **2.0.1**, yeni listeyi üretir; mevcut yayıncı anahtarını ve eski listeyi korur.

**Kurulum:** Yeni çekirdek ve kategori özellikleri için WGT 2.0.1 kurulmalıdır. Eski WGT'ye uyumsuz paket sunulmaz. Hazır depo veya site eklenmez; TLS ve imza doğrulaması açık kalır.

Tizen 3 emülatörü ve gerçek TV'de ilgili kısa kurulum/güncelleme/menü kontrolleri yapıldı. Bu yayın için yeni kapsamlı oynatma/ses testi yapılmadı.


# Eklenti sürüm notları

## P001 2.0.6 — 14 Kasım 2026

- Yeni eklenenler, En Çok İzlenenler ve 16 tür için hazır katalog filtreleri eklendi. Tür değerleri sitenin güncel seçeneklerinden okunur.
- Tür, sıralama ve sayfalama sorguları doğru filtre API'sine gönderilir. Önceki yerel adayın genel liste döndürme hatası giderildi.
- Emülatörde Aksiyon, Komedi ve Bilim Kurgu farklı listeler döndürdü; altı örnek filmin detay türü seçilen türle eşleşti. Ortak katalog filtresi de sınandı.
- Minimum çekirdek **2.1.5** gerekir. **R001 değişmedi.** Bu yayında diğer P/R paketleri korunur.

## P002 2.0.2 — 13 Kasım 2026

- P002'nin kendi CDN'sinden liste için küçük, detay/vitrin için daha büyük afiş indirilir; yüksek çözünürlüklü orijinal TV'de küçültülmez.
- Örnek afişte liste dosyası **336.353 → 40.594 bayt**, ham RGBA görüntü hesabı **9,84 → 0,71 MiB**. Gerçek TV toplam bellek kazancı olarak yorumlanmamalıdır.
- Minimum çekirdek **2.1.4** gerekir; önce çekirdeği güncelleyin. **R002 1.0.5 değişmedi.**
- P002'nin iki depodaki sürümü, imzası ve dosya özetleri aynıdır.

Bu yayında güncellenen eklenti yalnız P002'dir. Diğer P/R paketleri değişmedi. SDK belgesine isteğe bağlı posterLarge alanı eklendi; SDK araç sürümü korunur.

## Site güncellemeleri — 13 Kasım 2026

Güncellemeleri uygulamadaki **Güncelleme Merkezi → Kontrol et** üzerinden yükleyebilirsiniz. Önce çekirdeği **2.1.3** sürümüne güncellemeniz önerilir.

| Paket | Yeni sürüm | Değişiklik |
| --- | --- | --- |
| **P001** | **2.0.5** | Sitenin kendi arama önerileri eklendi. Birleşik başlıklı öneriler için uygun arama metni hazırlanıyor; eski önbellekten gelen önerilerde de aynı düzeltme uygulanıyor. |
| **P002** | **2.0.1** | Ortak aramadaki eser doğrulamasında tam bölüm listesi yerine hafif kimlik bilgileri kullanılarak gereksiz işlem yükü azaltıldı. |
| **P003** | **1.0.1** | Arama, sitenin kendi arama yanıtındaki dizi sonuçlarını kullanacak şekilde düzenlendi. Türkçe sorgu uyumu ve eser bilgisi doğrulaması iyileştirildi; gereksiz arşiv/bölüm taraması azaltıldı. |
| **P004** | **1.0.2** | Eser kimliği, yıl ve tür bilgilerinin okunması geliştirildi. Gerçek sezon/bölüm yapısı bulunan içeriklerde yanlış Film etiketi düzeltilebiliyor. |
| **P005** | **1.0.1** | Ortak aramadaki eser doğrulaması hafifletildi; kimlik bilgisi almak için gereksiz bölüm listesi toplanması azaltıldı. |
| **P007** | **1.0.1** | Ortak aramadaki eser doğrulaması hafifletildi; kimlik bilgisi almak için gereksiz bölüm listesi toplanması azaltıldı. |

P002 güncellemesi, ana uygulama deposunda ve eklenti deposunda aynı paket olarak sunulur. Bu yayında **R çözümleyici paketleri ve SDK değişmemiştir**.

Site bilgilerinin eksik olduğu kayıtlar kesin eşleşme olarak kabul edilmez. Bu güncellemeler bütün içeriklerin birleşeceği veya her kaynağın her zaman erişilebilir olacağı anlamına gelmez.
