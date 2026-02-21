const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Veritabanı bağlantı ayarları
const config = {
    host: '77.245.149.60',
    port: 3306,
    user: 'ist_172505',
    password: 'ist_172505',
    database: 'ist'
};

async function executeSqlFile(connection, filePath) {
    try {
        const sql = await fs.readFile(filePath, 'utf8');
        
        // SQL dosyasını noktalı virgüle göre ayır
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        
        console.log(`Executing ${statements.length} statements from ${path.basename(filePath)}...`);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
            }
        }
        
        return true;
    } catch (error) {
        console.error(`Error in ${path.basename(filePath)}:`, error.message);
        return false;
    }
}

async function main() {
    let connection;
    
    try {
        console.log('\n🔌 Veritabanına bağlanılıyor...\n');
        connection = await mysql.createConnection(config);
        console.log('✅ Bağlantı başarılı!\n');
        
        const sqlDir = path.join(__dirname, 'sql-files', 'oner');
        
        // SQL dosyalarını al
        const files = await fs.readdir(sqlDir);
        const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
        
        console.log(`📁 ${sqlFiles.length} SQL dosyası bulundu\n`);
        
        let success = 0;
        let failed = 0;
        
        for (const file of sqlFiles) {
            const filePath = path.join(sqlDir, file);
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📄 İşleniyor: ${file}`);
            console.log('='.repeat(80));
            
            const result = await executeSqlFile(connection, filePath);
            
            if (result) {
                console.log(`✅ Başarılı: ${file}`);
                success++;
            } else {
                console.log(`❌ Başarısız: ${file}`);
                failed++;
            }
        }
        
        console.log(`\n${'='.repeat(80)}`);
        console.log('🎉 İŞLEM TAMAMLANDI!');
        console.log(`✅ Başarılı: ${success}`);
        console.log(`❌ Başarısız: ${failed}`);
        console.log('='.repeat(80));
        
    } catch (error) {
        console.error('❌ Hata:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Veritabanı bağlantısı kapatıldı');
        }
    }
}

main();
