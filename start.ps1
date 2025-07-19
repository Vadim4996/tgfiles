# Запуск приложения на Windows
Write-Host "Запуск приложения..." -ForegroundColor Green

# Запуск backend в фоне
Start-Process powershell -ArgumentList "-Command", "cd server; node app.js" -WindowStyle Minimized

# Ждем немного для запуска backend
Start-Sleep -Seconds 3

# Запуск frontend
Write-Host "Запуск frontend..." -ForegroundColor Yellow
npm run dev 