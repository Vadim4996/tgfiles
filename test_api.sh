#!/bin/bash

echo "🧪 Тестирование API..."

# Проверка структуры БД
echo "📊 Проверка структуры БД..."
curl -s http://localhost:3001/api/check-db | jq .

echo ""
echo "🔧 Создание таблиц..."
curl -s -X POST http://localhost:3001/api/init-db | jq .

echo ""
echo "📝 Тестирование создания заметки..."
curl -s -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(echo -n 'dedynio' | base64)" \
  -d '{"title":"Тестовая заметка","content":"Содержимое заметки","parent_id":null}' | jq .

echo ""
echo "📋 Получение списка заметок..."
curl -s -H "Authorization: Bearer $(echo -n 'dedynio' | base64)" \
  http://localhost:3001/api/notes | jq .

echo ""
echo "✅ Тестирование завершено!" 