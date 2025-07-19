#!/bin/bash

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка наличия package.json
if [ ! -f package.json ]; then
  echo -e "${RED}❌ Ошибка: package.json не найден. Запустите скрипт из корня проекта.${NC}"
  exit 1
fi

# Проверка .env
if [ ! -f .env ]; then
  echo -e "${RED}❌ Ошибка: .env файл не найден. Создайте .env файл с JWT_SECRET и DATABASE_URL.${NC}"
  exit 1
fi

# Установка зависимостей frontend
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}📦 Установка зависимостей frontend...${NC}"
  pnpm install || npm install
fi

# Установка зависимостей backend
if [ ! -d server/node_modules ]; then
  echo -e "${YELLOW}📦 Установка зависимостей backend...${NC}"
  cd server && pnpm install || npm install
  cd ..
fi

echo -e "${GREEN}✅ Все зависимости установлены${NC}"

# Запуск backend в фоне
cd server
node app.js &
BACK_PID=$!
cd ..

# Ждем, чтобы backend успел стартовать
sleep 2

echo -e "${YELLOW}🌐 Запуск frontend...${NC}"

# Запуск frontend
npm run dev

# При завершении frontend убиваем backend
trap "kill $BACK_PID" EXIT 