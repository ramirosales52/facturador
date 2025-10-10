// Constantes de AFIP para facturación electrónica

export const TIPOS_COMPROBANTE = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
} as const;

export const TIPOS_DOCUMENTO = [
  { id: '80', nombre: 'CUIT' },
  { id: '96', nombre: 'DNI' },
  { id: '99', nombre: 'Consumidor Final' },
] as const;

export const CONDICIONES_IVA = [
  { id: '1', nombre: 'IVA Responsable Inscripto' },
  { id: '4', nombre: 'IVA Sujeto Exento' },
  { id: '5', nombre: 'Consumidor Final' },
  { id: '6', nombre: 'Responsable Monotributo' },
] as const;

export const CONDICIONES_IVA_EMISOR = [
  { id: '1', nombre: 'Responsable Inscripto' },
  { id: '6', nombre: 'Responsable Monotributo' },
  { id: '4', nombre: 'Exento' },
] as const;

export const CONCEPTOS = [
  { id: '1', nombre: 'Productos' },
  { id: '2', nombre: 'Servicios' },
  { id: '3', nombre: 'Productos y Servicios' },
] as const;

export const ALICUOTAS_IVA = [
  { id: '3', nombre: '0%', porcentaje: 0 },
  { id: '4', nombre: '10.5%', porcentaje: 10.5 },
  { id: '5', nombre: '21%', porcentaje: 21 },
  { id: '6', nombre: '27%', porcentaje: 27 },
  { id: '8', nombre: '5%', porcentaje: 5 },
  { id: '9', nombre: '2.5%', porcentaje: 2.5 },
] as const;

export const UNIDADES_MEDIDA = [
  { id: 'unidad', nombre: 'Unidad' },
  { id: 'kg', nombre: 'Kilogramo' },
  { id: 'metro', nombre: 'Metro' },
  { id: 'litro', nombre: 'Litro' },
  { id: 'hora', nombre: 'Hora' },
  { id: 'mes', nombre: 'Mes' },
  { id: 'servicio', nombre: 'Servicio' },
] as const;

// Valores por defecto
export const DEFAULTS = {
  CUIT_EMISOR: '20409378472',
  PUERTO_BACKEND: 3000,
  TIPO_FACTURA: 'B' as const,
  TIPO_DOCUMENTO: '80',
  CONCEPTO: '1',
  CONDICION_IVA: '5',
  CONDICION_IVA_EMISOR: '1',
  PUNTO_VENTA: 1,
  ALICUOTA_IVA_DEFAULT: '5', // 21%
  UNIDAD_MEDIDA_DEFAULT: 'unidad',
  CANTIDAD_DEFAULT: 1,
} as const;
