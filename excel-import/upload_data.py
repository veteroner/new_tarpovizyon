#!/usr/bin/env python3
"""
SQL dosyalarını API üzerinden veritabanına yükleyen script
"""
import requests
import re
import os

API_URL = "https://dersbende.com/api.php"
API_KEY = "dashboard_secret_key_2024"

def execute_sql(sql):
    """Tek bir SQL sorgusunu çalıştır"""
    response = requests.post(
        f"{API_URL}?action=execute&api_key={API_KEY}",
        data={"sql": sql}
    )
    return response.json()

def process_sql_file(filepath):
    """SQL dosyasını işle"""
    print(f"\n{'='*60}")
    print(f"İşleniyor: {os.path.basename(filepath)}")
    print(f"{'='*60}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # DROP TABLE
    drop_match = re.search(r'DROP TABLE IF EXISTS[^;]+;', content)
    if drop_match:
        print("DROP TABLE çalıştırılıyor...")
        result = execute_sql(drop_match.group())
        print(f"  Sonuç: {result}")
    
    # CREATE TABLE
    create_match = re.search(r'CREATE TABLE[^;]+;', content, re.DOTALL)
    if create_match:
        print("CREATE TABLE çalıştırılıyor...")
        result = execute_sql(create_match.group())
        print(f"  Sonuç: {result}")
    
    # INSERT ifadelerini bul ve çalıştır
    insert_pattern = r'INSERT INTO[^;]+;'
    inserts = re.findall(insert_pattern, content, re.DOTALL)
    
    if inserts:
        print(f"{len(inserts)} INSERT ifadesi bulundu")
        for i, insert in enumerate(inserts):
            result = execute_sql(insert)
            if 'error' in result:
                print(f"  INSERT {i+1} HATA: {result['error'][:100]}")
            else:
                print(f"  INSERT {i+1}/{len(inserts)} tamamlandı")
    
    return True

def main():
    sql_dir = "/Users/onerozbey/Desktop/dashboard-project/excel-import/sql-files"
    
    # API bağlantısını test et
    print("API bağlantısı test ediliyor...")
    test = execute_sql("SELECT 1")
    print(f"Test sonucu: {test}")
    
    # SQL dosyalarını sırayla işle
    sql_files = sorted([f for f in os.listdir(sql_dir) if f.endswith('.sql')])
    
    for sql_file in sql_files:
        filepath = os.path.join(sql_dir, sql_file)
        try:
            process_sql_file(filepath)
        except Exception as e:
            print(f"HATA ({sql_file}): {e}")
    
    # Sonuç istatistikleri
    print("\n" + "="*60)
    print("İşlem tamamlandı! Tablo istatistikleri:")
    response = requests.get(f"{API_URL}?action=stats&api_key={API_KEY}")
    stats = response.json()
    for table, count in stats.get('tables', {}).items():
        if table.startswith('excel_'):
            print(f"  {table}: {count} satır")

if __name__ == "__main__":
    main()
