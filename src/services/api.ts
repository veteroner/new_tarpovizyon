import axios from 'axios';

const API_BASE = 'https://dersbende.com';
const API_KEY = 'REDACTED_DASHBOARD_KEY';

export interface QueryResult {
  success?: boolean;
  data?: Record<string, string | number>[];
  error?: string;
}

export async function fetchQuery(sql: string): Promise<QueryResult> {
  try {
    const url = `${API_BASE}/api.php?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    return { data: [], error: 'API bağlantı hatası' };
  }
}

// Year filter helper - adds WHERE or AND clause
export function addYearFilter(sql: string, year: string, table: 'trade' | 'production' = 'trade'): string {
  if (year === 'all') return sql;
  
  const yearColumn = table === 'trade' ? 'yil' : 'yil';
  const hasWhere = sql.toLowerCase().includes('where');
  const yearCondition = `${yearColumn} = '${year}'`;
  
  if (hasWhere) {
    // Add AND before GROUP BY if exists, otherwise at the end
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, `AND ${yearCondition} GROUP BY`);
    }
    return sql + ` AND ${yearCondition}`;
  } else {
    // Add WHERE before GROUP BY if exists
    if (sql.toLowerCase().includes('group by')) {
      return sql.replace(/group by/i, `WHERE ${yearCondition} GROUP BY`);
    }
    if (sql.toLowerCase().includes('order by')) {
      return sql.replace(/order by/i, `WHERE ${yearCondition} ORDER BY`);
    }
    return sql + ` WHERE ${yearCondition}`;
  }
}

// Format helpers
export function formatMoney(num: number): string {
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toLocaleString();
}

export function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

// Available years for filters
export const TRADE_YEARS = ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011'];
export const PRODUCTION_YEARS = ['2021'];

// Predefined SQL queries - yct_20 kolonları: primaryValue, fobvalue, cifvalue, flowCode, partnerCode, motDesc, qty, netWgt
// üretimindex kolonları: ürün, deger, birim, yil, ülke, grup
export const queries = {
  // Trade queries - primaryValue kullanıyoruz (ana değer)
  totalTrade: `SELECT SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt FROM yct_20`,
  totalExport: `SELECT SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt FROM yct_20 WHERE flowCode IN ('X', 'DX', 'RX')`,
  totalImport: `SELECT SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt FROM yct_20 WHERE flowCode IN ('M', 'FM', 'RM')`,
  
  flowDistribution: `SELECT flowCode, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam FROM yct_20 GROUP BY flowCode ORDER BY toplam DESC`,
  monthlyTrend: `SELECT ay, 
    SUM(CASE WHEN flowCode IN ('X','DX','RX') THEN CAST(primaryValue AS DECIMAL(20,2)) ELSE 0 END) as ihracat,
    SUM(CASE WHEN flowCode IN ('M','FM','RM') THEN CAST(primaryValue AS DECIMAL(20,2)) ELSE 0 END) as ithalat
    FROM yct_20 GROUP BY ay ORDER BY ay`,
  
  // partnerCode yerine motDesc veya başka alanlar kullanabiliriz
  topExportCountries: `SELECT partnerCode as ulke, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE flowCode IN ('X','DX','RX') 
    GROUP BY partnerCode ORDER BY toplam DESC LIMIT 10`,
  topImportCountries: `SELECT partnerCode as ulke, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE flowCode IN ('M','FM','RM') 
    GROUP BY partnerCode ORDER BY toplam DESC LIMIT 10`,
  
  // motDesc = Mode of Transport Description
  transportModes: `SELECT motDesc as tasimaSekli, SUM(CAST(primaryValue AS DECIMAL(20,2))) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE motDesc IS NOT NULL AND motDesc != '' 
    GROUP BY motDesc ORDER BY toplam DESC`,
  
  // Production queries - üretimindex tablosu (birim filtresi kaldırıldı)
  productionStats: `SELECT SUM(deger) as toplamUretim, COUNT(DISTINCT ürün) as toplamUrun FROM üretimindex`,
  topProducts: `SELECT ürün as ad, SUM(deger) as miktar, birim FROM üretimindex GROUP BY ürün, birim ORDER BY miktar DESC LIMIT 10`,
  yearlyProduction: `SELECT yil, SUM(deger) as toplam FROM üretimindex GROUP BY yil ORDER BY yil`,
};
