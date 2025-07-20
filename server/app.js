const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const pool = require("./db.cjs");
const { v4: uuidv4 } = require('uuid');

const multer = require('multer');
const upload = multer();

const JWT_SECRET = process.env.JWT_SECRET || "verysecretkey"; // Смените в бою!
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

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

// Middleware для извлечения username из Authorization header
const extractUsername = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  try {
    // Декодируем base64 токен
    const username = Buffer.from(token, 'base64').toString('utf8');
    if (!username || username.trim() === '') {
      return res.status(401).json({ error: 'Invalid username in token' });
    }
    
    req.username = username.trim();
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
};

// Простой тестовый endpoint
app.get("/api/test", (req, res) => {
  console.log("Тестовый запрос получен");
  res.json({ message: "Сервер работает!", timestamp: new Date().toISOString() });
});

// Проверка структуры базы данных
app.get("/api/check-db", async (req, res) => {
  try {
    // Проверяем существование таблицы notes
    const notesTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notes'
      )
    `);
    
    // Проверяем структуру таблицы notes
    const notesColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'notes' 
      ORDER BY ordinal_position
    `);
    
    // Проверяем существование таблицы blobs
    const blobsTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blobs'
      )
    `);
    
    res.json({
      notes_table_exists: notesTable.rows[0].exists,
      blobs_table_exists: blobsTable.rows[0].exists,
      notes_columns: notesColumns.rows,
      message: "Проверка структуры БД завершена"
    });
  } catch (e) {
    console.error('Ошибка при проверке БД:', e);
    res.status(500).json({ error: 'Ошибка проверки БД', details: e.message });
  }
});

// Создание таблиц если их нет
app.post("/api/init-db", async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Читаем SQL файл
    const sqlPath = path.join(__dirname, 'create_notes_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Выполняем SQL
    await pool.query(sqlContent);
    
    res.json({ 
      message: "Таблицы созданы успешно",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Ошибка при создании таблиц:', e);
    res.status(500).json({ error: 'Ошибка создания таблиц', details: e.message });
  }
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
      `SELECT name, active, folder_id FROM ${table} ORDER BY name ASC`
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

// --- CRUD для заметок (notes) ---
// Получить дерево заметок пользователя
app.get('/api/notes', extractUsername, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notes WHERE username = $1 AND is_deleted = FALSE ORDER BY note_position ASC, date_created ASC`,
      [req.username]
    );
    res.json({ rows: result.rows });
  } catch (e) {
    console.error('Ошибка при получении заметок:', e);
    res.status(500).json({ error: 'Ошибка получения заметок', details: e.message });
  }
});

// Получить одну заметку по note_id
app.get('/api/notes/:noteId', extractUsername, async (req, res) => {
  const { noteId } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT * FROM notes WHERE note_id = $1 AND username = $2`,
      [noteId, req.username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Заметка не найдена' });
    res.json({ note: result.rows[0] });
  } catch (e) {
    console.error('Ошибка при получении заметки:', e);
    res.status(500).json({ error: 'Ошибка получения заметки', details: e.message });
  }
});

// Создать новую заметку
app.post('/api/notes', extractUsername, upload.none(), async (req, res) => {
  // Логируем body для отладки
  console.log('POST /api/notes req.body:', req.body);
  // Для FormData в некоторых WebView поля могут быть не в req.body, а в req.body.get
  let title = req.body.title;
  let content = req.body.content;
  let parent_id = req.body.parent_id;
  let type = req.body.type;
  if (parent_id === '') parent_id = null;
  // Попробуем получить из FormData, если обычный body пустой
  if (!title && typeof req.body.get === 'function') {
    title = req.body.get('title');
    content = req.body.get('content');
    parent_id = req.body.get('parent_id');
    type = req.body.get('type');
  }
  try {
    const note_id = uuidv4();
    const now = new Date();
    const result = await pool.query(
      `INSERT INTO notes (note_id, username, parent_note_id, title, content, type, mime, is_protected, is_expanded, note_position, prefix, date_created, utc_date_created, date_modified, utc_date_modified, attributes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [note_id, req.username, parent_id, title, content, type, null, null, null, null, null, now, now, now, now, {}]
    );
    res.json({ note: result.rows[0] });
  } catch (e) {
    console.error('Ошибка при создании заметки:', e);
    res.status(500).json({ error: 'Ошибка создания заметки', details: e.message });
  }
});

// Обновить заметку
app.put('/api/notes/:noteId', extractUsername, async (req, res) => {
  const { noteId } = req.params;
  const { title, content, parent_id } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE notes SET title = $1, content = $2, parent_note_id = $3, date_modified = NOW(), utc_date_modified = NOW() WHERE note_id = $4 AND username = $5 RETURNING *`,
      [title, content, parent_id, noteId, req.username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Заметка не найдена' });
    res.json({ note: result.rows[0] });
  } catch (e) {
    console.error('Ошибка при обновлении заметки:', e);
    res.status(500).json({ error: 'Ошибка обновления заметки', details: e.message });
  }
});

// Удалить заметку (soft delete)
app.delete('/api/notes/:noteId', extractUsername, async (req, res) => {
  const { noteId } = req.params;
  
  try {
    await pool.query(
      `UPDATE notes SET is_deleted = TRUE, delete_id = $1 WHERE note_id = $2 AND username = $3`,
      [uuidv4(), noteId, req.username]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка при удалении заметки:', e);
    res.status(500).json({ error: 'Ошибка удаления заметки', details: e.message });
  }
});

// Новый endpoint для обновления заметки через POST + FormData
app.post('/api/notes/update', extractUsername, upload.none(), async (req, res) => {
  console.log('POST /api/notes/update req.body:', req.body);
  const note_id = req.body.note_id;
  const title = req.body.title;
  const content = req.body.content;
  const parent_id = req.body.parent_id || null;
  const type = req.body.type || 'note';
  if (!note_id || !title) {
    return res.status(400).json({ error: 'note_id и title обязательны' });
  }
  try {
    const result = await pool.query(
      `UPDATE notes SET title = $1, content = $2, parent_note_id = $3, type = $4, date_modified = NOW(), utc_date_modified = NOW() WHERE note_id = $5 AND username = $6 RETURNING *`,
      [title, content, parent_id, type, note_id, req.username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Заметка не найдена' });
    res.json({ note: result.rows[0] });
  } catch (e) {
    console.error('Ошибка при обновлении заметки:', e);
    res.status(500).json({ error: 'Ошибка обновления заметки', details: e.message });
  }
});

// --- CRUD для атрибутов ---
// Получить все атрибуты заметки
app.get('/api/attributes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM attributes WHERE note_id = $1`,
      [noteId]
    );
    res.json({ rows: result.rows });
  } catch (e) {
    console.error('Ошибка при получении атрибутов:', e);
    res.status(500).json({ error: 'Ошибка получения атрибутов', details: e.message });
  }
});
// Добавить атрибут
app.post('/api/attributes', async (req, res) => {
  const { note_id, type, name, value, position, is_inheritable } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO attributes (note_id, type, name, value, position, is_inheritable) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [note_id, type, name, value, position, is_inheritable]
    );
    res.json({ attribute: result.rows[0] });
  } catch (e) {
    console.error('Ошибка при добавлении атрибута:', e);
    res.status(500).json({ error: 'Ошибка добавления атрибута', details: e.message });
  }
});
// Обновить атрибут
app.patch('/api/attribute/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const allowed = ['type','name','value','position','is_inheritable'];
  const set = [];
  const values = [];
  let idx = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      set.push(`${key} = $${idx}`);
      values.push(fields[key]);
      idx++;
    }
  }
  if (set.length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });
  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE attributes SET ${set.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Атрибут не найден' });
    res.json({ attribute: result.rows[0] });
  } catch (e) {
    console.error('Ошибка при обновлении атрибута:', e);
    res.status(500).json({ error: 'Ошибка обновления атрибута', details: e.message });
  }
});
// Удалить атрибут
app.delete('/api/attribute/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM attributes WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка при удалении атрибута:', e);
    res.status(500).json({ error: 'Ошибка удаления атрибута', details: e.message });
  }
});

// --- CRUD для blobs (вложений) ---
// Загрузить blob
app.post('/api/blobs', extractUsername, upload.fields([{ name: 'file' }, { name: 'note_id' }]), async (req, res) => {
  console.log('=== POST /api/blobs ===');
  console.log('req.body:', req.body);
  console.log('req.files:', req.files);
  const file = req.files?.file?.[0];
  const note_id = req.body.note_id;
  if (!file || !note_id) return res.status(400).json({ error: 'Нет файла или note_id' });
  
  try {
    // Проверяем, что заметка принадлежит пользователю
    const noteCheck = await pool.query(
      `SELECT 1 FROM notes WHERE note_id = $1 AND username = $2`,
      [note_id, req.username]
    );
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Заметка не найдена' });
    }
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO blobs (id, note_id, data, mime, size, filename) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, note_id, file.buffer, file.mimetype, file.size, file.originalname]
    );
    res.json({ id });
  } catch (e) {
    console.error('Ошибка при загрузке blob:', e);
    res.status(500).json({ error: 'Ошибка загрузки blob', details: e.message });
  }
});
// Получить blob
app.get('/api/blobs/:id', extractUsername, async (req, res) => {
  const { id } = req.params;
  try {
    // Проверяем, что blob принадлежит заметке пользователя
    const result = await pool.query(
      `SELECT b.* FROM blobs b 
       JOIN notes n ON b.note_id = n.note_id 
       WHERE b.id = $1 AND n.username = $2`,
      [id, req.username]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Blob не найден' });
    const blob = result.rows[0];
    res.setHeader('Content-Type', blob.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${blob.filename || id}"`);
    res.send(blob.data);
  } catch (e) {
    console.error('Ошибка при получении blob:', e);
    res.status(500).json({ error: 'Ошибка получения blob', details: e.message });
  }
});
// Удалить blob
app.delete('/api/blobs/:id', extractUsername, async (req, res) => {
  const { id } = req.params;
  try {
    // Проверяем, что blob принадлежит заметке пользователя
    const blobCheck = await pool.query(
      `SELECT b.id FROM blobs b 
       JOIN notes n ON b.note_id = n.note_id 
       WHERE b.id = $1 AND n.username = $2`,
      [id, req.username]
    );
    if (blobCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Blob не найден' });
    }
    
    await pool.query(`DELETE FROM blobs WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Ошибка при удалении blob:', e);
    res.status(500).json({ error: 'Ошибка удаления blob', details: e.message });
  }
});

// Получить вложения для заметки
app.get('/api/blobs', extractUsername, async (req, res) => {
  const { note_id } = req.query;
  if (!note_id) return res.json({ rows: [] });
  
  try {
    // Проверяем, что заметка принадлежит пользователю
    const noteCheck = await pool.query(
      `SELECT 1 FROM notes WHERE note_id = $1 AND username = $2`,
      [note_id, req.username]
    );
    if (noteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Заметка не найдена' });
    }
    
    const result = await pool.query(
      `SELECT * FROM blobs WHERE note_id = $1 ORDER BY created_at ASC`,
      [note_id]
    );
    res.json({ rows: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения вложений', details: e.message });
  }
});

// Добавьте здесь другие эндпоинты/Webhook для Telegram!

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("API Server running on port", PORT);
});