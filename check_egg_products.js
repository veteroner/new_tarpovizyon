const mysql = require('mysql2/promise');

async function checkEggProducts() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_project'
  });

  try {
    // Tüm yumurta ve tavuk ile ilgili ürünleri listele
    const [rows] = await connection.execute(`
      SELECT DISTINCT urun 
      FROM tuik_kumes_hayvanciligi 
      WHERE urun LIKE '%yumurt%' 
         OR urun LIKE '%Yumurt%' 
         OR urun LIKE '%tavuk%' 
         OR urun LIKE '%Tavuk%'
         OR urun LIKE '%Layer%'
         OR urun LIKE '%layer%'
      ORDER BY urun
    `);

    console.log('\n=== TÜİK Kümes Hayvancılığı - Yumurta/Tavuk İlgili Ürünler ===\n');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.urun}`);
    });
    console.log(`\nToplam: ${rows.length} ürün\n`);

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
      const [check] = await connection.execute(
        'SELECT COUNT(*) as count FROM tuik_kumes_hayvanciligi WHERE urun = ?',
        [product]
      );
      const exists = check[0].count > 0;
      console.log(`${exists ? '✅' : '❌'} ${product} - ${check[0].count} kayıt`);
    }

  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await connection.end();
  }
}

checkEggProducts();
