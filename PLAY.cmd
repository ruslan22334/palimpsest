@echo off
cd /d "%~dp0"
if exist "dist\Palimpsest-win32-x64\Palimpsest.exe" (
  start "" "dist\Palimpsest-win32-x64\Palimpsest.exe"
) else (
  start "" "%~dp0index.html"
)
