@echo off
title TCG:HUB — 3D Studio Server
echo ========================================================
echo       TCG:HUB — Interactive 3D Card Studio
echo               by theAstroBruh
echo ========================================================
echo.
echo Iniciando servidor local en el puerto 8000...
echo Abre tu navegador en: http://localhost:8000
echo.
python -m http.server 8000
pause
