@echo off
REM ===========================================================
REM Script de ejemplo para abrir Facturador con CUIT
REM ===========================================================

SETLOCAL

REM Configurar la ruta del facturador
SET FACTURADOR_PATH=%~dp0dist\win-unpacked\facturador.exe

REM Verificar si se pasó un CUIT como argumento
IF "%~1"=="" (
    echo.
    echo ERROR: Debe proporcionar un CUIT como argumento
    echo.
    echo Uso: %~nx0 [CUIT]
    echo.
    echo Ejemplos:
    echo   %~nx0 20111111112
    echo   %~nx0 20-11111111-2
    echo   %~nx0 30123456789
    echo.
    pause
    exit /b 1
)

SET CUIT=%~1

REM Verificar que el CUIT tenga el formato correcto (con o sin guiones)
echo Verificando CUIT: %CUIT%

REM Quitar guiones para validación
SET CUIT_SIN_GUIONES=%CUIT:-=%

REM Verificar longitud
SET /A LEN=0
SET "STR=%CUIT_SIN_GUIONES%"
:LOOP
IF DEFINED STR (
    SET STR=%STR:~1%
    SET /A LEN+=1
    GOTO LOOP
)

IF NOT %LEN%==11 (
    echo.
    echo ERROR: El CUIT debe tener 11 dígitos
    echo CUIT proporcionado: %CUIT%
    echo Dígitos detectados: %LEN%
    echo.
    pause
    exit /b 1
)

REM Verificar que el ejecutable existe
IF NOT EXIST "%FACTURADOR_PATH%" (
    echo.
    echo ERROR: No se encontró el ejecutable del facturador
    echo Ruta buscada: %FACTURADOR_PATH%
    echo.
    echo Por favor, compile la aplicación primero:
    echo   npm run build
    echo.
    pause
    exit /b 1
)

REM Mostrar información
echo.
echo ========================================
echo   Abriendo Facturador
echo ========================================
echo.
echo CUIT: %CUIT%
echo Ejecutable: %FACTURADOR_PATH%
echo.

REM Abrir el facturador con el CUIT
START "" "%FACTURADOR_PATH%" %CUIT_SIN_GUIONES%

echo.
echo Facturador iniciado con CUIT: %CUIT%
echo.
echo El CUIT se autocompletará en el formulario...
echo.

ENDLOCAL
