# AI Chart Output Contract (Faz 8.2)

Bu dosya, dashboard'daki AI sohbet uçlarının (`api.php?action=ai_chat`) **opsiyonel** olarak grafik üretmesi için kullanması gereken sözleşmeyi tanımlar.

## Çıktı Kuralı

AI cevabı **markdown** olarak döner. Sayısal/karşılaştırmalı bir soru sorulduğunda cevabın içine aşağıdaki formatta `chart-json` kod bloğu **eklenmelidir** (zorunlu değil; gerek yoksa eklenmez):

````
```chart-json
{
  "type": "bar" | "line" | "area" | "pie" | "composed",
  "title": "Kart başlığı",
  "subtitle": "İkinci satır (opsiyonel)",
  "xKey": "kategori|year|name",
  "data": [
    { "year": 2020, "uretim": 1234, "ithalat": 200 },
    { "year": 2021, "uretim": 1300, "ithalat": 220 }
  ],
  "series": [
    { "dataKey": "uretim", "name": "Üretim",  "color": "#3b82f6" },
    { "dataKey": "ithalat", "name": "İthalat", "color": "#ef4444" }
  ],
  "height": 320,
  "unit": "ton",
  "stacked": false
}
```
````

### Alanlar

| Alan       | Zorunlu | Açıklama                                                                        |
|------------|---------|---------------------------------------------------------------------------------|
| `type`     | ✅      | `bar`, `line`, `area`, `pie`, `composed`                                        |
| `data`     | ✅      | Satır bazlı kayıtlar (`xKey` + sayısal alanlar)                                 |
| `xKey`     | ⛔(*)   | X eksen alanı; `pie` için `nameKey` mantığında kullanılır                       |
| `series`   | ⛔      | Atlanırsa data'daki sayısal alanlar otomatik series olur                        |
| `title`    | ⛔      | Kart başlığı                                                                    |
| `subtitle` | ⛔      | Kaynak/açıklama                                                                 |
| `height`   | ⛔      | Yükseklik (px), default 300                                                     |
| `unit`     | ⛔      | Tooltip'te değer yanına eklenecek birim (`ton`, `%`, `USD`)                     |
| `stacked`  | ⛔      | `bar`/`area` için stacking aç/kapat                                             |
| `series[].type` | ⛔ | Sadece `composed` tipinde kullanılır: `bar | line | area`                       |

> (*) `pie` için `xKey` opsiyonel; data ilk string-key'i otomatik seçilir.

### Davranış

- Frontend (`DynamicChart`) bilinmeyen `type` görürse cevabı düz metin olarak gösterir.
- JSON parse hatası olursa frontend bloğu metin olarak render eder (fallback güvenli).
- Markdown'ın geri kalanı normal şekilde gösterilir; sadece `chart-json` bloğu özel render alır.

### Örnek Kullanım

**Soru:** "2020-2023 buğday üretimi nasıl gelişti?"

**Cevap:**
```
Türkiye buğday üretimi 2020-2023 arasında dalgalandı.

```chart-json
{
  "type": "line",
  "title": "Türkiye Buğday Üretimi (bin ton)",
  "xKey": "year",
  "data": [
    {"year":2020,"uretim":20500},
    {"year":2021,"uretim":17650},
    {"year":2022,"uretim":19500},
    {"year":2023,"uretim":21000}
  ],
  "series":[{"dataKey":"uretim","name":"Üretim","color":"#3b82f6"}],
  "unit":"bin ton"
}
```

Özellikle 2021'de %14 düşüş kuraklığa bağlı.
```

## Backend Implementasyon Notları

`server-files/api.php` veya benzeri Gemini/Groq köprüsü içinde **system prompt**'a şu satırlar eklenebilir:

> "Sayısal/karşılaştırmalı sorularda cevabına bir grafik eklemen faydalıysa,
> `chart-json` etiketli bir markdown kod bloğu üret. Şema: AI_CHART_CONTRACT.md.
> Her cevapta MAKS 1 grafik. Veri yoksa veya soru kategorik değilse grafik üretme."

Frontend `fetchAIChat` çağrısı, opsiyonel `chartHint: true` parametresi gönderebilir; backend bu durumda system prompt'a sözleşmeyi enjekte eder.
