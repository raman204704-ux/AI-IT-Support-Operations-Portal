@echo off
echo ===================================================
echo Starting AI-Powered IT Support Assistant Backend...
echo ===================================================
cd /d "%~dp0backend"
call ".\venv\Scripts\activate.bat"
if "%~1"=="" (
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn app.main:app %*
)
pause
