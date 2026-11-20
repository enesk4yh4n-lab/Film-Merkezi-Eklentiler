# Film Merkezi Eklentiler

Kullanıcının seçerek kurduğu site ve çözümleyici paketleri. Depo eklemek paketleri kendiliğinden kurmaz.

## Son güncelleme

**20 Kasım 2026** · 14 eklentide video açılışı, motor seçimi ve bağlantı iyileştirmeleri yayımlandı. [Ayrıntılı sürüm notları](CHANGELOG.md).

| Site | Sürüm | Çözümleyici | Sürüm |
|---|---|---|---|
| P001 | 2.0.8 | R001 | 1.0.5 |
| P002 | 2.0.2 | R002 | 1.0.6 |
| P003 | 1.0.1 | R003 | 1.0.2 |
| P004 | 1.0.3 | R004 | 1.0.2 |
| P005 | 1.0.1 | R005 | 1.0.1 |
| P006 | 1.0.0 | R006 | 1.0.3 |
| P007 | 1.0.2 | R007 | 1.0.3 |
| P008 | 1.0.0 | R008 | 1.0.3 |
| P009 | 1.0.0 | R009 | 1.0.1 |
| P010 | 1.0.1 | R010 | 1.0.1 |
| P011 | 1.0.1 | R011 | 1.0.2 |
| P012 | 1.0.0 | R012 | 1.0.2 |
| P013 | 1.0.0 | R013 | 1.0.2 |
| P014 | 1.0.0 | R014 | 1.0.2 |

Etkin paketlerin toplam ağ izin bütçesi mevcut WGT kapasitesiyle sınırlıdır; bütün paketleri aynı anda kurmak mümkün olmayabilir. İstediğiniz siteleri seçerek kurun.

## Kurulum

Film Merkezi'nde **Güncelleme Merkezi → Depo ekle → GitHub'da depo ara** yoluyla **Film-Merkezi-Eklentiler** aratın. Depoyu inceleyip ekleyin; istediğiniz siteyi seçtiğinizde gerekli çözümleyici kurulum planına alınır.

Güncel indeks: [filmmerkezi-repository.json](filmmerkezi-repository.json). Güncel uygulamayı [v2.0.3 Release](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/tag/v2.0.3) sayfasından kurabilirsiniz.

P002/R002 ana uygulama deposunda da aynı kimlikle sunulur; bir kez kurmanız yeterlidir. Erişim koşulları değişebilir. Paketler sitelerle resmî ortaklık veya içerik/erişim hakkı iddia etmez.

[Ekran görüntülü kılavuz](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/blob/main/docs/DEPO_EKLEME.md) · [Uygulama ve sürüm notları](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi) · [Lisanslar](THIRD_PARTY_NOTICES.md)

<!-- film-merkezi-repository: filmmerkezi-repository.json -->

## SDK 2.0.2

[Geliştirme kılavuzu](SDK/README.md) · [SDK ZIP](Film-Merkezi-SDK-2.0.2.zip) · [SHA-256](SDK-SHA256SUMS.txt)

Video CDN izinleri [tek dosyada](kaynak/cozumleyiciler/cdn-izinleri.json) tutulur. Çözümleyiciler gereken kaynak gruplarını seçebilir. Çekirdek güncellemeleri ana uygulama deposundadır.
