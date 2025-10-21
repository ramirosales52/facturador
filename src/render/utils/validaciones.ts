/**
 * Valida si un string es un CUIT válido (11 dígitos)
 */
export function validarCUIT(cuit: string): boolean {
  const cuitLimpio = cuit.replace(/\D/g, '')
  return /^\d{11}$/.test(cuitLimpio)
}

/**
 * Formatea un CUIT agregando guiones: 20-12345678-9
 */
export function formatearCUIT(cuit: string): string {
  const cuitLimpio = cuit.replace(/\D/g, '')

  if (cuitLimpio.length !== 11) {
    return cuit
  }

  return `${cuitLimpio.slice(0, 2)}-${cuitLimpio.slice(2, 10)}-${cuitLimpio.slice(10)}`
}

/**
 * Limpia un CUIT removiendo guiones y espacios
 */
export function limpiarCUIT(cuit: string): string {
  return cuit.replace(/\D/g, '')
}

/**
 * Extrae un CUIT válido de un array de argumentos
 * Soporta formatos: 20123456789 o 20-12345678-9
 */
export function extraerCUITDeArgumentos(args: string[]): string | null {
  for (const arg of args) {
    const cuitLimpio = limpiarCUIT(arg)
    if (validarCUIT(cuitLimpio)) {
      return cuitLimpio
    }
  }
  return null
}
