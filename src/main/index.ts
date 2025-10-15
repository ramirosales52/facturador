import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { app, ipcMain, dialog, shell } from 'electron';
import { findAvailablePort } from './utils/port-finder';
import { extraerCUITDeArgumentos } from './utils/cuit-validator';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Store simple sin dependencias
const storePath = join(app.getPath('userData'), 'config.json');
const simpleStore = {
  get: (key: string) => {
    try {
      if (existsSync(storePath)) {
        const data = JSON.parse(readFileSync(storePath, 'utf-8'));
        return data[key];
      }
    } catch (error) {
      console.error('Error reading store:', error);
    }
    return undefined;
  },
  set: (key: string, value: any) => {
    try {
      let data = {};
      if (existsSync(storePath)) {
        data = JSON.parse(readFileSync(storePath, 'utf-8'));
      }
      data[key] = value;
      writeFileSync(storePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing store:', error);
    }
  }
};

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
app.disableHardwareAcceleration()

// Puerto del backend NestJS
let BACKEND_PORT = 3000;

// Capturar argumentos de línea de comandos
const isDev = !app.isPackaged;
const commandLineArgs = isDev ? process.argv.slice(2) : process.argv.slice(1);

console.log('=== ARGUMENTOS DE LINEA DE COMANDOS ===');
console.log('isDev:', isDev);
console.log('commandLineArgs:', commandLineArgs);

// Extraer CUIT de los argumentos si existe
const cuitFromCommandLine = extraerCUITDeArgumentos(commandLineArgs);

if (cuitFromCommandLine) {
  console.log('✓ CUIT detectado desde línea de comandos:', cuitFromCommandLine);
} else {
  console.log('✗ No se detectó ningún CUIT válido en los argumentos');
}
console.log('========================================');

// IPC para que el renderer pueda obtener el CUIT
ipcMain.handle('get-command-line-cuit', () => {
  console.log('IPC: get-command-line-cuit llamado, devolviendo:', cuitFromCommandLine);
  return cuitFromCommandLine;
});

// IPC para que el renderer obtenga el puerto del backend
ipcMain.handle('get-backend-port', () => {
  return BACKEND_PORT;
});

// IPC para shell.openPath - Abrir carpeta en el explorador
ipcMain.handle('shell-open-path', async (_event, path: string) => {
  try {
    // En Windows, usar shell.openPath para abrir la carpeta
    const result = await shell.openPath(path);
    if (result) {
      // Si devuelve algo es porque hubo error
      console.error('Error al abrir carpeta:', result);
    }
    return result;
  } catch (error) {
    console.error('Error en shell.openPath:', error);
    return String(error);
  }
});

// IPC para dialog.showOpenDialog
ipcMain.handle('dialog-show-open', async (_event, options: any) => {
  return await dialog.showOpenDialog(options);
});

// IPC para electron-store
ipcMain.handle('store-get', (_event, key: string) => {
  return simpleStore.get(key);
});

ipcMain.handle('store-set', (_event, key: string, value: any) => {
  simpleStore.set(key, value);
});

async function electronAppInit() {
  const isDev = !app.isPackaged;
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  if (isDev) {
    if (process.platform === 'win32') {
      process.on('message', (data) => {
        if (data === 'graceful-exit') app.quit();
      });
    } else {
      process.on('SIGTERM', () => {
        app.quit();
      });
    }
  }

  await app.whenReady();
}

async function bootstrap() {
  try {
    await electronAppInit();
    
    // Buscar puerto disponible para el backend
    console.log('Buscando puerto disponible para el backend...');
    BACKEND_PORT = await findAvailablePort(3000, 10);
    console.log(`Puerto del backend: ${BACKEND_PORT}`);
    
    // Si no es el puerto predeterminado, informar al usuario
    if (BACKEND_PORT !== 3000) {
      console.warn(`⚠️  Puerto 3000 ocupado, usando puerto alternativo: ${BACKEND_PORT}`);
    }
    
    const nestApp = await NestFactory.create(AppModule);
    nestApp.enableCors();
    await nestApp.listen(BACKEND_PORT);
    
    console.log(`✓ Servidor NestJS iniciado en puerto ${BACKEND_PORT}`);
  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    
    // Mostrar diálogo de error al usuario
    if (app.isReady()) {
      await dialog.showErrorBox(
        'Error al iniciar',
        `No se pudo iniciar la aplicación:\n\n${error.message}\n\nPor favor, cierre otras aplicaciones que puedan estar usando puertos de red e intente nuevamente.`
      );
    }
    
    app.quit();
  }
}

bootstrap();
