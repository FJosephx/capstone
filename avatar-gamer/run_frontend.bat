@echo off
echo ===== Iniciando ENV =====
echo.


call cd frontend/avatargamer-app
call npx ionic build
call npx cap copy android
call npx cap sync android
call adb reverse --remove-all
call adb reverse tcp:8100 tcp:8100
call adb reverse tcp:8000 tcp:8000
call npx ionic serve