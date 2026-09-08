#!/usr/bin/env python3
"""
Bitkisel ürün denge tablolarına yeni piyasa dönemi ekler.

─── NEDEN PYTHON ───────────────────────────────────────────────────────────────
Depodaki yükleyiciler .mjs; bu biri değil, çünkü kaynak eski biçim .xls
(Composite Document, 2009 Excel) ve Node tarafında güvenilir okuyucu yok.
pandas + xlrd doğrudan okuyor.

─── KAYNAK ─────────────────────────────────────────────────────────────────────
TÜİK Veri Portalı, "Bitkisel Ürün Denge Tabloları" bülteninin MEDAS çıktıları —
üç dosya, hepsi UZUN biçim (ürün × piyasa yılı satırları, fasıllar sütunlarda):

  Tahıllar ve Diğer Bitkisel Ürünler Denge Tabloları.xls    24 ürün
  Sebzeler Denge Tabloları.xls                              22 ürün
  Meyveler, Sert Kabuklular ve İçecek Bitkileri …xls        28 ürün

DİKKAT — bülten sayfasının kendi EKLERİ bu iş için YETMİYOR. Oradaki yedi
dosya (tahıl, pirinç, baklagil, patates, yağlı tohum, şeker, sert kabuklu)
yalnız 27 ürün taşıyor: sebzeler, meyveler ve turunçgiller tümüyle eksik.
Ölçüldü. Kısmi yükleme yapılsaydı yeni sütun 74 ürünün 47'sinde boş kalır,
ısı haritasının son sütunu boş görünürdü — düzeltmeye çalıştığımız yanıltmanın
aynısı. MEDAS çıktıları 74 ürünün TAMAMINI taşıyor.

─── DOĞRULAMA ──────────────────────────────────────────────────────────────────
Yazmadan önce bülten metnindeki yeterlilik dereceleriyle karşılaştırılıyor
(buğday %104,3 · arpa %84,6 · mısır %73,1 · soya %4,2 · tahıl toplamı %91,1 ·
sebze toplamı %108,8 · kayısı %594,9 · çay %96,1 · muz %80,7 · ceviz %82,8).
Onu geçmeden SQL üretilmiyor: 10/10 tutmazsa betik hata verip duruyor.

─── KULLANIM ───────────────────────────────────────────────────────────────────
  python3 scripts/urundenge-donem-yukle.py --dizin ~/Downloads --sql /tmp/d.sql
  npx wrangler d1 execute tarpovizyon-basic --remote --file /tmp/d.sql

Yeni dönem eklendikten sonra `YEAR_KEYS` (useProductBalanceData.ts) de
güncellenmeli — yoksa sütun D1'de durur ama ekranda görünmez.
"""

import argparse
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

import pandas as pd

DOSYALAR = [
    'Tahıllar ve Diğer Bitkisel Ürünler Denge Tabloları.xls',
    'Sebzeler Denge Tabloları.xls',
    'Meyveler, Sert Kabuklular ve İçecek Bitkileri Denge Tabloları.xls',
]

# Bülten metninden — ayrıştırmanın doğruluk sınaması.
BULTEN = {
    'Buğday (toplam)': 104.3, 'Arpa': 84.6, 'Mısır': 73.1, 'Soya': 4.2,
    'Tahıl (toplam)': 91.1, 'Sebze (toplam)': 108.8, 'Kayısı ve zerdali': 594.9,
    'Çay': 96.1, 'Muz': 80.7, 'Ceviz': 82.8,
}

TABLO = 'tuik_urundenge'


def norm(s: str) -> str:
    """Ürün/fasıl adlarını karşılaştırılabilir hâle getirir.

    D1 ile Excel arasındaki tek fark dipnot işaretleri: D1'de "Soya  (1)" ve
    "Şarap", Excel'de "Soya" ve "Şarap(*)". Ürünün kendisi aynı.
    """
    s = re.sub(r'\s*\(\d+\)\s*$|\(\*\)', '', s)
    return ''.join(unicodedata.normalize('NFKD', s.lower().replace('ı', 'i')).split())


def excel_oku(dizin: Path, donem: str) -> dict:
    """(ürün, fasıl) → değer. Sayıya çevrilemeyen hücreler ('.') atlanıyor."""
    kayit = {}
    for ad in DOSYALAR:
        yol = dizin / ad
        if not yol.exists():
            sys.exit(f'HATA: bulunamadı — {yol}')
        d = pd.ExcelFile(yol).parse(0, header=None)

        # Satır 2 başlık: "Üretim (Ton)\nProduction (Tonnes)" → ("Üretim", "Ton")
        fasillar = {}
        for j in range(2, d.shape[1]):
            h = str(d.iloc[2, j])
            if h == 'nan':
                continue
            tr = h.split('\n')[0].strip()
            m = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', tr)
            fasillar[j] = m.group(1).strip() if m else tr

        # Her ürün bloğu en yeni dönemle başlıyor; o satırın 0. sütunu Türkçe ad.
        for i in range(4, len(d)):
            if str(d.iloc[i, 1]).strip() != donem:
                continue
            urun = str(d.iloc[i, 0]).strip()
            if urun in ('', 'nan'):
                continue
            for j, fasil in fasillar.items():
                try:
                    kayit[(urun, fasil)] = float(str(d.iloc[i, j]).replace(',', '.'))
                except (ValueError, TypeError):
                    continue  # "." → TÜİK bu ürün için bu fasılı vermiyor
    return kayit


def d1_satirlari(db: str) -> list:
    """(id, urun, fasıl) — eşleştirme id üzerinden yapılıyor ki ad
    farklılıkları (dipnot işaretleri) WHERE'e sızmasın."""
    import subprocess
    r = subprocess.run(
        ['npx', 'wrangler', 'd1', 'execute', db, '--remote', '--json',
         '--command', f'SELECT id, urun, "fasıl" AS f FROM {TABLO}'],
        capture_output=True, text=True)
    i = r.stdout.find('[')
    if i < 0:
        sys.exit(f'HATA: wrangler çıktısı okunamadı\n{r.stdout[:400]}{r.stderr[:400]}')
    return json.loads(r.stdout[i:])[0]['results']


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--dizin', default='~/Downloads')
    ap.add_argument('--donem', default="2024/'25", help="Excel'deki piyasa yılı etiketi")
    ap.add_argument('--sutun', default='y2024/25', help='D1 sütun adı')
    ap.add_argument('--db', default='tarpovizyon-basic')
    ap.add_argument('--sql', help='SQL çıktı dosyası (verilmezse yalnız rapor)')
    a = ap.parse_args()

    kayit = excel_oku(Path(a.dizin).expanduser(), a.donem)
    urunler = {u for u, _ in kayit}
    print(f'Excel: {len(urunler)} ürün · {len(kayit)} (ürün, fasıl) değeri')

    # ── Doğrulama kapısı ──
    tut = 0
    for u, beklenen in BULTEN.items():
        v = next((x for (uu, ff), x in kayit.items()
                  if norm(uu) == norm(u) and ff == 'Yeterlilik derecesi'), None)
        ok = v is not None and abs(v - beklenen) < 0.15
        tut += ok
        print(f"  {'✓' if ok else '✗'} {u:20} bülten={beklenen:6} okunan={v}")
    if tut != len(BULTEN):
        sys.exit(f'\nHATA: bülten doğrulaması {tut}/{len(BULTEN)} — SQL üretilmedi.')
    print(f'\nBülten doğrulaması {tut}/{len(BULTEN)} ✓')

    if not a.sql:
        print('\n--sql verilmedi, dosya üretilmedi.')
        return

    ex = {(norm(u), norm(f)): v for (u, f), v in kayit.items()}
    ifadeler = [f'ALTER TABLE {TABLO} ADD COLUMN "{a.sutun}" REAL;']
    yazilan = 0
    for r in d1_satirlari(a.db):
        v = ex.get((norm(str(r['urun'])), norm(str(r['f']))))
        if v is None:
            continue
        ifadeler.append(f'UPDATE {TABLO} SET "{a.sutun}" = {v!r} WHERE id = {r["id"]};')
        yazilan += 1
    ifadeler.append(
        "INSERT INTO veri_damga (tablo, damga) VALUES "
        f"('{TABLO}', {int(time.time() * 1000)}) "
        "ON CONFLICT(tablo) DO UPDATE SET damga = excluded.damga;")

    Path(a.sql).write_text('\n'.join(ifadeler), encoding='utf-8')
    print(f'{yazilan} güncelleme + sütun + damga → {a.sql}')
    print(f'Çalıştır: npx wrangler d1 execute {a.db} --remote --file {a.sql}')


if __name__ == '__main__':
    main()
