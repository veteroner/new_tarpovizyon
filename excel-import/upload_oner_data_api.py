#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Öner'in Excel dosyasından Node.js server'a API ile veri gönderir
"""

import pandas as pd
import requests
import sys
import re
from time import sleep

# Excel dosyası yolu
EXCEL_FILE = '/Volumes/LaCie/dashboard-project/öner veriler.xlsx'
API_URL = 'http://localhost:3001/api/create-table-with-data'

def normalize_table_name(name):
    """Tablo adını normalize et"""
    name = name.lower()
    tr_map = {'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c'}
    for tr_char, en_char in tr_map.items():
        name = name.replace(tr_char, en_char)
    name = re.sub(r'[^a-z0-9]+', '_', name)
    name = re.sub(r'_+', '_', name).strip('_')
    if len(name) > 50:
        name = name[:50]
    return f"oner_{name}"

def normalize_column_name(name):
    """Kolon adını normalize et"""
    name = str(name).strip()
    tr_map = {'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c'}
    for tr_char, en_char in tr_map.items():
        name = name.replace(tr_char, en_char)
    name = re.sub(r'[^a-z0-9]+', '_', name.lower())
    name = re.sub(r'_+', '_', name).strip('_')
    if name.startswith('unnamed'):
        name = f'column_{name.split("_")[-1]}'
    if name in ['year', 'month', 'day', 'date', 'time', 'user', 'order']:
        name = f'{name}_value'
    if len(name) > 60:
        name = name[:60]
    return name

def get_sql_type(dtype, col_data):
    """MySQL type'ını belirle"""
    if col_data.isna().all():
        return 'TEXT'
    if 'datetime' in str(dtype):
        return 'DATETIME'
    elif 'int' in str(dtype):
        return 'BIGINT'
    elif 'float' in str(dtype):
        return 'DOUBLE'
    else:
        max_len = col_data.astype(str).str.len().max()
        if pd.isna(max_len) or max_len < 255:
            return 'VARCHAR(500)'
        return 'TEXT'

def main():
    try:
        print(f"\n📊 Excel dosyası okunuyor: {EXCEL_FILE}\n")
        excel = pd.ExcelFile(EXCEL_FILE)
        
        print(f"✅ {len(excel.sheet_names)} sheet bulundu")
        print(f"🔌 API: {API_URL}\n")
        
        # İlk 10 önemli sheet'i seç (hızlı test için)
        important_sheets = [
            'Kırmızı Et ekonomik göstergeler',
            'Çiğ Süt ekonomik göstergeler', 
            'Kırmızı Et Üretim Miktarı',
            'Çiğ Süt Üretim Miktarı',
            'Hayvan Varlıkları',
            'Yeterlilikler',
            'Verimlilikler',
            'Hayvansal ürün üretimi',
            'Dünya Karkas Ağırlığı Verileri',
            'İllerin hayvan sayısı'
        ]
        
        sheets_to_process = [s for s in excel.sheet_names if s in important_sheets]
        
        print(f"📋 İşlenecek sheet'ler ({len(sheets_to_process)}):")
        for s in sheets_to_process:
            print(f"  - {s}")
        print()
        
        total_success = 0
        total_failed = 0
        
        for idx, sheet_name in enumerate(sheets_to_process, 1):
            print(f"\n{'='*80}")
            print(f"📄 İşleniyor ({idx}/{len(sheets_to_process)}): {sheet_name}")
            print('='*80)
            
            # Sheet'i oku
            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name)
            df = df.dropna(how='all')
            
            if len(df) == 0:
                print(f"⚠️  Boş veri, atlanıyor...")
                total_failed += 1
                continue
            
            table_name = normalize_table_name(sheet_name)
            
            # Kolon tanımlarını hazırla
            columns = {}
            for col in df.columns:
                col_name = normalize_column_name(col)
                sql_type = get_sql_type(df[col].dtype, df[col])
                columns[col_name] = sql_type
            
            # Verileri hazırla (ilk 1000 satır - büyük dosyalar için)
            df_limited = df.head(1000)
            clean_df = df_limited.where(pd.notna(df_limited), None)
            
            # Datetime kolonları string'e çevir (JSON serialization için)
            for col in clean_df.columns:
                if pd.api.types.is_datetime64_any_dtype(clean_df[col]):
                    clean_df[col] = clean_df[col].dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Kolonları normalize et
            clean_df.columns = [normalize_column_name(col) for col in clean_df.columns]
            
            # JSON'a çevir
            data = clean_df.to_dict('records')
            
            print(f"📋 Satır sayısı: {len(df)} (gönderilen: {len(data)})")
            print(f"📋 Kolon sayısı: {len(columns)}")
            print(f"💾 Tablo adı: {table_name}")
            
            # API'ye gönder
            payload = {
                'tableName': table_name,
                'columns': columns,
                'data': data
            }
            
            try:
                response = requests.post(API_URL, json=payload, timeout=60)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get('success'):
                        print(f"✅ Başarıyla oluşturuldu ve {len(data)} satır eklendi!")
                        total_success += 1
                    else:
                        print(f"❌ Hata: {result.get('error', 'Bilinmeyen hata')}")
                        total_failed += 1
                else:
                    print(f"❌ HTTP {response.status_code}: {response.text}")
                    total_failed += 1
            except requests.exceptions.RequestException as e:
                print(f"❌ API hatası: {str(e)}")
                total_failed += 1
            
            # Rate limiting
            sleep(0.5)
        
        print(f"\n{'='*80}")
        print(f"🎉 İŞLEM TAMAMLANDI!")
        print(f"✅ Başarılı: {total_success}")
        print(f"❌ Başarısız: {total_failed}")
        print('='*80)
        
    except Exception as e:
        print(f"❌ Hata: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
