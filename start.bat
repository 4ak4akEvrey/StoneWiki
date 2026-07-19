@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem -- Определяем, какой командой запускается Python --
set PYCMD=
where python >nul 2>nul
if %errorlevel%==0 (
    set PYCMD=python
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        set PYCMD=py
    )
)

if "%PYCMD%"=="" (
    echo.
    echo [OSHIBKA] Python ne nayden.
    echo Ustanovi Python s https://www.python.org/downloads/
    echo Pri ustanovke obyazatelno postav galochku "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)

rem -- Если venv есть, но битый (нет activate.bat) — пересоздаём --
if exist venv (
    if not exist venv\Scripts\activate.bat (
        echo Okruzhenie venv povrezhdeno, peresozdayu...
        rmdir /s /q venv
    )
)

if not exist venv (
    echo Pervy zapusk: sozdayu okruzhenie...
    %PYCMD% -m venv venv
    if not exist venv\Scripts\activate.bat (
        echo.
        echo [OSHIBKA] Ne udalos sozdat venv.
        echo Poprobuy vypolnit vruchnuyu v etoy papke:
        echo     %PYCMD% -m venv venv
        echo i posmotri, kakaya oshibka poyavitsya.
        echo.
        pause
        exit /b 1
    )

    call venv\Scripts\activate.bat
    echo Stavlyu zavisimosti ^(mkdocs, mkdocs-material^)...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo [OSHIBKA] Ne udalos ustanovit zavisimosti. Smotri soobschenie vyshe.
        echo.
        pause
        exit /b 1
    )
) else (
    call venv\Scripts\activate.bat
)

echo.
echo Zapuskayu sayt... Otkroy v brauzere http://127.0.0.1:8000
echo Chtoby ostanovit - zakroy eto okno ili nazhmi Ctrl+C.
echo.
mkdocs serve
pause
