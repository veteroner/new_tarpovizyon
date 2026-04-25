# Land Use Transition Matrix Schema

Bu dosya, `public/data/land-use-transition-matrix.csv` için beklenen şemayı tanımlar.

Amaç:
- Sayfa içi varsayılan crosswalk kurallarını veriyle override etmek
- Aynı pipeline'ı ileride bir SQL tablo ya da ETL çıktısıyla besleyebilmek
- `LandUsePage` üzerindeki Sankey sinyalini açık source→target geçiş kurallarıyla üretmek

CSV kolonları:
- `source_item`: Kayıp veren arazi sınıfı
- `target_item`: Kazanç alan arazi sınıfı
- `weight`: Aynı `source_item` için göreli geçiş ağırlığı
- `rationale`: Kuralın nedenini açıklayan kısa not
- `source_system`: Kaynağın geldiği sistem ya da veri kümesi
- `target_system`: Hedef sınıflandırma sistemi
- `valid_from_year`: Kuralın geçerli olmaya başladığı yıl
- `valid_to_year`: Kuralın geçerliliğinin bittiği yıl, boş bırakılabilir
- `notes`: Serbest açıklama alanı

Önerilen tablo şeması:

```sql
create table land_use_transition_matrix (
  id bigint primary key generated always as identity,
  source_item varchar(128) not null,
  target_item varchar(128) not null,
  weight decimal(8,4) not null,
  rationale text,
  source_system varchar(64),
  target_system varchar(64),
  valid_from_year integer,
  valid_to_year integer,
  notes text,
  is_active boolean not null default true,
  created_at timestamp not null default current_timestamp,
  updated_at timestamp not null default current_timestamp
);

create index idx_land_use_transition_matrix_source
  on land_use_transition_matrix (source_item, is_active);
```

Pipeline davranışı:
- Uygulama önce `public/data/land-use-transition-matrix.csv` dosyasını okumayı dener.
- Dosya varsa ve geçerli satırlar içeriyorsa `LAND_USE_CROSSWALK_RULES` yerine bunu kullanır.
- Dosya yoksa ya da bozuksa inline varsayılan kurallara geri düşer.
- Bu yapı ileride CSV yerine bir API ya da SQL sorgusuna bağlanabilecek şekilde tasarlanmıştır.