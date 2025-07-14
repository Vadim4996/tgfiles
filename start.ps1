# PowerShell скрипт для запуска Telegram Mini App
# Запускает frontend и backend одновременно

Write-Host "🚀 Запуск Telegram Mini App..." -ForegroundColor Green

# Проверяем, что мы в правильной директории
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Ошибка: package.json не найден. Убедитесь, что вы находитесь в корневой папке проекта." -ForegroundColor Red
    exit 1
}

# Проверяем, что .env файл существует
if (-not (Test-Path ".env")) {
    Write-Host "❌ Ошибка: .env файл не найден. Создайте .env файл с JWT_SECRET." -ForegroundColor Red
    exit 1
}

# Устанавливаем зависимости если node_modules не существует
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Установка зависимостей..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка установки зависимостей" -ForegroundColor Red
        exit 1
    }
}

# Проверяем, что server/node_modules существует
if (-not (Test-Path "server/node_modules")) {
    Write-Host "📦 Установка зависимостей сервера..." -ForegroundColor Yellow
    Set-Location "server"
    pnpm install
    Set-Location ".."
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Ошибка установки зависимостей сервера" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Зависимости установлены" -ForegroundColor Green

# Запускаем backend сервер в фоне
Write-Host "🔧 Запуск backend сервера..." -ForegroundColor Blue
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location "server"
    node app.js
}

# Ждем немного, чтобы сервер запустился
Start-Sleep -Seconds 3

# Запускаем frontend
Write-Host "🌐 Запуск frontend..." -ForegroundColor Blue
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    pnpm dev
}

Write-Host "✅ Приложение запущено!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для остановки нажмите Ctrl+C" -ForegroundColor Yellow

try {
    # Ждем завершения любого из процессов
    Wait-Job -Job $backendJob, $frontendJob -Any
} finally {
    # Останавливаем все процессы
    Write-Host "🛑 Остановка приложения..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "✅ Приложение остановлено" -ForegroundColor Green
} 