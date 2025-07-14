const { Pool } = require('pg');

console.log('Настройки подключения к базе данных:', {
  host: process.env.PGHOST || '192.168.1.213',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD ? '***' : '040608'
});

const pool = new Pool({
  host: process.env.PGHOST || '192.168.1.213',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'postgres',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '040608',
});

// Логирование подключения
pool.on('connect', () => {
  console.log('✅ Подключение к базе данных установлено');
});

pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к базе данных:', err);
});

// Тестовое подключение
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка тестового запроса к базе данных:', err);
  } else {
    console.log('✅ Тестовый запрос к базе данных успешен:', res.rows[0]);
  }
});

module.exports = pool;