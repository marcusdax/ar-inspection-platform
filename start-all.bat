@echo off
echo Starting AR Inspection Platform - Full Stack
echo.
echo Starting Docker services (PostgreSQL and Redis)...
docker-compose up -d
echo.
echo Waiting for databases to be ready...
timeout /t 5 /nobreak > nul
echo.
echo Docker services are running!
echo.
echo To start the application:
echo   1. Open a new terminal and run: start-backend.bat
echo   2. Open another terminal and run: start-web.bat
echo.
echo Or use IntelliJ IDEA run configurations as described in INTELLIJ_SETUP.md
echo.
pause
