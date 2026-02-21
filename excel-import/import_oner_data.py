#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excel dosyasından verileri okuyup her sheet için ayrı tablo oluşturur
"""

import pandas as pd
import sys
import os

# Excel dosyasının yolu
excel_file = '/Volumes/LaCie/dashboard-project/öner veriler.xlsx'

try:
    # Excel dosyasını oku
    excel = pd.ExcelFile(excel_file)
    
    print(f"📊 Excel dosyası bulundu: {excel_file}")
    print(f"📋 Sheet sayısı: {len(excel.sheet_names)}\n")
    
    # Her sheet'i analiz et
    for sheet_name in excel.sheet_names:
        print(f"\n{'='*80}")
        print(f"📄 SHEET: {sheet_name}")
        print('='*80)
        
        # Sheet'i oku
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        
        print(f"📊 Satır sayısı: {len(df)}")
        print(f"📊 Kolon sayısı: {len(df.columns)}")
        print(f"\n📋 Kolonlar:")
        for i, col in enumerate(df.columns, 1):
            dtype = df[col].dtype
            non_null = df[col].notna().sum()
            print(f"  {i}. {col} ({dtype}) - {non_null} dolu veri")
        
        # İlk 5 satırı göster
        print(f"\n📋 İlk 5 satır:")
        print(df.head().to_string())
        
        # Tablo adını oluştur
        table_name = f"oner_{sheet_name.lower().replace(' ', '_').replace('ı', 'i').replace('ğ', 'g').replace('ü', 'u').replace('ş', 's').replace('ö', 'o').replace('ç', 'c')}"
        print(f"\n💾 Önerilen tablo adı: {table_name}")
        
except FileNotFoundError:
    print(f"❌ Hata: '{excel_file}' dosyası bulunamadı!")
    sys.exit(1)
except Exception as e:
    print(f"❌ Hata oluştu: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
