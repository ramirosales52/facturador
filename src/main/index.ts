import { NestFactory } from '@nestjs/core'
import { app } from 'electron'
import { AppModule } from './app.module'

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

// Fix for WSL2 with WSLg - disable GPU acceleration
if (process.platform === 'linux') {
  // Check if running in WSL
  const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSLENV
  
  if (isWSL) {
    console.log('🐧 Detected WSL environment, applying Electron flags for compatibility...')
    app.disableHardwareAcceleration()
    app.commandLine.appendSwitch('disable-gpu')
    app.commandLine.appendSwitch('no-sandbox')
    console.log('✅ Electron flags applied for WSL')
  }
}

async function electronAppInit() {
  const isDev = !app.isPackaged
  
  console.log('📝 Display info:', {
    DISPLAY: process.env.DISPLAY,
    WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
    XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE,
    WSL_DISTRO_NAME: process.env.WSL_DISTRO_NAME
  })
  
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

  console.log('⏳ Waiting for Electron app to be ready...')
  
  // Use promise-based approach that works better in WSL
  if (app.isReady()) {
    console.log('✅ Electron app is already ready')
    return
  }
  
  return new Promise<void>((resolve) => {
    app.once('ready', () => {
      console.log('✅ Electron app is now ready')
      resolve()
    })
  })
}

async function bootstrap() {
  try {
    console.log('🚀 Starting Electron app initialization...')
    await electronAppInit()
    console.log('✅ Electron app initialized')

    console.log('🚀 Creating NestJS application...')
    const nestApp = await NestFactory.create(AppModule)
    console.log('✅ NestJS application created')

    nestApp.enableCors()
    console.log('✅ CORS enabled')

    await nestApp.listen(3000)
    console.log('✅ NestJS listening on port 3000')
  }
  catch (error) {
    console.error('❌ Error during bootstrap:', error)

    app.quit()
  }
}

bootstrap()
