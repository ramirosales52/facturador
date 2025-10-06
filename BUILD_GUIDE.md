# Guía para Generar el Ejecutable de Facturador

## Problema Actual
Hay un conflicto con las dependencias en WSL que impide el build correctamente.
La solución más simple es hacerlo desde Windows nativo.

## OPCIÓN 1: Build desde Windows (RECOMENDADO)

### Pasos:
1. Abre PowerShell o CMD en Windows
2. Navega a tu proyecto:
   ```
   cd C:\Users\rami_\...\ruta\al\facturador
   ```

3. Limpia e instala dependencias:
   ```
   rm -r node_modules, dist -ErrorAction SilentlyContinue
   npm install
   ```

4. Compila:
   ```
   npm run build
   ```

5. Si el paso 4 falla por electron-builder, usa electron-packager:
   ```
   npm install electron-packager --save-dev
   npx electron-packager . Facturador --platform=win32 --arch=x64 --out=dist/packaged --overwrite
   ```

6. El ejecutable estará en: `dist/packaged/Facturador-win32-x64/Facturador.exe`

## OPCIÓN 2: Copiar proyecto a Windows y compilar allí

1. Desde WSL, copia el proyecto:
   ```bash
   cp -r /home/ramiro/Dev/facturador /mnt/c/Users/rami_/Desktop/facturador-temp
   ```

2. Luego sigue los pasos de la OPCIÓN 1 desde Windows

## OPCIÓN 3: Fix el postinstall y reinstalar

Si quieres intentarlo en WSL nuevamente:

```bash
cd /home/ramiro/Dev/facturador

# Restaurar package.json original
git checkout package.json

# Comentar el postinstall manualmente en package.json
# Cambiar: "postinstall": "electron-builder install-app-deps"
# Por:     "postinstall-disabled": "electron-builder install-app-deps"

# Reinstalar todo
rm -rf node_modules package-lock.json
npm install

# Intentar build
npm run dev  # Para probar que funcione
./build-windows.sh  # Para generar el .exe
```

## Por qué falla en WSL?

El problema es un bug conocido de electron-builder v26 con dependencias opcionales
de Tailwind CSS (@emnapi/core) que tienen rutas de archivos mal definidas en WSL.

## Recomendación Final

Te sugiero usar la OPCIÓN 1 (build desde Windows nativo) ya que:
- Es más rápido
- Evita problemas de compatibilidad
- El ejecutable resultante funcionará mejor
- No hay issues con rutas de archivos Windows/Linux

¿Necesitas ayuda con alguno de estos pasos?
