export class CreateArcaDto {
  PtoVta?: number; // Punto de venta (por defecto 1)
  CbteTipo?: number; // Tipo de comprobante (11 = Factura C)
  Concepto?: number; // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
  DocTipo?: number; // Tipo de documento (99 = Consumidor Final, 80 = CUIT, etc.)
  DocNro?: number; // Número de documento
  CondicionIVAReceptorId?: number; // Condición IVA receptor (1 = IVA Responsable Inscripto, 5 = Consumidor Final, etc.)
  ImpTotal: number; // Importe total
  ImpNeto: number; // Importe neto gravado
  ImpIVA: number; // Importe de IVA
  ImpTotConc?: number; // Importe neto no gravado
  ImpOpEx?: number; // Importe exento
  ImpTrib?: number; // Importe de tributos
  MonId?: string; // Moneda (PES = Pesos)
  MonCotiz?: number; // Cotización de la moneda
  Iva?: Array<{
    Id: number; // ID del tipo de IVA (3 = 0%, 4 = 10.5%, 5 = 21%, 6 = 27%)
    BaseImp: number; // Base imponible
    Importe: number; // Importe de IVA
  }>;
}

