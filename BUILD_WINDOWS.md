# Cómo generar el ejecutable en Windows

## Pasos a seguir:

### 1. Actualiza el código desde GitHub
```bash
git pull origin main
```

### 2. Limpia e instala dependencias (si es necesario)
```bash
# Si ya hiciste npm install antes, no es necesario
npm install
```

### 3. Ejecuta el build
```bash
npm run build
```

Esto debería funcionar ahora que agregué todas las dependencias de Node.js como externas en vite.config.mts.

### 4. El ejecutable estará en:
```
dist/electron/win-unpacked/Facturador.exe
```

O si quieres un instalador:
```
dist/electron/Facturador Setup X.X.X.exe
```

## Si todavía falla:

### Opción alternativa - usar electron-packager (más simple):
```bash
# Primero compila solo con Vite (sin electron-builder)
npm run dev

# Luego empaqueta manualmente
npm install electron-packager --save-dev
npx electron-packager . Facturador --platform=win32 --arch=x64 --out=dist/packaged --overwrite --ignore="^/(src|\.git)"
```

El ejecutable estará en: `dist/packaged/Facturador-win32-x64/Facturador.exe`

## Problema resuelto:
✅ Agregué @afipsdk/afip.js y todas las dependencias de NestJS a la lista de módulos externos
✅ Esto evita que esbuild intente empaquetar módulos de Node.js que deben quedar externos
✅ Ahora el build debería funcionar correctamente

## Para copiar al escritorio:
```bash
# Copia la carpeta completa con el ejecutable
cp -r dist/electron/win-unpacked "C:\Users\rami_\Desktop\Facturador"
```

o si usaste electron-packager:
```bash
cp -r dist/packaged/Facturador-win32-x64 "C:\Users\rami_\Desktop\Facturador"
```

¡Listo! Ahora podrás ejecutar Facturador.exe desde tu escritorio.
