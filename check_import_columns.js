const mysql = require('mysql2/promise');

async function checkColumns() {
  const connection = await mysql.createConnection({
    host: 'mihawk.trdns.com',
    port: 8443,
    user: 'onerdb',
    password: 'qweasd123**',
    database: 'ist'
  });

  try {
    // Sütun isimlerini kontrol et
    const [columns] = await connection.execute(
      'DESCRIBE oner_kirmizi_et_ve_hayvan_ithalati'
    );
    
    console.log('\n=== TABLO SÜTUNLARI ===');
    columns.forEach(col => {
      console.log(`${col.Field} (${col.Type})`);
    });

    // İlk birkaç satırı çek
    const [rows] = await connection.execute(
      'SELECT * FROM oner_kirmizi_et_ve_hayvan_ithalati ORDER BY yil DESC LIMIT 3'
    );
    
    console.log('\n=== İLK 3 SATIR ===');
    console.log(JSON.stringify(rows, null, 2));

  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    await connection.end();
  }
}

checkColumns();
