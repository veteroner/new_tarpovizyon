-- TarpoVizyon Basic — İl Düzeyinde Sektörel Veriler (province/district-level) module schema.

-- Province-level crop production detail (TÜİK, latest year), one row per (il, ürün).
CREATE TABLE il_bitkisel_uretim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il TEXT NOT NULL,
  urun_grup TEXT,
  urun TEXT NOT NULL,
  urun_kod TEXT,
  ekilen_alan_da REAL,
  uretim_ton REAL,
  verim_kg_da REAL
);
CREATE INDEX idx_il_bitkisel_il ON il_bitkisel_uretim(il);
CREATE INDEX idx_il_bitkisel_urun ON il_bitkisel_uretim(urun);
CREATE INDEX idx_il_bitkisel_grup ON il_bitkisel_uretim(urun_grup);

-- Havza (basin) → il → ilçe mapping, used to color the district-level map (same
-- turkey_districts.json geometry as the main app's basin feature, kept consistent
-- so the two never drift apart).
CREATE TABLE havza_ilce (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  havza_kod INTEGER,
  havza TEXT NOT NULL,
  il_kod INTEGER,
  il TEXT NOT NULL,
  ilce_kod INTEGER,
  ilce TEXT NOT NULL
);
CREATE INDEX idx_havza_ilce_havza ON havza_ilce(havza);
CREATE INDEX idx_havza_ilce_il ON havza_ilce(il);

-- Havza ürün deseni: one row per (havza, il, ilçe, ürün) — exploded from the
-- source's comma-separated "desen" (crop pattern) list per district.
CREATE TABLE havza_urun_deseni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  havza TEXT NOT NULL,
  il TEXT NOT NULL,
  ilce TEXT NOT NULL,
  urun TEXT NOT NULL
);
CREATE INDEX idx_havza_urun_havza ON havza_urun_deseni(havza);
CREATE INDEX idx_havza_urun_il ON havza_urun_deseni(il);
CREATE INDEX idx_havza_urun_ilce ON havza_urun_deseni(ilce);

-- Coğrafi işaretli tarım ürünleri (registered geographical indications), one row
-- per (il, ürün adı). Source: TÜRKPATENT, pre-filtered to agricultural/food product
-- groups and registered (Tescilli) status only.
CREATE TABLE il_cografi_isaret (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  il TEXT NOT NULL,
  cografi_isaret_adi TEXT NOT NULL,
  urun_grubu TEXT
);
CREATE INDEX idx_cografi_il ON il_cografi_isaret(il);
