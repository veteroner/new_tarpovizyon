SELECT DISTINCT urun 
FROM tuik_kumes_hayvanciligi 
WHERE urun LIKE '%yumurt%' OR urun LIKE '%Yumurt%' OR urun LIKE '%tavuk%' OR urun LIKE '%Tavuk%'
ORDER BY urun;
