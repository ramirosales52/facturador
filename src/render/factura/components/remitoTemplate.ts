import { generarHTMLFactura, type ArticuloFactura, type FacturaPDFData, type IVAAgrupado } from './facturaTemplate'

export type ArticuloRemito = ArticuloFactura
export type IVAAgrupadoRemito = IVAAgrupado

export interface RemitoPDFData {
  PtoVta?: number
  puntoVenta?: number
  CbteTipo?: number
  CbteDesde?: number
  numero?: number
  DocTipo?: number
  docTipo?: number
  DocNro?: number
  docNro?: number
  ImpTotal?: number
  ImpNeto?: number
  ImpIVA?: number
  CAI?: string
  cai?: string
  CAIFchVto?: string
  caiVencimiento?: string
  FchProceso?: string
  fecha?: string
  TipoFactura?: 'A' | 'B'
  CondicionIVA?: string
  condicionIVA?: string
  RazonSocial?: string
  razonSocial?: string
  cliente?: string
  Domicilio?: string
  domicilio?: string
  Concepto?: string
  concepto?: string
  CondicionVenta?: string
  condicionVenta?: string
  Articulos?: ArticuloFactura[]
  items?: ArticuloFactura[]
  IVAsAgrupados?: IVAAgrupado[]
  ivasAgrupados?: IVAAgrupado[]
  DatosEmisor?: FacturaPDFData['DatosEmisor']
  datosEmisor?: FacturaPDFData['DatosEmisor']
}

function normalizarArticulos(remitoInfo: RemitoPDFData): ArticuloFactura[] {
  const source = remitoInfo.Articulos || remitoInfo.items || []

  return source.map((articulo, index) => ({
    codigo: articulo.codigo || String(index + 1).padStart(3, '0'),
    descripcion: articulo.descripcion,
    cantidad: articulo.cantidad,
    unidadMedida: articulo.unidadMedida || 'Unidad',
    precioUnitario: articulo.precioUnitario || 0,
    alicuotaIVA: articulo.alicuotaIVA || '0',
    porcentajeIVA: articulo.porcentajeIVA || 0,
    subtotal: articulo.subtotal || (articulo.cantidad * (articulo.precioUnitario || 0)),
  }))
}

export function generarHTMLRemito(remitoInfo: RemitoPDFData, qrImageUrl: string, cuit: number, logoPath?: string, arcaLogoPath?: string): string {
  void qrImageUrl
  const ptoVta = remitoInfo.PtoVta ?? remitoInfo.puntoVenta ?? 0
  const cbteDesde = remitoInfo.CbteDesde ?? remitoInfo.numero ?? 0
  const docTipo = remitoInfo.DocTipo ?? remitoInfo.docTipo ?? 80
  const docNro = remitoInfo.DocNro ?? remitoInfo.docNro ?? 0
  const fecha = remitoInfo.FchProceso ?? remitoInfo.fecha ?? new Date().toISOString().split('T')[0]
  const cai = remitoInfo.CAI ?? remitoInfo.cai ?? ''
  const caiVto = remitoInfo.CAIFchVto ?? remitoInfo.caiVencimiento ?? ''
  const razonSocial = remitoInfo.RazonSocial ?? remitoInfo.razonSocial ?? remitoInfo.cliente ?? ''
  const domicilio = remitoInfo.Domicilio ?? remitoInfo.domicilio ?? ''
  const concepto = remitoInfo.Concepto ?? remitoInfo.concepto ?? 'Remito'
  const condicionVenta = remitoInfo.CondicionVenta ?? remitoInfo.condicionVenta ?? ''
  const condicionIVA = remitoInfo.CondicionIVA ?? remitoInfo.condicionIVA ?? ''
  const datosEmisor = remitoInfo.DatosEmisor ?? remitoInfo.datosEmisor ?? {
    cuit: String(cuit),
    razonSocial: '',
    domicilio: '',
    condicionIVA: '',
    iibb: '',
    inicioActividades: '',
  }

  const facturaLike: FacturaPDFData = {
    PtoVta: ptoVta,
    CbteTipo: 91,
    CbteDesde: cbteDesde,
    DocTipo: docTipo,
    DocNro: docNro,
    ImpTotal: remitoInfo.ImpTotal ?? 0,
    ImpNeto: remitoInfo.ImpNeto ?? 0,
    ImpIVA: remitoInfo.ImpIVA ?? 0,
    CAE: cai,
    CAEFchVto: caiVto,
    FchProceso: fecha,
    TipoFactura: 'A',
    CondicionIVA: condicionIVA,
    RazonSocial: razonSocial,
    Domicilio: domicilio,
    Concepto: concepto,
    CondicionVenta: condicionVenta,
    Articulos: normalizarArticulos(remitoInfo),
    IVAsAgrupados: remitoInfo.IVAsAgrupados ?? remitoInfo.ivasAgrupados ?? [],
    DatosEmisor: datosEmisor,
  }

  let html = generarHTMLFactura(facturaLike, '', cuit, logoPath, arcaLogoPath)

  html = html.replace(/<title>Factura [AB]<\/title>/, '<title>Remito R</title>')
  html = html.replace(/<div class="text-lg">Factura<\/div>/, '<div class="text-lg">Remito</div>')
  html = html.replace(/(<div class="bill-type">\s*)A(\s*<div[\s\S]*?Cod\. 91[\s\S]*?<\/div>\s*<\/div>)/, '$1R$2')
  html = html.replace(/<div class="footer-qr">\s*<img src="" alt="QR Code" \/>\s*<\/div>/, '<div class="footer-qr"></div>')
  html = html.replace(/CAE Nº:/g, 'CAI Nº:')
  html = html.replace(/Fecha de Vto\. de CAE:/g, 'Fecha de Vto\. de CAI:')

  // Si el QR viene por accidente, lo removemos igual.
  html = html.replace(/<div class="footer-qr">\s*<img src="[^"]*" alt="QR Code" \/>\s*<\/div>/, '<div class="footer-qr"></div>')

  return html
}
