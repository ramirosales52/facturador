import * as net from 'net';

/**
 * Verifica si un puerto está disponible
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Encuentra un puerto disponible comenzando desde el puerto preferido
 */
export async function findAvailablePort(preferredPort: number, maxAttempts: number = 10): Promise<number> {
  let port = preferredPort;
  
  for (let i = 0; i < maxAttempts; i++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port++;
  }
  
  throw new Error(`No se pudo encontrar un puerto disponible después de ${maxAttempts} intentos (comenzando desde ${preferredPort})`);
}
