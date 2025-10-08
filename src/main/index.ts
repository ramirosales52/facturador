import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { app } from 'electron';

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
app.disableHardwareAcceleration()

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
    const nestApp = await NestFactory.create(AppModule);
    nestApp.enableCors();
    await nestApp.listen(3000);
  } catch (error) {
    console.log(error);
    app.quit();
  }
}

bootstrap();
