const mysql = require('mysql2/promise');

const config = {
    host: '77.245.149.60',
    port: 3306,
    user: 'ist_172505',
    password: 'ist_172505',
    database: 'ist'
};

async function exploreDatabase() {
    let connection;
    try {
        console.log('Veritabanına bağlanılıyor...');
        connection = await mysql.createConnection(config);
        console.log('Bağlantı başarılı!\n');

        // Tüm tabloları listele
        console.log('=== TABLOLAR ===');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(tables);

        // Her tablo için yapıyı ve örnek verileri al
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            console.log(`\n=== TABLO: ${tableName} ===`);
            
            // Tablo yapısı
            const [columns] = await connection.query(`DESCRIBE ${tableName}`);
            console.log('Kolonlar:', columns.map(c => `${c.Field} (${c.Type})`).join(', '));
            
            // Satır sayısı
            const [count] = await connection.query(`SELECT COUNT(*) as total FROM ${tableName}`);
            console.log('Toplam kayıt:', count[0].total);
            
            // Örnek veri (ilk 3 satır)
            if (count[0].total > 0) {
                const [sample] = await connection.query(`SELECT * FROM ${tableName} LIMIT 3`);
                console.log('Örnek veriler:', JSON.stringify(sample, null, 2));
            }
        }

    } catch (error) {
        console.error('Hata:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

exploreDatabase();
