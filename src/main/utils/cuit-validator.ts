/**
 * Valida y extrae un CUIT de un array de argumentos de línea de comandos
 * Soporta formatos: 20123456789 o 20-12345678-9
 */
export function extraerCUITDeArgumentos(args: string[]): string | null {
  for (const arg of args) {
    const cuitLimpio = arg.replace(/[^0-9]/g, '');
    
    if (/^\d{11}$/.test(cuitLimpio)) {
      return cuitLimpio;
    }
  }
  
  return null;
}
