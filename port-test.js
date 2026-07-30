const mysql = require('mysql2/promise');

const ports = [3306, 3307, 8880, 8080, 33060];

async function tryConnect() {
    for (const port of ports) {
        console.log(`Port ${port} deneniyor...`);
        try {
            const connection = await mysql.createConnection({
                host: process.env.MYSQL_HOST,
                port: port,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
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
