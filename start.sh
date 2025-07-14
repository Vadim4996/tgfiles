#!/usr/bin/env bash
set -e

# Переходим в директорию, где лежит этот скрипт (корень проекта)
cd "$(dirname "$0")"

echo "🚀 Запуск Telegram Mini App..."

# Проверяем, установлен ли tmux
if command -v tmux &> /dev/null; then
    echo "📦 Используем tmux для параллельного запуска..."

    # Создаем новую сессию tmux
    tmux new-session -d -s miniapp

    # 1-е окно: бэкенд
    tmux send-keys -t miniapp "cd server && HOST=0.0.0.0 node app.js" C-m

    # 2-е окно: фронтенд
    tmux new-window -t miniapp -n frontend
    tmux send-keys -t miniapp:frontend "cd ../ && pnpm run dev" C-m

    # Прикрепляемся к сессии
    tmux attach-session -t miniapp

else
    echo "📦 tmux не найден, запускаем в фоне..."

    # Запуск бэкенда
    echo "🔧 Запуск бэкенда..."
    (cd server && HOST=0.0.0.0 node app.js) &
    BACKEND_PID=$!

    # Немного ждём, чтобы бэкенд успел подняться
    sleep 2

    # Запуск фронтенда
    echo "🎨 Запуск фронтенда..."
    pnpm run dev &
    FRONTEND_PID=$!

    echo "✅ Приложение запущено!"
    echo "🔧 Бэкенд PID: $BACKEND_PID"
    echo "🎨 Фронтенд PID: $FRONTEND_PID"
    echo ""
    echo "📱 Фронтенд: http://localhost:5173"
    echo "🔌 Бэкенд:  http://localhost:3001"
    echo ""
    echo "Для остановки нажмите Ctrl+C"

    # Ждём завершения обоих процессов
    wait
fi
