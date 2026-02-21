// API üzerinden ürün isimlerini kontrol eden script
const API_BASE = 'http://localhost:3009';

async function checkProducts() {
  try {
    // Tüm yumurta/tavuk ile ilgili ürünleri listele
    const query = `
      SELECT DISTINCT urun 
      FROM tuik_kumes_hayvanciligi 
      WHERE urun LIKE '%yumurt%' 
         OR urun LIKE '%Yumurt%' 
         OR urun LIKE '%tavuk%' 
         OR urun LIKE '%Tavuk%'
         OR urun LIKE '%Layer%'
         OR urun LIKE '%layer%'
      ORDER BY urun
    `;

    const response = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();

    if (result.success && result.data) {
      console.log('\n=== TÜİK Kümes Hayvancılığı - Yumurta/Tavuk İlgili Ürünler ===\n');
      result.data.forEach((row, index) => {
        console.log(`${index + 1}. ${row.urun}`);
      });
      console.log(`\nToplam: ${result.data.length} ürün\n`);

      // Şu anda kullandığımız ürünleri kontrol et
      const currentProducts = [
        'Tavuk Yumurtası',
        'Yumurtacı Tavuk Sayısı',
        'Yerli Yumurtacı Tavuk',
        'Hibrit Yumurtacı Tavuk',
        'Yumurtacı Tavuk (Layer) civivi Üretimi için Kuluçkaya Basılan Yumurta'
      ];

      console.log('=== Kullandığımız Ürünlerin Kontrolü ===\n');
      for (const product of currentProducts) {
        const checkQuery = `SELECT COUNT(*) as count FROM tuik_kumes_hayvanciligi WHERE urun = '${product}'`;
        const checkResponse = await fetch(`${API_BASE}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: checkQuery })
        });
        const checkResult = await checkResponse.json();
        const count = checkResult.data?.[0]?.count || 0;
        console.log(`${count > 0 ? '✅' : '❌'} ${product} - ${count} kayıt`);
      }
    }
  } catch (error) {
    console.error('Hata:', error.message);
  }
}

checkProducts();
