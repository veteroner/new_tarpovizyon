const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MySQL bağlantı havuzu
const pool = mysql.createPool({
    host: '77.245.149.60',
    port: 3306,
    user: 'ist_172505',
    password: 'ist_172505',
    database: 'ist',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Tüm tabloları listele
app.get('/api/tables', async (req, res) => {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const result = [];
        
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);
            const [count] = await pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
            
            result.push({
                name: tableName,
                columns: columns,
                rowCount: count[0].total
            });
        }
        
        res.json({ success: true, tables: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Belirli bir tablonun verilerini al
app.get('/api/table/:name', async (req, res) => {
    try {
        const tableName = req.params.name;
        const limit = Math.min(parseInt(req.query.limit) || 1000, 10000);
        const offset = parseInt(req.query.offset) || 0;
        
        const [data] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limit, offset]);
        const [count] = await pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
        
        res.json({ 
            success: true, 
            table: tableName,
            data: data,
            total: count[0].total,
            limit,
            offset
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Özel SQL sorgusu çalıştır (sadece SELECT)
app.post('/api/query', async (req, res) => {
    try {
        const { sql } = req.body;
        
        if (!sql || !sql.trim().toUpperCase().startsWith('SELECT')) {
            return res.status(400).json({ success: false, error: 'Sadece SELECT sorguları desteklenir' });
        }
        
        const [data] = await pool.query(sql);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Dashboard istatistikleri
app.get('/api/stats', async (req, res) => {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const stats = {
            totalTables: tables.length,
            tables: {},
            totalRows: 0
        };
        
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            const [count] = await pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
            stats.tables[tableName] = count[0].total;
            stats.totalRows += count[0].total;
        }
        
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Grafik için agregasyon endpoint'i
app.post('/api/aggregate', async (req, res) => {
    try {
        const { table, groupBy, aggregateColumn, aggregateFunction = 'COUNT' } = req.body;
        
        let query;
        if (aggregateColumn && aggregateColumn !== '*') {
            query = `SELECT \`${groupBy}\` as label, ${aggregateFunction}(\`${aggregateColumn}\`) as value 
                     FROM \`${table}\` 
                     GROUP BY \`${groupBy}\` 
                     ORDER BY value DESC 
                     LIMIT 50`;
        } else {
            query = `SELECT \`${groupBy}\` as label, COUNT(*) as value 
                     FROM \`${table}\` 
                     GROUP BY \`${groupBy}\` 
                     ORDER BY value DESC 
                     LIMIT 50`;
        }
        
        const [data] = await pool.query(query);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Dashboard sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
