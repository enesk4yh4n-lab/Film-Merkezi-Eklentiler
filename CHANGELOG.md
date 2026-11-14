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
