#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Öner'in Excel dosyasından SQL dosyaları oluşturur
Her sheet için ayrı bir SQL dosyası
"""

import pandas as pd
import sys
import os
from datetime import datetime
import re

# Excel dosyası yolu
EXCEL_FILE = '/Volumes/LaCie/dashboard-project/öner veriler.xlsx'
OUTPUT_DIR = '/Volumes/LaCie/dashboard-project/excel-import/sql-files/oner'

def normalize_table_name(name):
    """Tablo adını normalize et"""
    name = name.lower()
    # Türkçe karakterleri dönüştür
    tr_map = {
        'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
        'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
    }
    for tr_char, en_char in tr_map.items():
        name = name.replace(tr_char, en_char)
    
    # Özel karakterleri temizle
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = re.sub(r'_+', '_', name).strip('_')
    
    # Maksimum 50 karakter
    if len(name) > 50:
        name = name[:50]
    
    return f"oner_{name}"

def normalize_column_name(name):
    """Kolon adını normalize et"""
    name = str(name).strip()
    
    # Türkçe karakterleri dönüştür
    tr_map = {
        'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
        'İ': 'i', 'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'Ö': 'o', 'Ç': 'c'
    }
    for tr_char, en_char in tr_map.items():
        name = name.replace(tr_char, en_char)
    
    # Özel karakterleri temizle
    name = re.sub(r'[^a-z0-9]+', '_', name.lower())
    name = re.sub(r'_+', '_', name).strip('_')
    
    # Unnamed kolonları temizle
    if name.startswith('unnamed'):
        name = f'column_{name.split("_")[-1]}'
    
    # SQL anahtar kelimelerinden kaçın
    if name in ['year', 'month', 'day', 'date', 'time', 'user', 'order']:
        name = f'{name}_value'
    
    # Maksimum 60 karakter
    if len(name) > 60:
        name = name[:60]
    
    return name

def get_sql_type(dtype, col_data):
    """Pandas dtype'ından MySQL type'ını belirle"""
    # Boş kolon kontrolü
    if col_data.isna().all():
        return 'TEXT'
    
    if 'datetime' in str(dtype):
        return 'DATETIME'
    elif 'int' in str(dtype):
        return 'BIGINT'
    elif 'float' in str(dtype):
        return 'DOUBLE'
    elif 'bool' in str(dtype):
        return 'BOOLEAN'
    else:
        # Text için maksimum uzunluğu kontrol et
        max_len = col_data.astype(str).str.len().max()
        if pd.isna(max_len) or max_len < 255:
            return 'VARCHAR(500)'
        else:
            return 'TEXT'

def escape_sql_value(value):
    """SQL değerini escape et"""
    if pd.isna(value) or value is None:
        return 'NULL'
    elif isinstance(value, (int, float)):
        if pd.isna(value):
            return 'NULL'
        return str(value)
    elif isinstance(value, datetime):
        return f"'{value.strftime('%Y-%m-%d %H:%M:%S')}'"
    else:
        # String değerleri escape et
        value = str(value).replace("'", "''").replace('\\', '\\\\')
        return f"'{value}'"

def generate_sql_file(sheet_name, df, output_path):
    """SQL dosyası oluştur"""
    # Boş satırları temizle
    df = df.dropna(how='all')
    
    if len(df) == 0:
        print(f"⚠️  {sheet_name} için veri yok, atlanıyor...")
        return False
    
    # Tablo adını oluştur
    table_name = normalize_table_name(sheet_name)
    
    sql_lines = []
    sql_lines.append(f"-- {sheet_name} verileri")
    sql_lines.append(f"-- Oluşturulma: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    sql_lines.append("")
    
    # DROP TABLE
    sql_lines.append(f"DROP TABLE IF EXISTS `{table_name}`;")
    sql_lines.append("")
    
    # CREATE TABLE
    columns = []
    columns.append("  `id` INT AUTO_INCREMENT PRIMARY KEY")
    
    for col in df.columns:
        col_name = normalize_column_name(col)
        sql_type = get_sql_type(df[col].dtype, df[col])
        columns.append(f"  `{col_name}` {sql_type}")
    
    sql_lines.append(f"CREATE TABLE `{table_name}` (")
    sql_lines.append(",\n".join(columns) + ",")
    sql_lines.append("  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    sql_lines.append(") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;")
    sql_lines.append("")
    
    # INSERT statements - Batch olarak
    normalized_cols = [normalize_column_name(col) for col in df.columns]
    cols_str = ', '.join([f'`{col}`' for col in normalized_cols])
    
    sql_lines.append(f"-- {len(df)} satır veri ekleniyor...")
    sql_lines.append("")
    
    # Her 100 satırda bir batch INSERT
    batch_size = 100
    for i in range(0, len(df), batch_size):
        batch_df = df.iloc[i:i+batch_size]
        
        sql_lines.append(f"INSERT INTO `{table_name}` ({cols_str}) VALUES")
        
        values = []
        for _, row in batch_df.iterrows():
            row_values = [escape_sql_value(val) for val in row]
            values.append(f"  ({', '.join(row_values)})")
        
        sql_lines.append(",\n".join(values) + ";")
        sql_lines.append("")
    
    # Dosyaya yaz
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    
    return True

def main():
    """Ana fonksiyon"""
    try:
        # Output dizinini oluştur
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Excel dosyasını aç
        print(f"\n📊 Excel dosyası okunuyor: {EXCEL_FILE}\n")
        excel = pd.ExcelFile(EXCEL_FILE)
        
        total_files = 0
        total_rows = 0
        
        # Her sheet için SQL dosyası oluştur
        for idx, sheet_name in enumerate(excel.sheet_names, 1):
            print(f"\n{'='*80}")
            print(f"📄 İşleniyor ({idx}/{len(excel.sheet_names)}): {sheet_name}")
            print('='*80)
            
            # Sheet'i oku
            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name)
            
            # Tablo adını oluştur
            table_name = normalize_table_name(sheet_name)
            output_file = os.path.join(OUTPUT_DIR, f"{idx:02d}_{table_name}.sql")
            
            print(f"📋 Satır sayısı: {len(df)}")
            print(f"📋 Kolon sayısı: {len(df.columns)}")
            print(f"💾 Tablo adı: {table_name}")
            print(f"📄 SQL dosyası: {output_file}")
            
            # SQL dosyası oluştur
            if generate_sql_file(sheet_name, df, output_file):
                total_files += 1
                total_rows += len(df.dropna(how='all'))
                print(f"✅ SQL dosyası oluşturuldu!")
            
        print(f"\n{'='*80}")
        print(f"🎉 İŞLEM TAMAMLANDI!")
        print(f"📊 Toplam {total_files} SQL dosyası oluşturuldu")
        print(f"📊 Toplam {total_rows:,} satır veri hazırlandı")
        print(f"📁 Dosyalar: {OUTPUT_DIR}")
        print('='*80)
        print(f"\n💡 SQL dosyalarını veritabanına yüklemek için:")
        print(f"   mysql -h 77.245.149.60 -P 3306 -u ist_172505 -p ist < {OUTPUT_DIR}/XX_tablo_adi.sql")
        
    except FileNotFoundError:
        print(f"❌ Hata: '{EXCEL_FILE}' dosyası bulunamadı!")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
