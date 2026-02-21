# TÜİK Bitkisel Üretim Sayfaları — Kaynak Değişikliği & Derinlemesine Analiz Planı

## 1. Mevcut Durum Analizi

### 1.1 Veri Kaynakları

| Sayfa | Route | Mevcut Kaynak | Kapsam |
|-------|-------|---------------|--------|
| ProductionPage | `/turkey/plant-production` | `tuik_bitkisel_uretim` | ✅ Zaten TÜİK |
| TuikPlantProductionPage | `/turkey/tuik-plant` `/turkey/provincial` | `tuik_bitkisel_uretim` | ✅ Zaten TÜİK |
| CerealProductionPage | `/turkey/cereals` | `fao_uretim_son` | ❌ FAO (dünya) |
| VegetableProductionPage | `/turkey/vegetables` | `fao_uretim_son` | ❌ FAO (dünya) |
| FruitProductionPage | `/turkey/fruits` | `fao_uretim_son` | ❌ FAO (dünya) |
| LegumeProductionPage | `/turkey/legumes` | `fao_uretim_son` | ❌ FAO (dünya) |
| OilseedProductionPage | `/turkey/oilseeds` | `fao_uretim_son` | ❌ FAO (dünya) |
| NutProductionPage | `/turkey/nuts` | `fao_uretim_son` | ❌ FAO (dünya) |
| SugarCropProductionPage | `/turkey/sugar-crops` | `fao_uretim_son` | ❌ FAO (dünya) |
| BeverageCropPage | `/turkey/beverages` | `fao_uretim_son` | ❌ FAO (dünya) |
| FiberCropPage | `/turkey/fiber-crops` | `fao_uretim_son` | ❌ FAO (dünya) |

### 1.2 Mevcut FAO Sayfalarının Sunduğu Analizler
- Ürün bazlı üretim (dünya toplamı, tek yıl)
- Ülke sıralaması (Top 20)
- Pie chart (pay dağılımı)
- Treemap
- Radar chart
- **Eksikler**: İl bazlı veri yok, zaman serisi yok, alan/verim yok, bölge yok

### 1.3 Yeni Veri Kaynağı: `tuik_bitkisel_uretim`

**275.099 satır** — İlçe/İl/Bölge/Ülke düzeyinde, 2004–2024 arası, 230 ürün

| Kolon | Açıklama | Örnek |
|-------|----------|-------|
| `duzey` | İlçe / İl / Bölge / Ülke | `il`, `ilçe`, `bölge`, `ülke` |
| `duzeykod` | 1=ülke, 2=bölge, 3=il, 4=ilçe | 3 |
| `yer` | Coğrafi birim adı | `Ceyhan`, `ADANA`, `Akdeniz` |
| `ili` | İl adı (üst düzey) | `ADANA` |
| `urun_grup` | Ana kategori (4 adet) | Aşağıda |
| `urun` | Ürün adı (230 adet) | `Buğday, Durum Buğdayı Hariç` |
| `unsur` | Ölçüm türü (7 adet) | Aşağıda |
| `birim` | Birim | `Ton`, `Dekar`, `Kg/Dekar` |
| `y2004`–`y2024` | Yıllık değerler | 16400000 |

**Ürün Grupları (urun_grup):**
1. `Tahıllar Ve Diğer Bitkisel Ürünler` — 89 ürün
2. `Meyveler Içecek Ve Baharat Bitkileri` — 63 ürün
3. `Sebzeler` — 56 ürün
4. `Süs Bitkileri` — 22 ürün

**Unsurlar:**
- `Üretim` (Ton)
- `Ekilen Alan` (Dekar)
- `Hasat Edilen Alan` (Dekar)
- `Verim` (Kg/Dekar)
- `Meyve Veren Yaşta Ağaç Sayısı` (Adet)
- `Meyve Vermeyen Yaşta Ağaç Sayısı` (Adet)
- `Toplu Meyveliklerin Alanı` (Dekar)

**Bölgeler (12 TÜİK İstatistiki Bölge):**
Akdeniz, Batı Anadolu, Batı Karadeniz, Batı Marmara, Doğu Karadeniz, Doğu Marmara, Ege, Güneydoğu Anadolu, İstanbul, Kuzeydoğu Anadolu, Orta Anadolu, Ortadoğu Anadolu

**İl Sayısı:** 82 (tüm Türkiye illeri)

---

## 2. Strateji

### 2.1 Temel Karar
FAO sayfaları (`/turkey/cereals`, `/turkey/vegetables`, vb.) **dünya verisi** gösteriyor — Türkiye'nin dünya içindeki konumunu göstermek açısından değerli. Bu sayfaları **silmeyip** `/world/*` rotasında tutuyoruz.

**`/turkey/*` rotalarındaki 9 sayfa** → `tuik_bitkisel_uretim` kaynağına geçirilecek ve **derinlemesine Türkiye-içi analiz** sunacak.

### 2.2 Ürün Grubu ↔ Sayfa Eşlemesi

| Mevcut Sayfa | urun_grup filtresi | Ek filtre |
|---|---|---|
| `/turkey/cereals` | `Tahıllar Ve Diğer Bitkisel Ürünler` | Tahıl ürünleri (Buğday, Arpa, Mısır, Çavdar, Yulaf, Pirinç…) |
| `/turkey/vegetables` | `Sebzeler` | Tüm sebzeler |
| `/turkey/fruits` | `Meyveler Içecek Ve Baharat Bitkileri` | Meyve alt kümesi |
| `/turkey/legumes` | `Tahıllar Ve Diğer Bitkisel Ürünler` | Baklagiller (Mercimek, Nohut, Fasulye, Bezelye…) |
| `/turkey/oilseeds` | `Tahıllar Ve Diğer Bitkisel Ürünler` | Yağlı tohumlar (Ayçiçeği, Soya, Kanola…) |
| `/turkey/nuts` | `Meyveler Içecek Ve Baharat Bitkileri` | Sert kabuklu (Fındık, Ceviz, Badem, Fıstık…) |
| `/turkey/sugar-crops` | `Tahıllar Ve Diğer Bitkisel Ürünler` | Şeker bitkileri (Şeker Pancarı) |
| `/turkey/beverages` | `Meyveler Içecek Ve Baharat Bitkileri` | İçecek bitkileri (Çay, Kahve) |
| `/turkey/fiber-crops` | `Tahıllar Ve Diğer Bitkisel Ürünler` | Lif bitkileri (Pamuk, Keten, Kendir) |

---

## 3. Yeni Sayfa Mimarisi — Ortak Bileşen (TuikPlantCategoryPage)

9 sayfa neredeyse aynı yapıyı paylaşacak. **Tek bir yeniden kullanılabilir bileşen** (`TuikPlantCategoryPage.tsx`) oluşturulacak; her rota sadece konfigürasyon (başlık, ürün filtresi) geçecek.

### 3.1 Props

```typescript
interface TuikPlantCategoryPageProps {
  title: string;               // "Tahıl Üretimi"
  subtitle: string;            // "Buğday, arpa, mısır ve diğer tahılların il bazlı üretim analizi"
  urunGrup?: string;           // "Tahıllar Ve Diğer Bitkisel Ürünler"
  urunFilter?: string[];       // Ürün adı alt kümesi (opsiyonel; boşsa urun_grup'un tamamı)  
  defaultProducts?: string[];  // Varsayılan seçili ürünler
  icon?: string;               // Emoji
}
```

### 3.2 Filtreler
1. **Ürün Seçimi** — multi-select checkbox dropdown (DB'den dinamik yüklenir)
2. **Yıl Seçimi** — 2004–2024 slider veya dropdown
3. **Unsur Seçimi** — Üretim / Ekilen Alan / Hasat Edilen Alan / Verim
4. **Bölge Filtresi** — 12 TÜİK bölgesi + "Tümü"
5. **İl Filtresi** — 82 il + "Tümü" (bölge seçimine göre cascade)

### 3.3 KPI Kartları (6 adet)

| KPI | Hesaplama |
|-----|-----------|
| Toplam Üretim | `SUM(y{yıl}) WHERE unsur='Üretim' AND duzeykod='3'` |
| Toplam Ekili Alan | `SUM(y{yıl}) WHERE unsur='Ekilen Alan' AND duzeykod='3'` |
| Ortalama Verim | `AVG(y{yıl}) WHERE unsur='Verim' AND duzeykod='3'` |
| Yıllık Değişim (%) | `(y{yıl} - y{yıl-1}) / y{yıl-1} * 100` |
| Top İl | En yüksek üretim yapan il |
| Ürün Çeşitliliği | Seçili filtrede DISTINCT ürün sayısı |

### 3.4 Grafikler (10 adet — derinlemesine analiz)

#### Grafik 1: Yıllık Üretim Trendi (2004–2024)
- **Tip**: ComposedChart (Bar + Line)
- **X**: Yıllar (2004–2024)
- **Y**: Toplam üretim (bar) + YoY değişim % (line)
- **Veri**: `duzeykod='1'` (ülke toplamı)

#### Grafik 2: İl Bazlı Üretim Sıralaması (Top 20)
- **Tip**: Horizontal BarChart
- **Veri**: `duzeykod='3'` (il), seçili yıl

#### Grafik 3: İl Bazlı Pay Dağılımı (Pie)
- **Tip**: PieChart
- **Veri**: Top 10 il + "Diğer"
- **Label**: İl adı + yüzde

#### Grafik 4: Bölge Karşılaştırması
- **Tip**: BarChart (grouped/stacked)
- **X**: 12 bölge
- **Y**: Üretim değeri (seçili yıl)
- **Veri**: `duzeykod='2'`

#### Grafik 5: Ürünler Arası Karşılaştırma
- **Tip**: BarChart (yatay)
- **Veri**: Seçili ürünlerin üretim değerleri
- **Kullanım**: Seçili kategorideki tüm ürünler

#### Grafik 6: Alan–Üretim–Verim İlişkisi (Scatter)
- **Tip**: ScatterChart
- **X**: Ekilen Alan (Dekar)
- **Y**: Üretim (Ton)
- **Bubble Size**: Verim (Kg/Dekar)
- **Her nokta**: Bir il
- **Amaç**: Verimliliği görsel olarak belirleme

#### Grafik 7: İlçe Detayı (Seçili İl İçin)
- **Tip**: BarChart
- **Koşul**: İl seçildiğinde aktifleşir
- **Veri**: `duzeykod='4'` ve `ili='{seçili_il}'`
- **Gösterim**: Top 15 ilçe

#### Grafik 8: Üretim Yoğunlaşması (Treemap)
- **Tip**: Treemap
- **Veri**: İl bazlı üretim payları
- **Renk**: Verim düzeyine göre (koyu = yüksek verim)

#### Grafik 9: Çoklu Yıl Karşılaştırması (Radar)
- **Tip**: RadarChart
- **Eksenler**: Top 6 il
- **Seriler**: 3 farklı yıl (ör: 2015, 2020, 2024)
- **Amaç**: İllerin zaman içindeki göreceli performans değişimi

#### Grafik 10: Verim Trendi & Hasat Oranı
- **Tip**: ComposedChart
- **Bar**: Hasat oranı (Hasat Edilen Alan / Ekilen Alan × 100)
- **Line**: Verim (Kg/Dekar)
- **X**: Yıllar (2004–2024)
- **Amaç**: Verimliliğin zaman serisi analizi

### 3.5 Detay Tablosu
- **Bileşen**: `DetailedTable`
- **Sütunlar**: İl, Üretim (Ton), Ekili Alan (Dek), Verim (Kg/Dek), Pay (%), YoY Değişim (%)
- **Özellikler**: Sıralama, arama, CSV export, pagination
- **Satır tıklama**: İl seçildiğinde ilçe grafikleri aktifleşir

---

## 4. Uygulama Planı (Adımlar)

### Adım 1: Ortak Bileşen — `TuikPlantCategoryPage.tsx`
- Yukarıdaki tüm grafik/filter/KPI mantığını tek bileşende topla
- Props ile konfigürasyon al (başlık, ürün grubu, filtre)
- ~700-800 satır tahmin

### Adım 2: 9 Wrapper Sayfa Dosyasını Güncelle
Her birini 15-20 satırlık wrapper'a dönüştür:

```tsx
// CerealProductionPage.tsx
import TuikPlantCategoryPage from './TuikPlantCategoryPage';

const TAHIL_URUNLER = ['Buğday, Durum Buğdayı Hariç', 'Arpa (Diğer)', 'Mısır (Dane)', ...];

export default function CerealProductionPage() {
  return (
    <TuikPlantCategoryPage
      title="Tahıl Üretimi"
      subtitle="İlçe/İl/Bölge bazlı tahıl üretim analizleri (2004–2024)"
      urunGrup="Tahıllar Ve Diğer Bitkisel Ürünler"
      urunFilter={TAHIL_URUNLER}
      defaultProducts={['Buğday, Durum Buğdayı Hariç', 'Arpa (Diğer)']}
      icon="🌾"
    />
  );
}
```

### Adım 3: Rota & Menü Güncellemesi
- FAO rotaları `/world/*` altında kalır (değişiklik yok)
- `/turkey/*` rotaları aynı path'te kalır ama artık TÜİK verisine bağlanır
- Header menüsünde alt açıklama "TÜİK İl Bazlı" olarak güncellenir

### Adım 4: Build & Test
- TypeScript build doğrulaması
- Her kategori için veri doğruluğu testi

### Adım 5: ProductionPage Güncelleme
- `/turkey/plant-production` zaten TÜİK'e bağlı
- Yeni KPI'lar ve trendlerle zenginleştir

---

## 5. Etkilenen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/pages/TuikPlantCategoryPage.tsx` | **YENİ** — Ortak bileşen |
| `src/pages/CerealProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/VegetableProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/FruitProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/LegumeProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/OilseedProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/NutProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/SugarCropProductionPage.tsx` | Güncelle → wrapper |
| `src/pages/BeverageCropPage.tsx` | Güncelle → wrapper |
| `src/pages/FiberCropPage.tsx` | Güncelle → wrapper |
| `src/components/Header.tsx` | Menü alt açıklama güncelle |

**Toplam**: 1 yeni + 10 güncelleme

---

## 6. Risk & Çıkarımlar

| Risk | Çözüm |
|------|-------|
| Ürün adlarındaki farklılıklar (Buğday vs Buğday, Durum Buğdayı Hariç) | DB'den DISTINCT çekerek ürün listesi oluştur, hardcode en popülerleri |
| Verim verisi sadece bazı ürünlerde var | Verim unsuru yoksa scatter/verim grafiklerini gizle |
| İlçe verisi çok büyük olabilir (duzeykod=4) | Sadece seçili il + seçili ürün için çek, LIMIT uygula |
| `y20xx` kolon yapısı SQL'de zorlaştırıcı | UNPIVOT yerine JSON'da döngüyle yıl çıkar (mevcut pattern) |
| Süs Bitkileri "Adet" biriminde → diğerleri "Ton" | Birim etiketini unsur+birime göre dinamik göster |

---

## 7. Kazanımlar (Mevcut → Yeni)

| Özellik | FAO Mevcut | TÜİK Yeni |
|---------|------------|------------|
| Ülke verisi | ✅ 200+ ülke | ❌ Sadece Türkiye |
| İl bazlı veri | ❌ Yok | ✅ 82 il |
| İlçe bazlı veri | ❌ Yok | ✅ Tüm ilçeler |
| Bölge karşılaştırma | ❌ Yok | ✅ 12 TÜİK bölgesi |
| Zaman serisi | ❌ Tek yıl | ✅ 21 yıl (2004–2024) |
| Alan verisi | ❌ Yok | ✅ Ekilen + Hasat Edilen Alan |
| Verim verisi | ❌ Yok | ✅ Kg/Dekar |
| Ağaç sayısı | ❌ Yok | ✅ Meyve veren/vermeyen yaş |
| Grafik sayısı | 6 | 10 |
| Filtre derinliği | Ürün + yıl | Ürün + yıl + unsur + bölge + il |

---

## 8. Onay Beklenen Kararlar

1. **FAO sayfaları korunsun mu?** (Önerim: Evet → `/world/*` rotasında kalır, `/turkey/*` TÜİK'e geçer)
2. **Ürün eşleme listesi otomatik mi hardcode mu?** (Önerim: DB'den DISTINCT ile otomatik + default seçimler hardcode)
3. **Bu plana onay verilirse uygulamaya başlansın mı?**
