#!/usr/bin/env python3
import sys

BASE = '/Volumes/LaCie/dashboard-project/src/pages/'

def fix_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    for old, new in replacements:
        count = c.count(old)
        c = c.replace(old, new)
        print(f"  [{count}x] {old[:40]!r} → {new[:40]!r}")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"  Done: {path.split('/')[-1]}")

# ==================== AgriculturalEmploymentPage ====================
print("\n=== AgriculturalEmploymentPage ===")
fix_file(BASE + 'AgriculturalEmploymentPage.tsx', [
    # Table name
    ('fao_tarim_istihdam', 'fao_nufus_istihdam_tarim'),
    # Remove JOIN with fao_nufus
    (' INNER JOIN (SELECT DISTINCT areacode, area FROM fao_nufus) n ON e.areacode = n.areacode', ''),
    # n.area → e.area
    ('n.area', 'e.area'),
    # Column names with alias
    ('e.total_v', 'e.total'),
    ('e.male_v', 'e.male'),
    ('e.female_v', 'e.female'),
    ('total_v', 'total'),
    ('male_v', 'male'),
    ('female_v', 'female'),
    # Years with alias so JS r.year still works
    ("SELECT yearcode as year, SUM", "SELECT yearcode as year, SUM"),  # already done
    ('SELECT year,', 'SELECT yearcode as year,'),
    ("e.year='2022'", "e.yearcode='2024'"),
    ("e.year='2010'", "e.yearcode='2010'"),
    ("year='2022'", "yearcode='2024'"),
    ("year='2021'", "yearcode='2023'"),
    ("year='2010'", "yearcode='2010'"),
    ("year IN ('2022','2010')", "yearcode IN ('2024','2010')"),
    ("year IN ('2000','2005','2010','2015','2022')", "yearcode IN ('2000','2005','2010','2015','2024')"),
    ('CAST(e.year AS SIGNED)', 'CAST(e.yearcode AS SIGNED)'),
    ('CAST(year AS SIGNED)', 'CAST(yearcode AS SIGNED)'),
    ('GROUP BY e.year', 'GROUP BY e.yearcode'),
    ('GROUP BY year', 'GROUP BY yearcode'),
    ('ORDER BY e.year', 'ORDER BY e.yearcode'),
    ('ORDER BY year', 'ORDER BY yearcode'),
    # Add indicatorcode filters
    ("WHERE e.yearcode='2024'", "WHERE e.yearcode='2024' AND e.indicatorcode='21066'"),
    ("WHERE e.yearcode='2010'", "WHERE e.yearcode='2010' AND e.indicatorcode='21066'"),
    ("WHERE yearcode='2024'", "WHERE yearcode='2024' AND indicatorcode='21066'"),
    ("WHERE yearcode='2023'", "WHERE yearcode='2023' AND indicatorcode='21066'"),
    ("WHERE CAST(e.yearcode AS SIGNED)", "WHERE e.indicatorcode='21066' AND CAST(e.yearcode AS SIGNED)"),
    ("WHERE CAST(yearcode AS SIGNED)", "WHERE indicatorcode='21066' AND CAST(yearcode AS SIGNED)"),
    ("WHERE e.area NOT IN", "WHERE e.indicatorcode='21066' AND e.area NOT IN"),
    ("WHERE yearcode IN", "WHERE indicatorcode='21066' AND yearcode IN"),
    # Fix any AND duplicates from previous replacement
    ("AND e.indicatorcode='21066' AND e.indicatorcode='21066'", "AND e.indicatorcode='21066'"),
    ("AND indicatorcode='21066' AND indicatorcode='21066'", "AND indicatorcode='21066'"),
])

# ==================== PopulationPage ====================
print("\n=== PopulationPage ===")
fix_file(BASE + 'PopulationPage.tsx', [
    # Column renames: use backtick-quoted names since they have special chars
    ('CAST(total_v AS DECIMAL(20,2))', 'CAST(TOPLAM AS DECIMAL(20,2))'),
    ('SUM(CAST(total_v AS DECIMAL(20,2)))', 'SUM(CAST(TOPLAM AS DECIMAL(20,2)))'),
    ('CAST(kirsal_v AS DECIMAL(20,2))', 'CAST(kirsal AS DECIMAL(20,2))'),
    ('SUM(CAST(kirsal_v AS DECIMAL(20,2)))', 'SUM(CAST(kirsal AS DECIMAL(20,2)))'),
    ('CAST(sehir_v AS DECIMAL(20,2))', 'CAST(sehir AS DECIMAL(20,2))'),
    ('SUM(CAST(sehir_v AS DECIMAL(20,2)))', 'SUM(CAST(sehir AS DECIMAL(20,2)))'),
    # male_v and female_v have backtick names with special chars
    ("CAST(male_v AS DECIMAL(20,2))", "CAST(`erkek/T` AS DECIMAL(20,2))"),
    ("SUM(CAST(male_v AS DECIMAL(20,2)))", "SUM(CAST(`erkek/T` AS DECIMAL(20,2)))"),
    ("CAST(female_v AS DECIMAL(20,2))", "CAST(`kadın/T` AS DECIMAL(20,2))"),
    ("SUM(CAST(female_v AS DECIMAL(20,2)))", "SUM(CAST(`kadın/T` AS DECIMAL(20,2)))"),
    # Year updates
    ("year='2022'", "year='2023'"),
    ("year='2021'", "year='2022'"),
    # Keep year='2023' as is (already updated)
])

# ==================== FertilizerPage ====================
print("\n=== FertilizerPage ===")
fix_file(BASE + 'FertilizerPage.tsx', [
    # element_tr Turkish chars
    ("'Ithalat Miktari'", "'İthalat Miktarı'"),
    ('"Ithalat Miktari"', '"İthalat Miktarı"'),
    ("'Ihracat Miktari'", "'İhracat Miktarı'"),
    ('"Ihracat Miktari"', '"İhracat Miktarı"'),
    ("'Ithalat Degeri'", "'İthalat Değeri'"),
    ('"Ithalat Degeri"', '"İthalat Değeri"'),
    ("'Ihracat Degeri'", "'İhracat Değeri'"),
    ('"Ihracat Degeri"', '"İhracat Değeri"'),
    # JS comparison strings
    ("includes('Ithal')", "includes('thalat')"),
    # Years
    ("year='2022'", "year='2023'"),
    ("yil='2022'", "yil='2023'"),
    ("year='2021'", "year='2022'"),
    # Keep year='2015' for benchmark
])

# ==================== PesticidePage ====================
print("\n=== PesticidePage ===")
fix_file(BASE + 'PesticidePage.tsx', [
    # element_tr Turkish chars
    ("'Tarimsal Kullanim'", "'Tarımsal Kullanım'"),
    ('"Tarimsal Kullanim"', '"Tarımsal Kullanım"'),
    ("'Ekim alani basina tarimsal kullanim'", "'Ekili alan başına kullanım'"),
    ("'Kisi basina tarimsal kullanim'", "'Kişi başına kullanım'"),
    # item_tr Turkish chars
    ("'Pestisitler'", "'Pestisitler (toplam)'"),
    ('"Pestisitler"', '"Pestisitler (toplam)"'),
    ("'Insektisitler'", "'İnsektisitler'"),
    ('"Insektisitler"', '"İnsektisitler"'),
    # Years
    ("year='2022'", "year='2023'"),
    ("year='2021'", "year='2022'"),
])

# ==================== LandUsePage ====================
print("\n=== LandUsePage ===")
fix_file(BASE + 'LandUsePage.tsx', [
    # latestYear update
    ("const latestYear = '2022'", "const latestYear = '2023'"),
    # item_tr Turkish chars
    ("'Tarim arazisi'", "'Tarım arazisi'"),
    ('"Tarim arazisi"', '"Tarım arazisi"'),
    ("'Islenebilir arazi'", "'İşlenebilir arazi'"),
    ('"Islenebilir arazi"', '"İşlenebilir arazi"'),
    ("'Cayir-Mera'", "'Sürekli çayırlar ve meralar'"),
    ('"Cayir-Mera"', '"Sürekli çayırlar ve meralar"'),
    ("'Ormanlik alan'", "'Orman alanı'"),
    ('"Ormanlik alan"', '"Orman alanı"'),
    ("'Nadas alani'", "'Geçici nadas alanı'"),
    ('"Nadas alani"', '"Geçici nadas alanı"'),
    ("'Sulama altyapisina sahip kara alani'", "'Sulama altyapısı bulunan arazi'"),
    ('"Sulama altyapisina sahip kara alani"', '"Sulama altyapısı bulunan arazi"'),
    ("'Ekili alan'", "'Ekili alan'"),  # already correct, skip
    ("'Cok yillik urun alani'", "'Çok yıllık ürünler'"),
    ('"Cok yillik urun alani"', '"Çok yıllık ürünler"'),
    # Hardcoded years
    ("year='2022'", "year='2023'"),
    ("year='2021'", "year='2022'"),
    # Keep year='2010' and year='2015' for benchmarks
])

# ==================== FoodBalancePage ====================
print("\n=== FoodBalancePage ===")
fix_file(BASE + 'FoodBalancePage.tsx', [
    # Years
    ("yil='2022'", "yil='2023'"),
    ("b.yil='2022'", "b.yil='2023'"),
    ("yil='2021'", "yil='2022'"),
    ("b.yil='2021'", "b.yil='2022'"),
    # Keep yil='2015' for benchmark
])

print("\nAll done!")
