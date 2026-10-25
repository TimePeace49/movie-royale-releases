@echo off
title Movie Royal
cd /d "%~dp0"
where node >nul 2>nul || (echo. & echo  Node.js is not installed. Get the LTS version from https://nodejs.org then run this again. & echo. & pause & exit /b)
if not exist node_modules (echo Installing for the first time, one moment... & call npm install --no-audit --no-fund)
start "" http://localhost:3737
node src/server.js
pause
