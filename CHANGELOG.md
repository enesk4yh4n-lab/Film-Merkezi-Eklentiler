# Eklenti sürüm notları

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
