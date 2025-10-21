/**
 * Configuración del SDK de AFIP/ARCA
 * 
 * IMPORTANTE: El CUIT se configura desde la interfaz de usuario,
 * no desde variables de entorno.
 */

export const ArcaConfig = {
  // Ambiente: false = homologación/testing, true = producción
  // Usar getter para leer en tiempo de ejecución, no en tiempo de importación
  get production() {
    return process.env.AFIP_PRODUCTION === 'true'
  },
}

/**
 * Tipos de comprobantes más comunes
 */
export const TiposComprobante = {
  FACTURA_A: 1,
  NOTA_DEBITO_A: 2,
  NOTA_CREDITO_A: 3,
  FACTURA_B: 6,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_B: 8,
  FACTURA_C: 11,
  NOTA_DEBITO_C: 12,
  NOTA_CREDITO_C: 13,
  FACTURA_E: 19,
}

/**
 * Tipos de documento
 */
export const TiposDocumento = {
  CUIT: 80,
  CUIL: 86,
  CDI: 87,
  LE: 89,
  LC: 90,
  CI_EXTRANJERA: 91,
  EN_TRAMITE: 92,
  ACTA_NACIMIENTO: 93,
  CI_BS_AS_RNP: 95,
  DNI: 96,
  PASAPORTE: 94,
  CONSUMIDOR_FINAL: 99,
}

/**
 * Tipos de IVA
 */
export const TiposIVA = {
  IVA_0: 3,
  IVA_10_5: 4,
  IVA_21: 5,
  IVA_27: 6,
}

/**
 * Conceptos
 */
export const Conceptos = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
}

/**
 * Condiciones frente al IVA
 */
export const CondicionesIVA = {
  RESPONSABLE_INSCRIPTO: 1,
  RESPONSABLE_NO_INSCRIPTO: 2,
  RESPONSABLE_NO_INSCRIPTO_BIENES_DE_USO: 3,
  EXENTO: 4,
  CONSUMIDOR_FINAL: 5,
  RESPONSABLE_MONOTRIBUTO: 6,
  SUJETO_NO_CATEGORIZADO: 7,
  PROVEEDOR_DEL_EXTERIOR: 8,
  CLIENTE_DEL_EXTERIOR: 9,
  IVA_LIBERADO_LEY_19_640: 10,
  RESPONSABLE_INSCRIPTO_AGENTE_PERCEPCION: 11,
  PEQUENO_CONTRIBUYENTE_EVENTUAL: 12,
  MONOTRIBUTISTA_SOCIAL: 13,
  PEQUENO_CONTRIBUYENTE_EVENTUAL_SOCIAL: 14,
}
