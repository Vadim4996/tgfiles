#!/bin/bash

# Скрипт для запуска фронтенда и бэкенда
# Использование: ./start.sh

echo "🚀 Запуск Telegram Mini App..."

# Проверяем, установлен ли tmux
if command -v tmux &> /dev/null; then
    echo "📦 Используем tmux для параллельного запуска..."
    
    # Создаем новую сессию tmux
    tmux new-session -d -s miniapp
    
    # Запускаем бэкенд в первом окне
    tmux send-keys -t miniapp "cd server && node app.cjs" C-m
    
    # Создаем второе окно для фронтенда
    tmux new-window -t miniapp -n frontend
    tmux send-keys -t miniapp:frontend "pnpm run dev" C-m
    
    # Переключаемся на сессию
    tmux attach-session -t miniapp
    
else
    echo "📦 tmux не найден, запускаем в фоне..."
    
    # Запускаем бэкенд в фоне
    echo "🔧 Запуск бэкенда..."
    cd server && node app.cjs &
    BACKEND_PID=$!
    
    # Ждем немного
    sleep 2
    
    # Запускаем фронтенд
    echo "🎨 Запуск фронтенда..."
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