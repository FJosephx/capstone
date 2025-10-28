@echo off
echo ===== Iniciando ENV =====
echo.

rem Cambia al directorio del backend
cd %~dp0\backend

rem Activa el entorno virtual
call .venv\Scripts\activate.bat

call cd ..
call cd frontend/avatargamer-app
call ionic build
call npx cap copy android
call npx cap sync android
call adb reverse --remove-all
call adb reverse tcp:8100 tcp:8100
call adb reverse tcp:8000 tcp:8000
call npx ionic cap run android -l --external --host=192.168.1.5 --port=8100