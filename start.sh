#!/usr/bin/env bash
set -e

# Абсолютный путь к директории скрипта (корень проекта)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Запуск Telegram Mini App..."

if command -v tmux &> /dev/null; then
    echo "📦 Используем tmux для параллельного запуска..."

    tmux new-session -d -s miniapp

    # Бэкенд в первом окне
    tmux send-keys -t miniapp \
      "cd \"$ROOT_DIR/server\" && HOST=0.0.0.0 node app.js" C-m

    # Фронтенд во втором окне
    tmux new-window -t miniapp -n frontend
    tmux send-keys -t miniapp:frontend \
      "cd \"$ROOT_DIR\" && pnpm install && pnpm run dev" C-m

    tmux attach-session -t miniapp
else
    echo "📦 tmux не найден, запускаем в фоне..."

    # Запуск бэкенда
    echo "🔧 Запуск бэкенда..."
    (cd "$ROOT_DIR/server" && HOST=0.0.0.0 node app.js) &
    BACKEND_PID=$!

    sleep 2

    # Запуск фронтенда
    echo "🎨 Запуск фронтенда..."
    (
      cd "$ROOT_DIR" \
      && pnpm install \
      && pnpm run dev
    ) &
    FRONTEND_PID=$!

    echo "✅ Приложение запущено!"
    echo "🔧 Бэкенд PID: $BACKEND_PID"
    echo "🎨 Фронтенд PID: $FRONTEND_PID"
    echo ""
    echo "📱 Фронтенд: http://localhost:5173"
    echo "🔌 Бэкенд: http://localhost:3001"
    echo ""
    echo "Для остановки нажмите Ctrl+C"

    wait
fi
