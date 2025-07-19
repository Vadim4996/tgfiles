# 🔧 Устранение неполадок

## Проблема с созданием заметок

### Симптомы
- Ошибка: `null value in column "username" of relation "notes" violates not-null constraint`
- Не удается создать заметки в базе знаний
- Пустой список заметок

### Причина
Backend ожидает JWT токен с полем `username`, но frontend отправляет простую строку.

### Решение

#### 1. Обновить backend (уже сделано)
Backend теперь правильно обрабатывает base64-кодированные токены.

#### 2. Проверить структуру базы данных
```bash
# На Linux сервере
curl http://localhost:3001/api/check-db
```

#### 3. Создать таблицы если их нет
```bash
# На Linux сервере
curl -X POST http://localhost:3001/api/init-db
```

#### 4. Протестировать API
```bash
# На Linux сервере
chmod +x test_api.sh
./test_api.sh
```

### Проверка работы

1. **Откройте приложение** в браузере: `http://localhost:8080`
2. **Введите username** при запросе (например: `dedynio`)
3. **Перейдите в "База знаний"**
4. **Попробуйте создать заметку**

### Логи для отладки

Проверьте логи сервера:
```bash
# На Linux сервере
tail -f /var/log/your-app.log
```

Ожидаемые логи:
```
✅ Подключение к базе данных установлено
2025-07-19T08:49:27.848Z - GET /api/notes {
  query: {},
  body: {},
  headers: { 'content-type': undefined, authorization: 'present' }
}
```

### Если проблема сохраняется

1. **Проверьте подключение к БД**:
   ```bash
   curl http://localhost:3001/api/test
   ```

2. **Проверьте структуру таблиц**:
   ```bash
   curl http://localhost:3001/api/check-db
   ```

3. **Создайте таблицы заново**:
   ```bash
   curl -X POST http://localhost:3001/api/init-db
   ```

4. **Перезапустите сервер**:
   ```bash
   # Остановить
   pkill -f "node app.js"
   
   # Запустить
   cd server && node app.js
   ```

### Контакты
Если проблема не решается, создайте issue с логами сервера и браузера. 