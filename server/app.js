const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const pool = require("./db.cjs");

const JWT_SECRET = process.env.JWT_SECRET || "verysecretkey"; // Смените в бою!
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers['authorization'] ? 'present' : 'missing'
    }
  });
  next();
});

// Простой тестовый endpoint
app.get("/api/test", (req, res) => {
  console.log("Тестовый запрос получен");
  res.json({ message: "Сервер работает!", timestamp: new Date().toISOString() });
});

// Получить все строки из таблицы {username}_vector_collections
app.get("/api/vector-collections/:username", async (req, res) => {
  const { username } = req.params;
  const table = `${username}_vector_collections`;
  
  console.log(`Запрос данных из таблицы: ${table}`);
  
  try {
    // Сначала проверим, существует ли таблица
    const tableExists = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [table]
    );
    
    if (!tableExists.rows[0].exists) {
      console.log(`Таблица ${table} не существует`);
      return res.json({ rows: [] });
    }
    
    const result = await pool.query(
      `SELECT name, active FROM ${table} ORDER BY name ASC`
    );
    
    console.log(`Получено ${result.rows.length} строк из таблицы ${table}`);
    res.json({ rows: result.rows });
  } catch (e) {
    console.error(`Ошибка при получении данных из таблицы ${table}:`, e);
    res.status(500).json({ error: "Ошибка получения данных", details: e.message });
  }
});

// Удалить строку по name с каскадным удалением векторов
app.delete("/api/vector-collections/:username/:name", async (req, res) => {
  const { username, name } = req.params;
  const collectionsTable = `${username}_vector_collections`;
  const vectorsTable = `${username}_rag_vectors`;

  console.log(`Удаление коллекции с name='${name}' из таблицы ${collectionsTable} и связанных векторов из ${vectorsTable}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Получаем uuid коллекции по name
    const uuidResult = await client.query(
      `SELECT uuid FROM ${collectionsTable} WHERE name = $1`,
      [name]
    );
    if (uuidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Коллекция не найдена' });
    }
    const uuid = uuidResult.rows[0].uuid;
    // Удаляем все rag_vectors с этим collection_id
    await client.query(
      `DELETE FROM ${vectorsTable} WHERE collection_id = $1`,
      [uuid]
    );
    // Удаляем саму коллекцию
    await client.query(
      `DELETE FROM ${collectionsTable} WHERE name = $1`,
      [name]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(`Ошибка при каскадном удалении коллекции и векторов:`, e);
    res.status(500).json({ error: 'Ошибка каскадного удаления', details: e.message });
  } finally {
    client.release();
  }
});

// Изменить поле active по name
app.post("/api/vector-collections/:username/toggle", async (req, res) => {
  const { username } = req.params;
  const { name, active } = req.body;
  const table = `${username}_vector_collections`;
  
  console.log(`Обновление статуса строки с name='${name}' в таблице ${table} на ${active}`);
  
  try {
  await pool.query(
      `UPDATE ${table} SET active = $1 WHERE name = $2`,
      [!!active, name]
  );
  res.json({ success: true });
  } catch (e) {
    console.error(`Ошибка при обновлении строки в таблице ${table}:`, e);
    res.status(500).json({ error: "Ошибка обновления", details: e.message });
  }
});

// Добавьте здесь другие эндпоинты/Webhook для Telegram!

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("API Server running on port", PORT);
});