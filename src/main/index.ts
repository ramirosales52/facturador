import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { config } from 'dotenv'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { AppModule } from './app.module'
import { extraerCUITDeArgumentos } from './utils/cuit-validator'
import { findAvailablePort } from './utils/port-finder'

// Cargar variables de entorno desde múltiples ubicaciones
// 1. Desde el directorio del proyecto (desarrollo)
config()

// 2. Si está empaquetado, buscar .env en app.asar.unpacked
if (app.isPackaged) {
  const resourcesPath = process.resourcesPath
  const envPathUnpacked = join(resourcesPath, 'app.asar.unpacked', '.env')
  
  if (existsSync(envPathUnpacked)) {
    config({ path: envPathUnpacked })
    console.log('✓ Variables de entorno cargadas desde:', envPathUnpacked)
  } else {
    console.log('⚠ No se encontró .env en app.asar.unpacked')
  }
}

// 3. Desde el directorio userData (para permitir personalización del usuario)
const userDataPath = app.getPath('userData')
const envPathUserData = join(userDataPath, '.env')
if (existsSync(envPathUserData)) {
  config({ path: envPathUserData })
  console.log('✓ Variables de entorno cargadas desde userData:', envPathUserData)
}

// Store simple sin dependencias
const storePath = join(userDataPath, 'config.json')
const simpleStore = {
  get: (key: string) => {
    try {
      if (existsSync(storePath)) {
        const data = JSON.parse(readFileSync(storePath, 'utf-8'))
        return data[key]
      }
    }
    catch (error) {
      console.error('Error reading store:', error)
    }
    return undefined
  },
  set: (key: string, value: any) => {
    try {
      let data = {}
      if (existsSync(storePath)) {
        data = JSON.parse(readFileSync(storePath, 'utf-8'))
      }
      data[key] = value
      writeFileSync(storePath, JSON.stringify(data, null, 2))
    }
    catch (error) {
      console.error('Error writing store:', error)
    }
  },
}

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
app.disableHardwareAcceleration()

// Puerto del backend NestJS
let BACKEND_PORT = 3000

// Capturar argumentos de línea de comandos
const isDev = !app.isPackaged
const commandLineArgs = isDev ? process.argv.slice(2) : process.argv.slice(1)

console.log('=== ARGUMENTOS DE LINEA DE COMANDOS ===')
console.log('isDev:', isDev)
console.log('commandLineArgs:', commandLineArgs)

// Extraer CUIT de los argumentos si existe
const cuitFromCommandLine = extraerCUITDeArgumentos(commandLineArgs)

if (cuitFromCommandLine) {
  console.log('✓ CUIT detectado desde línea de comandos:', cuitFromCommandLine)
}
else {
  console.log('✗ No se detectó ningún CUIT válido en los argumentos')
}
console.log('========================================')

// IPC para que el renderer pueda obtener el CUIT
ipcMain.handle('get-command-line-cuit', () => {
  console.log('IPC: get-command-line-cuit llamado, devolviendo:', cuitFromCommandLine)
  return cuitFromCommandLine
})

// IPC para que el renderer obtenga el puerto del backend
ipcMain.handle('get-backend-port', () => {
  return BACKEND_PORT
})

// IPC para verificar si un archivo existe
ipcMain.handle('fs-exists', async (_event, filePath: string) => {
  try {
    return existsSync(filePath)
  }
  catch (error) {
    console.error('Error al verificar archivo:', error)
    return false
  }
})

// IPC para shell.showItemInFolder - Abrir carpeta y seleccionar archivo
ipcMain.handle('shell-open-path', async (_event, filePath: string) => {
  try {
    if (!filePath) {
      console.error('Ruta no válida')
      return 'Ruta no válida'
    }

    // Verificar si el archivo existe
    if (!existsSync(filePath)) {
      return 'El archivo fue borrado o movido'
    }

    // Normalizar la ruta
    const normalizedPath = filePath.replace(/\//g, '\\')

    // Abrir el explorador en la carpeta y seleccionar el archivo
    shell.showItemInFolder(normalizedPath)

    return 'ok'
  }
  catch (error) {
    console.error('Error al abrir carpeta:', error)
    return String(error)
  }
})

// IPC para dialog.showOpenDialog
ipcMain.handle('dialog-show-open', async (_event, options: any) => {
  return await dialog.showOpenDialog(options)
})

// IPC para imprimir PDF
ipcMain.handle('print-pdf', async (_event, filePath: string) => {
  try {
    if (!filePath) {
      return { success: false, error: 'Ruta no válida' }
    }

    // Verificar si el archivo existe
    if (!existsSync(filePath)) {
      return { success: false, error: 'El archivo fue borrado o movido' }
    }

    // Crear una ventana invisible para cargar el PDF
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Cargar el PDF
    await printWindow.loadURL(`file://${filePath}`)

    // Esperar a que el contenido esté listo
    await new Promise(resolve => setTimeout(resolve, 500))

    // Abrir el diálogo de impresión
    printWindow.webContents.print({}, (success, errorType) => {
      if (!success && errorType) {
        console.error('Error al imprimir:', errorType)
      }
      
      // Cerrar la ventana después de imprimir o cancelar
      printWindow.close()
    })

    return { success: true }
  }
  catch (error) {
    console.error('Error al abrir PDF para imprimir:', error)
    return { success: false, error: String(error) }
  }
})

// IPC para electron-store
ipcMain.handle('store-get', (_event, key: string) => {
  return simpleStore.get(key)
})

ipcMain.handle('store-set', (_event, key: string, value: any) => {
  simpleStore.set(key, value)
})

async function electronAppInit() {
  const isDev = !app.isPackaged
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
      app.quit()
  })

  if (isDev) {
    if (process.platform === 'win32') {
      process.on('message', (data) => {
        if (data === 'graceful-exit')
          app.quit()
      })
    }
    else {
      process.on('SIGTERM', () => {
        app.quit()
      })
    }
  }

  await app.whenReady()
}

async function bootstrap() {
  try {
    await electronAppInit()

    // Buscar puerto disponible para el backend
    console.log('Buscando puerto disponible para el backend...')
    BACKEND_PORT = await findAvailablePort(3000, 10)
    console.log(`Puerto del backend: ${BACKEND_PORT}`)

    // Si no es el puerto predeterminado, informar al usuario
    if (BACKEND_PORT !== 3000) {
      console.warn(`⚠️  Puerto 3000 ocupado, usando puerto alternativo: ${BACKEND_PORT}`)
    }

    const nestApp = await NestFactory.create(AppModule)
    nestApp.enableCors()
    await nestApp.listen(BACKEND_PORT)

    console.log(`✓ Servidor NestJS iniciado en puerto ${BACKEND_PORT}`)
  }
  catch (error) {
    console.error('Error al iniciar la aplicación:', error)

    // Mostrar diálogo de error al usuario
    if (app.isReady()) {
      dialog.showErrorBox(
        'Error al iniciar',
        `No se pudo iniciar la aplicación:\n\n${error.message}\n\nPor favor, cierre otras aplicaciones que puedan estar usando puertos de red e intente nuevamente.`,
      )
    }

    app.quit()
  }
}

bootstrap()
