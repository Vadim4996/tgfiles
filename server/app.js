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

// Удалить строку по name
app.delete("/api/vector-collections/:username/:name", async (req, res) => {
  const { username, name } = req.params;
  const table = `${username}_vector_collections`;
  
  console.log(`Удаление строки с name='${name}' из таблицы ${table}`);
  
  try {
    await pool.query(
      `DELETE FROM ${table} WHERE name = $1`,
      [name]
    );
    res.json({ success: true });
  } catch (e) {
    console.error(`Ошибка при удалении строки из таблицы ${table}:`, e);
    res.status(500).json({ error: "Ошибка удаления", details: e.message });
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