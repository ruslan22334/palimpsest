@echo off
cd /d "%~dp0"
if exist "Palimpsest.exe" (
  start "" "Palimpsest.exe" --mirror-study
) else if exist "dist\Palimpsest-win32-x64\Palimpsest.exe" (
  start "" "dist\Palimpsest-win32-x64\Palimpsest.exe" --mirror-study
) else (
  npm exec --offline -- electron . --mirror-study
)
