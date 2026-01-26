const mysql = require('mysql2/promise');

const ports = [3306, 3307, 8880, 8080, 33060];

async function tryConnect() {
    for (const port of ports) {
        console.log(`Port ${port} deneniyor...`);
        try {
            const connection = await mysql.createConnection({
                host: '77.245.149.60',
                port: port,
                user: 'ist_172505',
                password: 'ist_172505',
                database: 'ist',
                connectTimeout: 5000
            });
            console.log(`Port ${port} BAŞARILI!`);
            await connection.end();
            return port;
        } catch (error) {
            console.log(`Port ${port}: ${error.code || error.message}`);
        }
    }
    return null;
}

tryConnect();
