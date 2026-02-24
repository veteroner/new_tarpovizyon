#!/bin/bash
# Comprehensive SQL test for all Kaynak ve Çevre pages
API="http://localhost:8000/api.php"
AK="REDACTED_DASHBOARD_KEY"

query() {
  local label="$1"
  local sql="$2"
  local result
  result=$(curl -sS -G "$API" --data-urlencode "action=query" --data-urlencode "api_key=$AK" --data-urlencode "sql=$sql" 2>&1)
  
  # Check for error
  if echo "$result" | grep -q '"error"'; then
    echo "FAIL [$label]: $result"
    return
  fi
  
  # Check for empty data
  if echo "$result" | grep -q '"data":\[\]'; then
    echo "EMPTY [$label]: No rows returned"
    return
  fi
  
  # Count rows
  local count
  count=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
  
  # Check first row for all-zero values
  local first_vals
  first_vals=$(echo "$result" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data'][0]
vals=[float(v) for k,v in d.items() if k not in ('area','year','item_tr','element_tr','urun','ulke','yearcode') and v is not None]
allzero=all(v==0 for v in vals) if vals else True
print(f'rows={len(json.load(open(\"/dev/stdin\") if False else sys.stdin)[\"data\"] if False else [])}, allzero={allzero}')
" 2>/dev/null)
  
  echo "OK   [$label]: ${count} rows | First: $(echo "$result" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)['data'][0]))" 2>/dev/null | head -c 200)"
}

echo "=============================================="
echo "  KAYNAK VE CEVRE - FULL SQL AUDIT"
echo "=============================================="

echo ""
echo "=== 1. AgriculturalEmploymentPage (fao_nufus_istihdam_tarim) ==="
echo "--- Max years available ---"
query "EMP-MAXYEAR" "SELECT MAX(yearcode) as max_year FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066'"
query "EMP-MAXYEAR-TR" "SELECT MAX(yearcode) as max_year FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')"
query "EMP-TURKEY-NAME" "SELECT DISTINCT area FROM fao_nufus_istihdam_tarim WHERE area LIKE '%urk%'"

echo "--- Overview Tab ---"
query "EMP-OV1-top25-2024" "SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND e.area NOT IN ('World','WORLD') GROUP BY e.area ORDER BY toplam DESC LIMIT 5"
query "EMP-OV1-top25-2023" "SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND e.area NOT IN ('World','WORLD') GROUP BY e.area ORDER BY toplam DESC LIMIT 5"
query "EMP-OV2-trend" "SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim GROUP BY yearcode ORDER BY yearcode DESC LIMIT 5"
query "EMP-OV3-prevyear" "SELECT SUM(CAST(total AS DECIMAL(20,2))) as total FROM fao_nufus_istihdam_tarim WHERE yearcode='2023' AND indicatorcode='21066'"

echo "--- Turkey Tab ---"
query "EMP-TR1-2024" "SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')"
query "EMP-TR1-2023" "SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')"
query "EMP-TR2-rank-2024" "SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND e.area NOT IN ('World','WORLD') GROUP BY e.area HAVING toplam > 0 ORDER BY toplam DESC LIMIT 5"
query "EMP-TR3-history" "SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%') AND CAST(e.yearcode AS SIGNED) >= 1990 ORDER BY e.yearcode DESC LIMIT 5"

echo "--- Forecast Tab ---"
query "EMP-FC1-global" "SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND CAST(yearcode AS SIGNED) >= 1990 GROUP BY yearcode ORDER BY yearcode DESC LIMIT 5"
query "EMP-FC2-turkey" "SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%') AND CAST(e.yearcode AS SIGNED) >= 1990 ORDER BY e.yearcode DESC LIMIT 5"

echo "--- Alerts Tab ---"
query "EMP-AL1-tr2024" "SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam, CAST(e.male AS DECIMAL(20,2)) as erkek, CAST(e.female AS DECIMAL(20,2)) as kadin FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2024' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')"
query "EMP-AL2-tr2010" "SELECT e.yearcode as year, CAST(e.total AS DECIMAL(20,2)) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2010' AND e.indicatorcode='21066' AND (e.area LIKE '%T_rkiye%' OR e.area LIKE '%Turkey%')"
query "EMP-AL3-gender" "SELECT SUM(CAST(male AS DECIMAL(20,2))) as erkek, SUM(CAST(female AS DECIMAL(20,2))) as kadin FROM fao_nufus_istihdam_tarim WHERE yearcode='2024' AND indicatorcode='21066'"
query "EMP-AL4-compare" "SELECT yearcode as year, SUM(CAST(total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim WHERE indicatorcode='21066' AND yearcode IN ('2024','2010') GROUP BY yearcode"

echo ""
echo "=== 2. PopulationPage (fao_nufus) ==="
echo "--- Max years available ---"
query "POP-MAXYEAR" "SELECT MAX(year) as max_year FROM fao_nufus"
query "POP-MAXYEAR-TR" "SELECT MAX(year) as max_year FROM fao_nufus WHERE area LIKE '%T_rkiye%' OR area LIKE '%Turkey%'"
query "POP-TURKEY-NAME" "SELECT DISTINCT area FROM fao_nufus WHERE area LIKE '%urk%'"

echo "--- Overview Tab ---"
query "POP-OV1-top25" "SELECT area, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE year='2023' AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY toplam DESC LIMIT 5"
query "POP-OV2-trend" "SELECT year, SUM(CAST(TOPLAM AS DECIMAL(20,2))) as toplam FROM fao_nufus WHERE area NOT IN ('World','WORLD') GROUP BY year ORDER BY year DESC LIMIT 5"

echo "--- Turkey Tab ---"
query "POP-TR1-current" "SELECT area, CAST(TOPLAM AS DECIMAL(20,2)) as toplam, CAST(kirsal AS DECIMAL(20,2)) as kirsal, CAST(sehir AS DECIMAL(20,2)) as sehir FROM fao_nufus WHERE year='2023' AND (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%')"
query "POP-TR2-history" "SELECT year, CAST(TOPLAM AS DECIMAL(20,2)) as toplam, CAST(kirsal AS DECIMAL(20,2)) as kirsal, CAST(sehir AS DECIMAL(20,2)) as sehir FROM fao_nufus WHERE (area LIKE '%T_rkiye%' OR area LIKE '%Turkey%') AND CAST(year AS SIGNED) >= 1960 ORDER BY year DESC LIMIT 5"

echo ""
echo "=== 3. LandUsePage (fao_land_use) ==="
echo "--- Max years available ---"
query "LAND-MAXYEAR" "SELECT MAX(year) as max_year FROM fao_land_use"
query "LAND-MAXYEAR-TR" "SELECT MAX(year) as max_year FROM fao_land_use WHERE area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%'"
query "LAND-TURKEY-NAME" "SELECT DISTINCT area FROM fao_land_use WHERE area LIKE '%urk%'"
query "LAND-ITEMS" "SELECT DISTINCT item_tr FROM fao_land_use LIMIT 20"

echo "--- Overview Tab ---"
query "LAND-OV1-byitem-2023" "SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='2023' AND area NOT IN ('World','WORLD') AND item_tr IN ('Tarım arazisi','İşlenebilir arazi','Orman alanı') GROUP BY item_tr ORDER BY total DESC"
query "LAND-OV2-top20" "SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_land_use WHERE year='2023' AND item_tr='Tarım arazisi' AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC LIMIT 5"

echo "--- Turkey Tab ---"
query "LAND-TR1-2023" "SELECT item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%')"
query "LAND-TR2-history" "SELECT year, item_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_land_use WHERE (area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%') AND item_tr='Tarım arazisi' AND CAST(year AS SIGNED) >= 2000 ORDER BY year DESC LIMIT 5"

echo ""
echo "=== 4. FertilizerPage (fao_input_gubre_ticari) ==="
query "FERT-MAXYEAR" "SELECT MAX(year) as max_year FROM fao_input_gubre_ticari"
query "FERT-MAXYEAR-TR" "SELECT MAX(year) as max_year FROM fao_input_gubre_ticari WHERE area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%'"
query "FERT-TURKEY-NAME" "SELECT DISTINCT area FROM fao_input_gubre_ticari WHERE area LIKE '%urk%'"
query "FERT-ELEMENTS" "SELECT DISTINCT element_tr FROM fao_input_gubre_ticari LIMIT 10"
query "FERT-ITEMS" "SELECT DISTINCT item_tr FROM fao_input_gubre_ticari LIMIT 20"

echo "--- Overview Tab ---"
query "FERT-OV1-byitem" "SELECT item_tr, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İthalat Miktarı' GROUP BY item_tr ORDER BY total DESC LIMIT 5"
query "FERT-OV2-top20" "SELECT area, SUM(CAST(value AS DECIMAL(20,2))) as total FROM fao_input_gubre_ticari WHERE year='2023' AND element_tr='İthalat Miktarı' AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC LIMIT 5"

echo "--- Turkey Tab ---"
query "FERT-TR1-current" "SELECT item_tr, element_tr, CAST(value AS DECIMAL(20,2)) as val FROM fao_input_gubre_ticari WHERE year='2023' AND (area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%') AND element_tr IN ('İthalat Miktarı','İhracat Miktarı') LIMIT 10"
query "FERT-TR2-history" "SELECT year, SUM(CASE WHEN element_tr='İthalat Miktarı' THEN CAST(value AS DECIMAL(20,2)) ELSE 0 END) as imp FROM fao_input_gubre_ticari WHERE (area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%') AND CAST(year AS SIGNED) >= 2000 GROUP BY year ORDER BY year DESC LIMIT 5"

echo ""
echo "=== 5. PesticidePage (fao_input_pestisit_use) ==="
query "PEST-MAXYEAR" "SELECT MAX(year) as max_year FROM fao_input_pestisit_use"
query "PEST-MAXYEAR-TR" "SELECT MAX(year) as max_year FROM fao_input_pestisit_use WHERE area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%'"
query "PEST-TURKEY-NAME" "SELECT DISTINCT area FROM fao_input_pestisit_use WHERE area LIKE '%urk%'"
query "PEST-ELEMENTS" "SELECT DISTINCT element_tr FROM fao_input_pestisit_use LIMIT 10"

echo "--- Overview Tab ---"
query "PEST-OV1-bytype-2022" "SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler') GROUP BY item_tr ORDER BY total DESC"
query "PEST-OV1-bytype-2023" "SELECT item_tr, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2023' AND element_tr='Tarımsal Kullanım' AND item_tr IN ('Pestisitler (toplam)','Herbisitler','İnsektisitler','Fungisitler ve Bakterisitler') GROUP BY item_tr ORDER BY total DESC"
query "PEST-OV2-top20-2022" "SELECT area, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE year='2022' AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND area NOT IN ('World','WORLD') GROUP BY area ORDER BY total DESC LIMIT 5"

echo "--- Turkey Tab ---"
query "PEST-TR1-2022" "SELECT item_tr, element_tr, CAST(value AS DECIMAL(20,4)) as val FROM fao_input_pestisit_use WHERE year='2022' AND (area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%') AND element_tr='Tarımsal Kullanım' LIMIT 10"
query "PEST-TR2-history" "SELECT year, SUM(CAST(value AS DECIMAL(20,4))) as total FROM fao_input_pestisit_use WHERE (area='Turkiye' OR area='Turkey' OR area LIKE '%rkiye%') AND element_tr='Tarımsal Kullanım' AND item_tr='Pestisitler (toplam)' AND CAST(year AS SIGNED) >= 2000 GROUP BY year ORDER BY year DESC LIMIT 5"

echo ""
echo "=== 6. FoodBalancePage (fao_balans) ==="
query "FOOD-MAXYEAR" "SELECT MAX(yil) as max_year FROM fao_balans"
query "FOOD-TURKEY-CODES" "SELECT DISTINCT ulke FROM fao_balans WHERE ulke IN ('223','351','792') LIMIT 5"
query "FOOD-COLUMNS" "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='fao_balans' ORDER BY ORDINAL_POSITION"

echo "--- Overview Tab ---"
query "FOOD-OV1-byproduct" "SELECT urun, SUM(CAST(uretim_v AS DECIMAL(20,2))) as uretim FROM fao_balans WHERE yil='2023' AND urun IN (2511,2514,2515,2513,2731,2734,2848) GROUP BY urun ORDER BY uretim DESC"
query "FOOD-OV2-top20" "SELECT ulke, SUM(CAST(uretim_v AS DECIMAL(20,2))) as toplam FROM fao_balans WHERE yil='2023' AND urun IN (2511,2514,2515,2513,2731,2734,2848) GROUP BY ulke ORDER BY toplam DESC LIMIT 5"

echo "--- Turkey Tab ---"
query "FOOD-TR1-current" "SELECT urun, CAST(uretim_v AS DECIMAL(20,2)) as uretim, CAST(imp_v AS DECIMAL(20,2)) as ithalat, CAST(exp_v AS DECIMAL(20,2)) as ihracat FROM fao_balans WHERE yil='2023' AND (ulke='223' OR ulke='351') LIMIT 10"
query "FOOD-TR2-history" "SELECT yil, SUM(CAST(uretim_v AS DECIMAL(20,2))) as uretim FROM fao_balans WHERE (ulke='223' OR ulke='351') AND CAST(yil AS SIGNED) >= 2000 GROUP BY yil ORDER BY yil DESC LIMIT 5"

echo ""
echo "=== EXCLUDED_AREAS FILTER TEST ==="
query "EXCL-SMALL" "SELECT e.area, SUM(CAST(e.total AS DECIMAL(20,2))) as toplam FROM fao_nufus_istihdam_tarim e WHERE e.yearcode='2023' AND e.indicatorcode='21066' AND e.area NOT IN ('World','WORLD','Africa','Americas','Asia','Europe','Oceania') GROUP BY e.area ORDER BY toplam DESC LIMIT 3"

echo ""
echo "=== DONE ==="
