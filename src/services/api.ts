import axios from 'axios';

const API_BASE = 'https://dersbende.com';
const API_KEY = 'dashboard_secret_key_2024';

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

// Predefined SQL queries
export const queries = {
  // Trade queries
  totalTrade: `SELECT SUM(Value) as toplam, COUNT(*) as cnt FROM yct_20`,
  totalExport: `SELECT SUM(Value) as toplam, COUNT(*) as cnt FROM yct_20 WHERE flowCode IN ('X', 'DX', 'RX')`,
  totalImport: `SELECT SUM(Value) as toplam, COUNT(*) as cnt FROM yct_20 WHERE flowCode IN ('M', 'FM', 'RM')`,
  
  flowDistribution: `SELECT flowCode, SUM(Value) as toplam FROM yct_20 GROUP BY flowCode ORDER BY toplam DESC`,
  monthlyTrend: `SELECT MONTH(refDate) as ay, 
    SUM(CASE WHEN flowCode IN ('X','DX','RX') THEN Value ELSE 0 END) as ihracat,
    SUM(CASE WHEN flowCode IN ('M','FM','RM') THEN Value ELSE 0 END) as ithalat
    FROM yct_20 GROUP BY MONTH(refDate) ORDER BY ay`,
  
  topExportCountries: `SELECT countryName as ulke, SUM(Value) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE flowCode IN ('X','DX','RX') 
    GROUP BY countryName ORDER BY toplam DESC LIMIT 10`,
  topImportCountries: `SELECT countryName as ulke, SUM(Value) as toplam, COUNT(*) as cnt 
    FROM yct_20 WHERE flowCode IN ('M','FM','RM') 
    GROUP BY countryName ORDER BY toplam DESC LIMIT 10`,
  
  transportModes: `SELECT tasimaSekli, SUM(Value) as toplam, COUNT(*) as cnt 
    FROM yct_20 GROUP BY tasimaSekli ORDER BY toplam DESC`,
  
  // Production queries
  productionStats: `SELECT COUNT(DISTINCT ad) as toplamUrun, SUM(miktar) as toplamUretim FROM üretimindex`,
  topProducts: `SELECT ad, SUM(miktar) as miktar, birim FROM üretimindex GROUP BY ad, birim ORDER BY miktar DESC LIMIT 10`,
  yearlyProduction: `SELECT yil, SUM(miktar) as toplam FROM üretimindex GROUP BY yil ORDER BY yil`,
};
