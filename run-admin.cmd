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

echo Dang khoi dong admin tai http://localhost:3002 ...
call pnpm dev:admin

if errorlevel 1 (
  echo.
  echo [ERROR] Admin da dung do co loi. Hay xem thong bao phia tren.
  pause
  exit /b 1
)

endlocal
