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

// Получить все папки пользователя
app.get("/api/folders/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM folders WHERE username = $1",
      [username]
    );
    res.json({ rows: result.rows });
  } catch (e) {
    console.error("Ошибка при получении папок:", e);
    res.status(500).json({ error: "Ошибка получения папок", details: e.message });
  }
});

// Создать новую папку
app.post("/api/folders/:username", async (req, res) => {
  const { username } = req.params;
  const { name, parent_id } = req.body;
  try {
    // Проверка на дубликаты в рамках одного родителя
    const exists = await pool.query(
      "SELECT 1 FROM folders WHERE username = $1 AND name = $2 AND parent_id IS NOT DISTINCT FROM $3",
      [username, name, parent_id]
    );
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Папка с таким именем уже существует в выбранном разделе" });
    }
    const result = await pool.query(
      "INSERT INTO folders (username, name, parent_id) VALUES ($1, $2, $3) RETURNING *",
      [username, name, parent_id]
    );
    res.json({ folder: result.rows[0] });
  } catch (e) {
    console.error("Ошибка при создании папки:", e);
    res.status(500).json({ error: "Ошибка создания папки", details: e.message });
  }
});

// Удалить папку (и все вложенные папки и файлы)
app.delete("/api/folders/:username/:folderId", async (req, res) => {
  const { username, folderId } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Рекурсивно найти все вложенные папки
    const toDelete = [];
    async function collectFolders(id) {
      toDelete.push(id);
      const children = await client.query(
        "SELECT id FROM folders WHERE parent_id = $1 AND username = $2",
        [id, username]
      );
      for (const row of children.rows) {
        await collectFolders(row.id);
      }
    }
    await collectFolders(Number(folderId));
    // Удалить все файлы из коллекций, привязанных к этим папкам
    for (const id of toDelete) {
      await client.query(
        `UPDATE ${username}_vector_collections SET folder_id = NULL WHERE folder_id = $1`,
        [id]
      );
    }
    // Удалить папки
    await client.query(
      `DELETE FROM folders WHERE id = ANY($1::int[]) AND username = $2`,
      [toDelete, username]
    );
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Ошибка при удалении папки:", e);
    res.status(500).json({ error: "Ошибка удаления папки", details: e.message });
  } finally {
    client.release();
  }
});

// Переименовать или переместить папку
app.patch("/api/folders/:username/:folderId", async (req, res) => {
  const { username, folderId } = req.params;
  const { name, parent_id } = req.body;
  try {
    // Проверка на дубликаты при переименовании
    if (name) {
      const exists = await pool.query(
        "SELECT 1 FROM folders WHERE username = $1 AND name = $2 AND parent_id IS NOT DISTINCT FROM $3 AND id != $4",
        [username, name, parent_id ?? null, folderId]
      );
      if (exists.rows.length > 0) {
        return res.status(400).json({ error: "Папка с таким именем уже существует в выбранном разделе" });
      }
    }
    // Обновить имя и/или parent_id
    const fields = [];
    const values = [];
    let idx = 1;
    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (typeof parent_id !== 'undefined') {
      fields.push(`parent_id = $${idx++}`);
      values.push(parent_id);
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }
    values.push(username);
    values.push(folderId);
    const setClause = fields.join(', ');
    const result = await pool.query(
      `UPDATE folders SET ${setClause} WHERE username = $${idx++} AND id = $${idx} RETURNING *`,
      values
    );
    res.json({ folder: result.rows[0] });
  } catch (e) {
    console.error("Ошибка при обновлении папки:", e);
    res.status(500).json({ error: "Ошибка обновления папки", details: e.message });
  }
});

// Переместить файл в папку (или в 'Без папки')
app.patch("/api/vector-collections/:username/move", async (req, res) => {
  const { username } = req.params;
  const { name, folder_id } = req.body;
  const table = `${username}_vector_collections`;
  try {
    // Проверка, существует ли файл
    const exists = await pool.query(
      `SELECT 1 FROM ${table} WHERE name = $1`,
      [name]
    );
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Файл не найден" });
    }
    await pool.query(
      `UPDATE ${table} SET folder_id = $1 WHERE name = $2`,
      [folder_id, name]
    );
    res.json({ success: true });
  } catch (e) {
    console.error("Ошибка при перемещении файла:", e);
    res.status(500).json({ error: "Ошибка перемещения файла", details: e.message });
  }
});

// Добавьте здесь другие эндпоинты/Webhook для Telegram!

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("API Server running on port", PORT);
});