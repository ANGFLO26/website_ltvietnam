@echo off
setlocal

cd /d "%~dp0"

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Khong tim thay pnpm. Hay cai pnpm 10 truoc khi chay du an.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] Chua co file .env.
  echo Hay chay: node scripts/local-up.mjs
  pause
  exit /b 1
)

echo Dang khoi dong backend tai http://localhost:3001 ...
call pnpm dev:backend

if errorlevel 1 (
  echo.
  echo [ERROR] Backend da dung do co loi. Hay xem thong bao phia tren.
  pause
  exit /b 1
)

endlocal
