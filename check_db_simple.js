const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: 'mihawk.trdns.com',
    user: 'ist',
    password: 'ist',
    database: 'ist'
  });

  const [cols] = await conn.query('DESCRIBE tuik_hayvancilik_canlihayvan');
  console.log('COLUMNS:', cols.map(c => c.Field).join(', '));
  
  const [sample] = await conn.query('SELECT * FROM tuik_hayvancilik_canlihayvan LIMIT 1');
  console.log('\nSAMPLE ROW:', JSON.stringify(sample[0], null, 2));
  
  await conn.end();
}

check();
