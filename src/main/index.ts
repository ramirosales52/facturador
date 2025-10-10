import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { app, ipcMain, dialog } from 'electron';
import { findAvailablePort } from './utils/port-finder';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
app.disableHardwareAcceleration()

// Puerto del backend NestJS
let BACKEND_PORT = 3000;

// Capturar argumentos de línea de comandos
// En producción: ['Facturador.exe', 'arg1', 'arg2', ...]
// En desarrollo: ['electron', 'path/to/app', 'arg1', 'arg2', ...]
const isDev = !app.isPackaged;
const commandLineArgs = isDev ? process.argv.slice(2) : process.argv.slice(1);
let cuitFromCommandLine: string | null = null;

console.log('=== ARGUMENTOS DE LINEA DE COMANDOS ===');
console.log('isDev:', isDev);
console.log('process.argv:', process.argv);
console.log('commandLineArgs:', commandLineArgs);

// Buscar CUIT en los argumentos (debe ser un número de 11 dígitos)
for (const arg of commandLineArgs) {
  console.log('Analizando argumento:', arg);
  
  // Verificar si es un CUIT válido (11 dígitos)
  if (/^\d{11}$/.test(arg)) {
    cuitFromCommandLine = arg;
    console.log('✓ CUIT detectado desde línea de comandos:', cuitFromCommandLine);
    break;
  }
  // También soportar formato con guiones: 20-12345678-9
  const cuitSinGuiones = arg.replace(/-/g, '');
  if (/^\d{11}$/.test(cuitSinGuiones)) {
    cuitFromCommandLine = cuitSinGuiones;
    console.log('✓ CUIT detectado desde línea de comandos (con guiones):', cuitFromCommandLine);
    break;
  }
}

if (!cuitFromCommandLine) {
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
