@echo off
setlocal
cd /d "%~dp0"

where dotnet >nul 2>nul || (
  echo ERRO: instale o .NET 6 SDK antes de continuar.
  pause
  exit /b 1
)
where node >nul 2>nul || (
  echo ERRO: instale o Node.js 22 ou superior antes de continuar.
  pause
  exit /b 1
)

if not exist "backend\.env" copy /y "backend\.env.example" "backend\.env" >nul
if not exist "frontend\.env" copy /y "frontend\.env.example" "frontend\.env" >nul

where docker >nul 2>nul && docker compose up -d postgres

echo Instalando dependencias e iniciando o SmartPlan...
call npm install
if errorlevel 1 exit /b 1

start "" powershell -NoProfile -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:5173'"
call npm run dev
