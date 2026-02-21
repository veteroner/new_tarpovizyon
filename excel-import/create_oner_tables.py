#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Öner'in Excel dosyasından tüm verileri veritabanına aktarır
Her sheet için "oner_" prefix'li ayrı tablo oluşturur
"""

import pandas as pd
import mysql.connector
from mysql.connector import Error
import sys
import os
from datetime import datetime
import re

# Veritabanı bağlantı bilgileri
DB_CONFIG = {
    'host': '77.245.149.60',
    'port': 3306,
    'database': 'ist',
    'user': 'ist_172505',
    'password': 'ist_172505'
}

# Excel dosyası yolu
EXCEL_FILE = '/Volumes/LaCie/dashboard-project/öner veriler.xlsx'

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
    
    # Maksimum 63 karakter (PostgreSQL limiti)
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
    
    # Maksimum 63 karakter
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

def create_table(cursor, table_name, df):
    """Tablo oluştur"""
    # Önce varsa tabloyu sil
    cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`")
    
    # Kolon tanımlamalarını oluştur
    columns = []
    columns.append("id INT AUTO_INCREMENT PRIMARY KEY")
    
    for col in df.columns:
        col_name = normalize_column_name(col)
        sql_type = get_sql_type(df[col].dtype, df[col])
        columns.append(f"`{col_name}` {sql_type}")
    
    # Tablo oluşturma SQL'i
    create_sql = f"""
    CREATE TABLE `{table_name}` (
        {','.join(columns)},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """
    
    cursor.execute(create_sql)
    print(f"✅ Tablo oluşturuldu: {table_name}")

def insert_data(cursor, table_name, df):
    """Verileri tabloya ekle"""
    if len(df) == 0:
        print(f"⚠️  {table_name} için veri yok, atlanıyor...")
        return 0
    
    # Temiz veriyi hazırla
    clean_df = df.copy()
    
    # NaN değerlerini None'a çevir
    clean_df = clean_df.where(pd.notna(clean_df), None)
    
    # Kolon isimlerini normalize et
    normalized_cols = [normalize_column_name(col) for col in df.columns]
    
    # INSERT query
    cols = ', '.join([f'`{col}`' for col in normalized_cols])
    placeholders = ', '.join(['%s'] * len(normalized_cols))
    insert_sql = f"INSERT INTO `{table_name}` ({cols}) VALUES ({placeholders})"
    
    # Verileri tuple listesine çevir
    data = [tuple(row) for row in clean_df.values]
    
    # Batch insert
    try:
        cursor.executemany(insert_sql, data)
        print(f"✅ {len(data)} satır eklendi: {table_name}")
        return len(data)
    except Exception as e:
        print(f"❌ Veri ekleme hatası ({table_name}): {str(e)}")
        return 0

def main():
    """Ana fonksiyon"""
    conn = None
    cursor = None
    
    try:
        # Excel dosyasını aç
        print(f"\n📊 Excel dosyası okunuyor: {EXCEL_FILE}\n")
        excel = pd.ExcelFile(EXCEL_FILE)
        
        # Veritabanına bağlan
        print(f"🔌 Veritabanına bağlanılıyor: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}\n")
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        total_tables = 0
        total_rows = 0
        
        # Her sheet için tablo oluştur ve veri ekle
        for sheet_name in excel.sheet_names:
            print(f"\n{'='*80}")
            print(f"📄 İşleniyor: {sheet_name}")
            print('='*80)
            
            # Sheet'i oku
            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name)
            
            # Boş satırları temizle
            df = df.dropna(how='all')
            
            # Tablo adını oluştur
            table_name = normalize_table_name(sheet_name)
            
            print(f"📋 Satır sayısı: {len(df)}")
            print(f"📋 Kolon sayısı: {len(df.columns)}")
            print(f"💾 Tablo adı: {table_name}")
            
            # Tablo oluştur
            create_table(cursor, table_name, df)
            
            # Veri ekle
            rows_inserted = insert_data(cursor, table_name, df)
            
            total_tables += 1
            total_rows += rows_inserted
            
            # Her tablo sonrası commit
            conn.commit()
            print(f"✅ {table_name} başarıyla tamamlandı!")
        
        # Son commit
        conn.commit()
        
        print(f"\n{'='*80}")
        print(f"🎉 İŞLEM TAMAMLANDI!")
        print(f"📊 Toplam {total_tables} tablo oluşturuldu")
        print(f"📊 Toplam {total_rows:,} satır eklendi")
        print('='*80)
        
    except FileNotFoundError:
        print(f"❌ Hata: '{EXCEL_FILE}' dosyası bulunamadı!")
        sys.exit(1)
    except Error as e:
        print(f"❌ Veritabanı hatası: {str(e)}")
        if conn:
            conn.rollback()
        sys.exit(1)
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {str(e)}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("\n🔌 Veritabanı bağlantısı kapatıldı")

if __name__ == '__main__':
    main()
