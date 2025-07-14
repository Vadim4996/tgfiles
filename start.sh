#!/bin/bash

cd "$(dirname "$0")"   # Гарантируем запуск из папки проекта

# Скрипт для запуска фронтенда и бэкенда на Debian/Linux
# Использование: ./start.sh

set -e

echo "🚀 Запуск Telegram Mini App..."

# Проверяем, установлен ли tmux
if command -v tmux &> /dev/null; then
    echo "📦 Используем tmux для параллельного запуска..."
    
    # Создаем новую сессию tmux
    tmux new-session -d -s miniapp
    
    # Запускаем бэкенд в первом окне (HOST=0.0.0.0)
    tmux send-keys -t miniapp "cd server && HOST=0.0.0.0 node app.js" C-m
    
    # Создаем второе окно для фронтенда
    tmux new-window -t miniapp -n frontend
    tmux send-keys -t miniapp:frontend "pnpm run dev" C-m
    
    # Переключаемся на сессию
    tmux attach-session -t miniapp
    
else
    echo "📦 tmux не найден, запускаем в фоне..."
    
    # Запускаем бэкенд в фоне (HOST=0.0.0.0)
    echo "🔧 Запуск бэкенда..."
    cd server && HOST=0.0.0.0 node app.js &
    BACKEND_PID=$!
    cd ..  # Возвращаемся в корень проекта
    # Ждем немного
    sleep 2
    
    # Запускаем фронтенд
    echo "🎨 Запуск фронтенда..."
    cd "$(dirname "$0")"  # Гарантируем запуск из папки с package.json
    pnpm run dev &
    FRONTEND_PID=$!
    
    echo "✅ Приложение запущено!"
    echo "🔧 Бэкенд PID: $BACKEND_PID"
    echo "🎨 Фронтенд PID: $FRONTEND_PID"
    echo ""
    echo "📱 Фронтенд: http://localhost:5173"
    echo "🔌 Бэкенд: http://localhost:3001"
    echo ""
    echo "Для остановки нажмите Ctrl+C"
    
    # Ждем завершения
    wait
fi 