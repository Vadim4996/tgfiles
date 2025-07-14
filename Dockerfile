# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Устанавливаем pnpm
RUN npm install -g pnpm

# Устанавливаем зависимости
RUN pnpm install

# Копируем серверные файлы
COPY server/ ./server/
RUN cd server && npm install

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Меняем владельца файлов
RUN chown -R nextjs:nodejs /app
USER nextjs

# Открываем порты
EXPOSE 3001 5173

# Команда по умолчанию
CMD ["sh", "-c", "cd server && node app.cjs & cd .. && pnpm run dev"] 