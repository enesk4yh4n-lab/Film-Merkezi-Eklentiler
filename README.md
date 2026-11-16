# Film Merkezi Eklentiler

Kullanıcının seçerek kurduğu site ve çözümleyici paketleri. Depo eklemek paketleri kendiliğinden kurmaz.

## Son güncelleme

**16 Kasım 2026:** **R001 1.0.3** kaynak çözümleme ve **R008 1.0.1** oynatıcı erişim izni düzeltmelerini içerir. Site paketleri, WGT ve SDK değişmedi. [Ayrıntılı sürüm notları](CHANGELOG.md).

| Site | Sürüm | Çözümleyici | Sürüm |
|---|---|---|---|
| P001 | 2.0.7 | R001 | 1.0.3 |
| P002 | 2.0.2 | R002 | 1.0.5 |
| P003 | 1.0.1 | R003 | 1.0.0 |
| P004 | 1.0.3 | R004 | 1.0.0 |
| P005 | 1.0.1 | R005 | 1.0.0 |
| P006 | 1.0.0 | R006 | 1.0.1 |
| P007 | 1.0.2 | R007 | 1.0.1 |
| P008 | 1.0.0 | R008 | 1.0.1 |
| P009 | 1.0.0 | R009 | 1.0.0 |
| P010 | 1.0.0 | R010 | 1.0.0 |
| P011 | 1.0.0 | R011 | 1.0.0 |
| P012 | 1.0.0 | R012 | 1.0.0 |
| P013 | 1.0.0 | R013 | 1.0.0 |
| P014 | 1.0.0 | R014 | 1.0.0 |

Etkin paketlerin toplam ağ izin bütçesi mevcut WGT kapasitesiyle sınırlıdır; bütün paketleri aynı anda kurmak mümkün olmayabilir. İstediğiniz siteleri seçerek kurun.

## Kurulum

Film Merkezi'nde **Güncelleme Merkezi → Depo ekle → GitHub'da depo ara** yoluyla **Film-Merkezi-Eklentiler** aratın. Depoyu inceleyip ekleyin; istediğiniz siteyi seçtiğinizde gerekli çözümleyici kurulum planına alınır.

- WGT **2.0.1**: [filmmerkezi201-repository.json](filmmerkezi201-repository.json).
- WGT **2.0.0**: [filmmerkezi-repository.json](filmmerkezi-repository.json), uyumlu eski sürümlerle korunur.

P002/R002 ana uygulama deposunda da aynı kimlikle sunulur; bir kez kurmanız yeterlidir. Erişim koşulları değişebilir. Paketler sitelerle resmî ortaklık veya içerik/erişim hakkı iddia etmez.

[Ekran görüntülü kılavuz](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/blob/main/docs/DEPO_EKLEME.md) · [Uygulama ve sürüm notları](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi) · [Lisanslar](THIRD_PARTY_NOTICES.md)

<!-- film-merkezi-repository: filmmerkezi-repository.json -->
<!-- film-merkezi201-repository: filmmerkezi201-repository.json -->

## SDK 2.0.1

[Geliştirme kılavuzu](SDK/README.md) · [SDK ZIP](Film-Merkezi-SDK-2.0.1.zip) · [SHA-256](SDK-SHA256SUMS.txt)

SDK yeni 201 listesini üretir; eski imzalı listeyi ve yayıncı anahtarını korur. Çekirdek güncellemeleri ana uygulama deposundadır. Ayrı grafik geliştirme aracı henüz yayımlanmamıştır.
