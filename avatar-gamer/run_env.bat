@echo off
echo ===== Iniciando ENV =====
echo.

rem Cambia al directorio del backend
cd %~dp0\backend

rem Activa el entorno virtual
call .venv\Scripts\activate.bat

echo.
echo Verificando dependencias...
pip install -r requirements.txt

call cd ..