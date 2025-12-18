#!/usr/bin/env python3
"""
Excel verilerini veritabanına aktarmak için SQL dosyası oluşturur.
"""

import pandas as pd
import os
from datetime import datetime

EXCEL_FILE = "/Users/onerozbey/Downloads/Tarımsal Üretim  (1).xlsx"
OUTPUT_DIR = "/Users/onerozbey/Desktop/dashboard-project/excel-import/sql-files"

PRODUCT_SHEETS = [
    "Buğday", "Arpa", "Dane Mısır", "Ayçiçeği", "Soya", "Kolza", "Aspir", "Pamuk",
    "Patates", "Kırmızı Mercimek", "Yeşil Mercimek", "Nohut", "Kuru Fasülye",
    "Şeker Pancarı", "Çeltik", "Zeytin", "Fındık", "İncir", "Üzüm",
    "Antep Fıstığı", "Badem", "Ceviz", "Kayısı", "Elma", "Armut", "Kiraz",
    "Şeftali", "Çilek", "Muz", "Limon", "Portakal", "Mandalina", "Greyfurt",
    "Domates", "Biber", "Salatalık", "Kuru Soğan", "Kavun", "Karpuz", "Nar", "Sarımsak"
]

def clean_value(val):
    if pd.isna(val):
        return "NULL"
    if isinstance(val, str):
        val = val.strip().replace("'", "''")
        if val == "" or val == "-" or val == "…":
            return "NULL"
        return f"'{val}'"
    if isinstance(val, (int, float)):
        if pd.isna(val):
            return "NULL"
        return str(val)
    return f"'{str(val)}'"

def get_year(val):
    """Yıl değerini çıkar"""
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val.year
    if isinstance(val, pd.Timestamp):
        return val.year
    try:
        return int(float(val))
    except:
        return None

def create_product_table_sql():
    return """
DROP TABLE IF EXISTS excel_urunler;
CREATE TABLE excel_urunler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    urun VARCHAR(100),
    yil INT,
    uretici_sayisi DECIMAL(20,2),
    ekilen_alan DECIMAL(20,2),
    uretim DECIMAL(20,2),
    verim DECIMAL(20,2),
    ic_tuketim DECIMAL(20,2),
    ithalat_miktar DECIMAL(20,2),
    ithalat_deger DECIMAL(20,2),
    ihracat_miktar DECIMAL(20,2),
    ihracat_deger DECIMAL(20,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

def process_product_sheet(xl, sheet_name):
    try:
        df = pd.read_excel(xl, sheet_name=sheet_name, header=None)
        data_rows = []
        
        for idx, row in df.iterrows():
            if idx == 0:  # Başlık satırını atla
                continue
            
            year = get_year(row.iloc[0])
            if year and 1990 <= year <= 2030:
                values = {
                    'urun': sheet_name,
                    'yil': year,
                    'uretici_sayisi': row.iloc[1] if len(row) > 1 else None,
                    'ekilen_alan': row.iloc[2] if len(row) > 2 else None,
                    'uretim': row.iloc[3] if len(row) > 3 else None,
                    'verim': row.iloc[4] if len(row) > 4 else None,
                    'ic_tuketim': row.iloc[5] if len(row) > 5 else None,
                    'ithalat_miktar': row.iloc[6] if len(row) > 6 else None,
                    'ithalat_deger': row.iloc[7] if len(row) > 7 else None,
                    'ihracat_miktar': row.iloc[8] if len(row) > 8 else None,
                    'ihracat_deger': row.iloc[9] if len(row) > 9 else None,
                }
                data_rows.append(values)
        
        return data_rows
    except Exception as e:
        print(f"  Hata ({sheet_name}): {e}")
        return []

def main():
    print("=" * 60)
    print("EXCEL VERİLERİNİ SQL'E DÖNÜŞTÜRME")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"\nExcel dosyası okunuyor: {EXCEL_FILE}")
    xl = pd.ExcelFile(EXCEL_FILE)
    print(f"Toplam sayfa sayısı: {len(xl.sheet_names)}")
    
    # 1. ÜRÜN VERİLERİ
    print("\n" + "-" * 40)
    print("1. ÜRÜN VERİLERİ İŞLENİYOR...")
    print("-" * 40)
    
    all_product_data = []
    
    for sheet_name in xl.sheet_names:
        if sheet_name in PRODUCT_SHEETS:
            print(f"  İşleniyor: {sheet_name}...", end=" ")
            rows = process_product_sheet(xl, sheet_name)
            if rows:
                all_product_data.extend(rows)
                print(f"✓ ({len(rows)} satır)")
            else:
                print("× (veri bulunamadı)")
    
    sql_content = create_product_table_sql()
    
    if all_product_data:
        sql_content += "\n-- Ürün verileri INSERT\n"
        sql_content += "INSERT INTO excel_urunler (urun, yil, uretici_sayisi, ekilen_alan, uretim, verim, ic_tuketim, ithalat_miktar, ithalat_deger, ihracat_miktar, ihracat_deger) VALUES\n"
        
        for i, row in enumerate(all_product_data):
            values = f"({clean_value(row['urun'])}, {clean_value(row['yil'])}, "
            values += f"{clean_value(row['uretici_sayisi'])}, {clean_value(row['ekilen_alan'])}, "
            values += f"{clean_value(row['uretim'])}, {clean_value(row['verim'])}, "
            values += f"{clean_value(row['ic_tuketim'])}, {clean_value(row['ithalat_miktar'])}, "
            values += f"{clean_value(row['ithalat_deger'])}, {clean_value(row['ihracat_miktar'])}, "
            values += f"{clean_value(row['ihracat_deger'])})"
            
            if i < len(all_product_data) - 1:
                sql_content += f"  {values},\n"
            else:
                sql_content += f"  {values};\n"
    
    with open(f"{OUTPUT_DIR}/01_urunler.sql", "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"\n✓ Ürün verileri: {len(all_product_data)} satır -> 01_urunler.sql")
    
    # 2. FİYAT ENDEKSLERİ
    print("\n" + "-" * 40)
    print("2. FİYAT ENDEKSLERİ İŞLENİYOR...")
    print("-" * 40)
    
    # TÜFE
    try:
        tufe_df = pd.read_excel(xl, sheet_name="TÜFE")
        print(f"  TÜFE: {tufe_df.shape[0]} satır, {tufe_df.shape[1]} sütun")
        
        tufe_sql = """
DROP TABLE IF EXISTS excel_tufe;
CREATE TABLE excel_tufe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori VARCHAR(255),
    donem VARCHAR(50),
    deger DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TÜFE verileri INSERT
"""
        
        inserts = []
        for idx, row in tufe_df.iterrows():
            kategori = row.iloc[0] if len(row) > 0 else None
            if pd.isna(kategori):
                continue
            
            for col_idx in range(1, len(row)):
                col_name = tufe_df.columns[col_idx] if col_idx < len(tufe_df.columns) else None
                deger = row.iloc[col_idx]
                if not pd.isna(deger):
                    inserts.append({
                        'kategori': str(kategori)[:255],
                        'donem': str(col_name) if col_name else None,
                        'deger': deger
                    })
        
        if inserts:
            tufe_sql += "INSERT INTO excel_tufe (kategori, donem, deger) VALUES\n"
            for i, ins in enumerate(inserts[:10000]):
                values = f"({clean_value(ins['kategori'])}, {clean_value(ins['donem'])}, {clean_value(ins['deger'])})"
                if i < min(len(inserts), 10000) - 1:
                    tufe_sql += f"  {values},\n"
                else:
                    tufe_sql += f"  {values};\n"
        
        with open(f"{OUTPUT_DIR}/02_tufe.sql", "w", encoding="utf-8") as f:
            f.write(tufe_sql)
        print(f"  ✓ TÜFE: {min(len(inserts), 10000)} satır -> 02_tufe.sql")
    except Exception as e:
        print(f"  × TÜFE hatası: {e}")
    
    # GFE
    try:
        gfe_df = pd.read_excel(xl, sheet_name="GFE")
        print(f"  GFE: {gfe_df.shape[0]} satır, {gfe_df.shape[1]} sütun")
        
        gfe_sql = """
DROP TABLE IF EXISTS excel_gfe;
CREATE TABLE excel_gfe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori VARCHAR(255),
    yil INT,
    deger DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- GFE verileri INSERT
"""
        
        inserts = []
        for idx, row in gfe_df.iterrows():
            kategori = row.iloc[0] if len(row) > 0 else None
            if pd.isna(kategori):
                continue
            
            for col_idx in range(1, len(row)):
                col_name = gfe_df.columns[col_idx] if col_idx < len(gfe_df.columns) else None
                deger = row.iloc[col_idx]
                if not pd.isna(deger):
                    try:
                        yil = int(col_name) if col_name else None
                    except:
                        yil = None
                    inserts.append({
                        'kategori': str(kategori)[:255],
                        'yil': yil,
                        'deger': deger
                    })
        
        if inserts:
            gfe_sql += "INSERT INTO excel_gfe (kategori, yil, deger) VALUES\n"
            for i, ins in enumerate(inserts):
                values = f"({clean_value(ins['kategori'])}, {clean_value(ins['yil'])}, {clean_value(ins['deger'])})"
                if i < len(inserts) - 1:
                    gfe_sql += f"  {values},\n"
                else:
                    gfe_sql += f"  {values};\n"
        
        with open(f"{OUTPUT_DIR}/03_gfe.sql", "w", encoding="utf-8") as f:
            f.write(gfe_sql)
        print(f"  ✓ GFE: {len(inserts)} satır -> 03_gfe.sql")
    except Exception as e:
        print(f"  × GFE hatası: {e}")
    
    # ÜFE
    try:
        ufe_df = pd.read_excel(xl, sheet_name="ÜFE")
        print(f"  ÜFE: {ufe_df.shape[0]} satır, {ufe_df.shape[1]} sütun")
        
        ufe_sql = """
DROP TABLE IF EXISTS excel_ufe;
CREATE TABLE excel_ufe (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kategori VARCHAR(255),
    donem VARCHAR(50),
    deger DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ÜFE verileri INSERT
"""
        
        inserts = []
        for idx, row in ufe_df.iterrows():
            kategori = row.iloc[0] if len(row) > 0 else None
            if pd.isna(kategori):
                continue
            
            for col_idx in range(1, len(row)):
                col_name = ufe_df.columns[col_idx] if col_idx < len(ufe_df.columns) else None
                deger = row.iloc[col_idx]
                if not pd.isna(deger):
                    inserts.append({
                        'kategori': str(kategori)[:255],
                        'donem': str(col_name) if col_name else None,
                        'deger': deger
                    })
        
        if inserts:
            ufe_sql += "INSERT INTO excel_ufe (kategori, donem, deger) VALUES\n"
            for i, ins in enumerate(inserts[:10000]):
                values = f"({clean_value(ins['kategori'])}, {clean_value(ins['donem'])}, {clean_value(ins['deger'])})"
                if i < min(len(inserts), 10000) - 1:
                    ufe_sql += f"  {values},\n"
                else:
                    ufe_sql += f"  {values};\n"
        
        with open(f"{OUTPUT_DIR}/04_ufe.sql", "w", encoding="utf-8") as f:
            f.write(ufe_sql)
        print(f"  ✓ ÜFE: {min(len(inserts), 10000)} satır -> 04_ufe.sql")
    except Exception as e:
        print(f"  × ÜFE hatası: {e}")
    
    # FAO Gıda Endeksi
    try:
        fao_df = pd.read_excel(xl, sheet_name="FAO Gıda Endeksi")
        print(f"  FAO Gıda Endeksi: {fao_df.shape[0]} satır, {fao_df.shape[1]} sütun")
        
        fao_sql = """
DROP TABLE IF EXISTS excel_fao_gida_endeksi;
CREATE TABLE excel_fao_gida_endeksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tarih VARCHAR(50),
    endeks_turu VARCHAR(100),
    deger DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- FAO Gıda Endeksi verileri INSERT
"""
        
        inserts = []
        for idx, row in fao_df.iterrows():
            tarih = row.iloc[0] if len(row) > 0 else None
            endeks_turu = row.iloc[1] if len(row) > 1 else None
            deger = row.iloc[2] if len(row) > 2 else None
            
            if not pd.isna(tarih) and not pd.isna(deger):
                inserts.append({
                    'tarih': str(tarih)[:50],
                    'endeks_turu': str(endeks_turu)[:100] if endeks_turu else None,
                    'deger': deger
                })
        
        if inserts:
            fao_sql += "INSERT INTO excel_fao_gida_endeksi (tarih, endeks_turu, deger) VALUES\n"
            for i, ins in enumerate(inserts):
                values = f"({clean_value(ins['tarih'])}, {clean_value(ins['endeks_turu'])}, {clean_value(ins['deger'])})"
                if i < len(inserts) - 1:
                    fao_sql += f"  {values},\n"
                else:
                    fao_sql += f"  {values};\n"
        
        with open(f"{OUTPUT_DIR}/05_fao_gida_endeksi.sql", "w", encoding="utf-8") as f:
            f.write(fao_sql)
        print(f"  ✓ FAO Gıda Endeksi: {len(inserts)} satır -> 05_fao_gida_endeksi.sql")
    except Exception as e:
        print(f"  × FAO Gıda Endeksi hatası: {e}")
    
    print("\n" + "=" * 60)
    print("İŞLEM TAMAMLANDI!")
    print("=" * 60)
    print(f"\nSQL dosyaları şurada: {OUTPUT_DIR}")
    print("\nBunları phpMyAdmin'den veya terminal üzerinden MySQL'e aktarabilirsiniz.")

if __name__ == "__main__":
    main()
