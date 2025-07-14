# Инструкции по настройке и запуску

## Настройка переменных окружения

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# Настройки базы данных PostgreSQL
PGHOST=192.168.1.213
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres
PGPASSWORD=040608

# JWT секрет для авторизации (смените в продакшене!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Порт сервера
PORT=3001
```

## Установка зависимостей

### Основные зависимости (фронтенд)
```bash
pnpm install
```

### Серверные зависимости
```bash
cd server
npm install
```

## Запуск приложения

### В Windows PowerShell:

1. **Разрешите выполнение скриптов:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Запустите приложение:**
   ```powershell
   pnpm run start:win
   ```

### Альтернативный способ (запуск по отдельности):

1. **Запустите сервер:**
   ```powershell
   cd server
   node app.cjs
   ```

2. **В новом терминале запустите фронтенд:**
   ```powershell
   pnpm run dev
   ```

## Доступ к приложению

- **Фронтенд:** http://localhost:5173
- **Бэкенд:** http://localhost:3001

## Структура базы данных

Приложение работает с таблицами вида `{userid}_vector_collections`, где:
- `userid` - ID пользователя из Telegram
- Таблица содержит поля: `id`, `filename`, `active`

## Логирование

Сервер ведет подробные логи всех операций:
- Запросы к API
- Операции с базой данных
- Ошибки и предупреждения

## Тестирование

Для тестирования без Telegram бота:
1. Откройте приложение в браузере
2. Введите user id в появившемся prompt
3. Перейдите к странице коллекции 