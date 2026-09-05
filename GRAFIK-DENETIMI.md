# Grafik denetimi

363 grafik tarandı. Her iddia ölçümle: kaynak kodda desen sayımı, tarayıcıda
canlı SVG geometrisi. Ölçülmemiş hiçbir şey yazılmadı.

| | |
|---|---|
| Toplam grafik | 363 |
| BarChart / ComposedChart / AreaChart | 137 / 65 / 62 |
| PieChart / LineChart | 37 / 33 |
| ScatterChart / RadarChart / RadialBar | 14 / 14 / 1 |
| Zaman serisi (Line + Area + Composed) | 160 |
| **Y ekseni domain'i hiç yazılmamış zaman serisi** | **130 (%81)** |

---

## 1. Asıl kusur: eksen sıfırdan başlıyor, yıllar birbirinden ayırt edilemiyor

Bu, sayfalardaki en yaygın ve en pahalı hata. Recharts'ta `<YAxis>`'e `domain`
verilmezse eksen **sıfırdan** başlar. Çubuk grafikte bu doğru — çubuğun boyu
alanla orantılı olmalı. **Çizgi ve alan grafiğinde yanlış**: seri 21–23 milyon
ton arasında geziniyorsa ve eksen 0'dan 24 milyona uzanıyorsa, verinin tamamı
çizim alanının %8'ine sıkışır. Ekranda düz bir çizgi görürsün. Yıldan yıla fark
vardır ama görünmez.

Ölçüm: her grafiğin çizgi yolundaki (`path d`) en yüksek ve en alçak `y`
koordinatı alındı, ızgara yüksekliğine bölündü. Sonuç = verinin kapladığı bant.

### Canlıda ölçülen en kötüler

| Sayfa | Grafik | Verinin kapladığı bant |
|---|---|---|
| Süt | Son 5 Yıl Toplam Üretim Trendi | **%8** |
| Yumurta | Yem Fiyatı ve Paritesi (parite şeridi) | **%9** |
| Arıcılık | Arıcı Sayısı Gelişimi | **%17** |
| Hayvansal üretim | Tavuk Eti Üretimi (Aylık Trend) | **%20** |
| Hayvansal üretim | Yumurta Üretimi (Aylık Trend) | **%20** |
| Dünya kırmızı et | Yıllık Üretim Trendi | **%25** |
| Beyaz et | Yem Fiyatı ve Paritesi (parite şeridi) | **%26** |
| Yumurta | İhracat vs İthalat Trendi (M$) | **%31** |
| Dünya süt | Yıllık Üretim Trendi | **%39** |
| Tahıl | Üretim–Alan–Verim Trendi (endeks) | **%39** |

%8 demek: beş yıllık süt üretimindeki bütün hareket, grafiğin yüksekliğinin
on ikide birine sığdırılmış. O grafiği koymanın hiçbir anlamı yok — okuyucuya
"değişmedi" diyor, oysa 2024→2025'te %4,9 düşmüş.

### Çözüm hazır ama kullanılmıyor

`src/utils/chartTicks.ts` içinde tam bu iş için `LINE_Y_DOMAIN = ['auto','auto']`
tanımlı. **20 dosyada, 25 yerde** kullanılmış. Karşılığında `VALUE_HEADROOM`
(çubuk grafikler için) 48 yerde kullanılmış. Yani araç var, çizgi grafiklerinde
benimsenmemiş.

### Yapılacak

- Zaman serisi çizen **Line/Area/Composed** grafiklerinde `domain={LINE_Y_DOMAIN}`.
- **Çubuk grafiklere DOKUNMA.** Çubuğun boyu alanla anlam taşır; tabanı kesmek
  farkları abartır ve yalan söyler. Sıfırdan başlamaları doğru.
- **Yüzde/oran serilerinde de dokunma** — zaten 0 civarı anlamlı bir referans.
- Kırpılmış eksen okuyucuyu yanıltmasın diye eksen `auto` bırakılıyor, sabit bir
  alt sınır uydurulmuyor.

---

## 2. Başlık artık var olmayan bir grafiği anlatıyor

`egg-production/EggTuikOverviewTab.tsx`:

```
<ChartCard title="Yumurta Üretimi vs Yumurtacı Tavuk (Dual Axis)" …>
```

Grafiğin içi çoktan **endekse** çevrilmiş (tek eksen, ilk yıl = 100) ve kod
yorumunda bu açıkça yazıyor. Ama başlıkta hâlâ "(Dual Axis)" duruyor. Okuyucuya
iki eksenli bir grafik vaat ediyor, tek eksenli endeks gösteriyor. Canlı ölçüm
bandı %0 — çizgi tamamen düz, çünkü endeksin ikinci serisi tek nokta.

Ayrıca "Dual Axis" bir grafik başlığı değil, bir uygulama detayı. Başlık
grafiğin **ne söylediğini** söylemeli.

### Yapılacak
Başlığı içeriğe göre yeniden yaz, "Dual Axis" ibaresini kaldır.

---

## 3. Aylık grafiklerde ay etiketi okunmuyor, mevsimsellik kayboluyor

Hayvansal üretim sayfasındaki iki aylık grafik (%20 bant) 24 ay çiziyor ama
`minTickGap` etiketlerin çoğunu gizliyor. Aynı kusurun yıllık hâli daha önce
düzeltildi (tarihsel trendde 2024 etiketi yoktu). Aylık seride mevsimsellik
asıl bilgi; hangi ayın tepe olduğu görünmeli.

### Yapılacak
Aylık serilerde etiketleri seyreltirken **her ayı değil ama her yılın aynı
ayını** göster; ya da ekseni yıl-ay olarak grupla.

---

## 4. Ne fazla: pasta grafikleri

37 pasta grafiği var. Ölçülen örnekler:

| Sayfa | Pasta | Dilim |
|---|---|---|
| Süt | Türlere Göre Dağılım (2025) | 3 |
| Hayvansal üretim | Kırmızı Et Türlerine Göre Dağılım | 4 |

Üç dilimli pasta, üç sayıyı okumanın en zor yoludur. İnsan açı karşılaştırmada
kötü, uzunluk karşılaştırmada iyidir. Üç değer için ya yatay çubuk ya da düz
metin ("büyükbaş %94,7 · koyun %3,7 · keçi %1,6") her zaman daha okunur.

Pasta yalnızca "parçalar bütünü oluşturuyor ve bütünün kendisi mesajın parçası"
olduğunda savunulabilir — o zaman bile en fazla 5-6 dilim.

### Yapılacak
≤4 dilimli pastaları yatay çubuğa ya da pay şeridine çevir. Süt ve kırmızı et
dağılımları bu kapsamda. Çok dilimlileri (il payları gibi) zaten `topNvediger`
ile "Diğer"e katlıyoruz, onlar kalabilir.

---

## 5. Ne eksik: yıldan yıla fark hiçbir yerde çizilmiyor

Sayfaların tamamı **seviye** gösteriyor: üretim şu kadar ton, kovan şu kadar
adet. Kullanıcının sorduğu soru ise fark: "geçen yıla göre ne oldu?"

Bu bilgi şu an yalnızca KPI kartındaki tek bir yüzdede var (`▼ %10,5`). Grafikte
hiç yok. Seviye grafiğinde farkı gözle çıkarmak zordur — özellikle eksen
sıfırdan başlıyorsa (madde 1) imkânsızdır.

Süt sayfasında "Yıllık Büyüme Oranları (%)" diye bir grafik var ve bandı %71 —
yani doğru kurulmuş ve işe yarıyor. Bu kalıp **yalnızca orada** var.

### Yapılacak
Ana zaman serisi olan sayfalara, seviyenin yanına bir **yıllık değişim** çubuk
grafiği ekle (pozitif yeşil / negatif kırmızı, sıfır çizgisi belirgin). Süt
sayfasındaki mevcut grafik referans alınacak. Bu, kullanıcının "yıldan yıla
farkları gözükmüyor" itirazının doğrudan karşılığı.

---

## 6. Ne eksik: çok serili grafiklerin 24'ünde efsane yok

Kaynak taraması: iki veya daha çok seri çizen ama `<Legend>` içermeyen **24**
grafik. Renk tek başına kimlik taşıyamaz; hangi çizginin ne olduğu ipucuna
gelmeden anlaşılmıyor.

Ayrıca **6 grafikte hiç `<Tooltip>` yok** — değeri okumanın hiçbir yolu kalmıyor.

### Yapılacak
İki+ serili grafiklere efsane, tooltipsiz grafiklere tooltip ekle.

---

## 7. Mükerrer sanılıp öyle olmadığı anlaşılanlar

Dürüstlük gereği: iki bulgu ölçüldükten sonra elendi.

- **"Yem Fiyatı ve Paritesi" aynı sayfada iki kez görünüyordu.** Değil —
  `SplitAxisChart` tek grafiği iki panel olarak çiziyor (üstte ana seri, altta
  parite şeridi). Sayaç iki ayrı `.recharts-surface` görüyor. Kusur değil;
  aksine çift ekseni ortadan kaldırmak için kasıtlı yapılmış.
- **`provincial` ve `plant-provincial` haritaları** az sayıda renk kullanıyor
  diye işaretlenmişti. Başlıkları "Coğrafi Bölgeler" ve kategorik renk
  kullanıyorlar — doğrular.

---

## Öncelik sırası

1. **Zaman serilerinde Y domain** (130 grafik) — en yaygın, en görünür, en ucuz.
2. **Yıllık değişim grafikleri** — kullanıcının asıl istediği bilgi.
3. **"(Dual Axis)" başlığı** — tek satır, yanıltıcı.
4. **Küçük pastalar → çubuk**.
5. **Eksik efsane/tooltip**.
6. **Aylık eksen etiketleri**.
