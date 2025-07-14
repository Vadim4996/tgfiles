# Telegram Mini App

Мини-приложение для Telegram, которое получает user id из Telegram WebApp API и отображает содержимое базы данных из таблиц вида `{userid}_vector_collections`.

## Возможности

- Получение user id через Telegram WebApp API
- Отображение данных из PostgreSQL таблиц `{userid}_vector_collections`
- Удаление строк из базы данных
- Изменение статуса поля "Active" через флажок
- Подробное логирование всех операций

## Установка и запуск

### 1. Установка зависимостей

```bash
# Основные зависимости
pnpm install

# Серверные зависимости
cd server
npm install
cd ..
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

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

### 3. Запуск приложения

#### В Windows PowerShell:

1. **Разрешите выполнение скриптов:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Запустите приложение:**
   ```powershell
   pnpm run start:win
   ```

#### Альтернативный способ (запуск по отдельности):

1. **Запустите сервер:**
   ```powershell
   cd server
   node app.cjs
   ```

2. **В новом терминале запустите фронтенд:**
   ```powershell
   pnpm run dev
   ```

### 4. Доступ к приложению

- **Фронтенд**: http://localhost:5173
- **Бэкенд API**: http://localhost:3001

## API Endpoints

- `GET /api/vector-collections/:userId` - Получить все строки пользователя
- `DELETE /api/vector-collections/:userId/:rowId` - Удалить строку
- `POST /api/vector-collections/:userId/toggle` - Изменить статус active

## Структура проекта

```
├── src/                    # Frontend (React + TypeScript)
│   ├── pages/             # Страницы приложения
│   ├── utils/             # Утилиты (useAuth, useFiles)
│   └── components/        # UI компоненты
├── server/                # Backend (Express + PostgreSQL)
│   ├── app.cjs           # Основной серверный файл
│   ├── db.cjs            # Подключение к базе данных
│   └── package.json      # Серверные зависимости
├── start.sh              # Скрипт запуска для Linux/Mac
├── start.ps1             # Скрипт запуска для Windows
└── SETUP.md              # Подробные инструкции
```

## Логирование

Сервер ведет подробные логи всех операций:
- Запросы к API с полной информацией
- Операции с базой данных
- Ошибки и предупреждения
- Время выполнения операций

## Тестирование

Для тестирования без Telegram бота:
1. Откройте приложение в браузере
2. Введите user id в появившемся prompt
3. Перейдите к странице коллекции

## Решенные проблемы

- ✅ Исправлена проблема с picomatch
- ✅ Добавлена поддержка Windows PowerShell
- ✅ Создан отдельный package.json для сервера
- ✅ Добавлено подробное логирование
- ✅ Интегрирован Telegram WebApp API
- ✅ Реализованы все необходимые эндпоинты
