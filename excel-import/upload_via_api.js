const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const API_BASE = 'http://localhost:3001';
const SQL_DIR = path.join(__dirname, 'sql-files', 'oner');

async function executeSqlViaApi(sqlContent) {
    try {
        const response = await axios.post(`${API_BASE}/api/execute-sql`, {
            sql: sqlContent
        }, {
            timeout: 120000, // 2 dakika timeout
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.error || JSON.stringify(error.response.data));
        } else if (error.request) {
            throw new Error('Server yanıt vermedi: ' + error.message);
        }
        throw new Error(error.message || 'Bilinmeyen hata');
    }
}

async function main() {
    try {
        console.log('\n📊 SQL dosyaları yükleniyor...\n');
        
        // SQL dosyalarını al
        const files = await fs.readdir(SQL_DIR);
        const sqlFiles = files.filter(f => f.endsWith('.sql') && !f.startsWith('.')).sort();
        
        console.log(`📁 ${sqlFiles.length} SQL dosyası bulundu\n`);
        
        let success = 0;
        let failed = 0;
        
        for (const file of sqlFiles) {
            const filePath = path.join(SQL_DIR, file);
            
            console.log(`\n${'='.repeat(80)}`);
            console.log(`📄 İşleniyor: ${file}`);
            console.log('='.repeat(80));
            
            try {
                const sqlContent = await fs.readFile(filePath, 'utf8');
                
                // Dosya boyutunu göster
                const sizeKB = (sqlContent.length / 1024).toFixed(2);
                console.log(`📦 Dosya boyutu: ${sizeKB} KB`);
                
                // SQL'i API'ye gönder
                const result = await executeSqlViaApi(sqlContent);
                
                if (result.success) {
                    console.log(`✅ Başarılı: ${file}`);
                    success++;
                } else {
                    console.log(`❌ Başarısız: ${result.error || 'Bilinmeyen hata'}`);
                    failed++;
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`❌ Hata: ${error.message}`);
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
    }
}

main();
