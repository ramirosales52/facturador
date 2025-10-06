#!/bin/bash

echo "=== Generando ejecutable para Windows ==="
echo ""

# Limpiar directorio dist
echo "1. Limpiando directorio dist..."
rm -rf dist

# Build con Vite
echo "2. Compilando con Vite..."
npx vite build

if [ $? -ne 0 ]; then
    echo "Error en la compilación con Vite"
    exit 1
fi

# Instalar electron-packager si no está instalado
echo "3. Preparando electron-packager..."
npm install --save-dev electron-packager --no-save

# Empaquetar con electron-packager
echo "4. Empaquetando aplicación para Windows..."
npx electron-packager . Facturador \
    --platform=win32 \
    --arch=x64 \
    --out=dist/packaged \
    --overwrite \
    --icon=build/icon.ico \
    --app-copyright="Facturador 2025" \
    --app-version="1.0.0" \
    --ignore="^/(src|node_modules/\.cache|\.git|\.github|build)"

if [ $? -eq 0 ]; then
    echo ""
    echo "=== ✓ Build completado exitosamente ==="
    echo "Ubicación: dist/packaged/Facturador-win32-x64/"
    echo ""
    echo "Para copiar al escritorio de Windows:"
    echo "cp -r dist/packaged/Facturador-win32-x64 /mnt/c/Users/rami_/Desktop/Facturador"
else
    echo "Error en el empaquetado"
    exit 1
fi
