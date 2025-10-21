export interface ArticuloFactura {
  codigo?: string
  descripcion: string
  cantidad: number
  unidadMedida: string
  precioUnitario: number
  alicuotaIVA: string
  porcentajeIVA: number
  subtotal: number
}

export interface IVAAgrupado {
  alicuota: string
  porcentaje: number
  baseImponible: number
  importeIVA: number
}

export interface FacturaPDFData {
  PtoVta: number
  CbteTipo: number
  CbteDesde: number
  DocTipo: number
  DocNro: number
  ImpTotal: number
  ImpNeto?: number
  ImpIVA?: number
  CAE: string
  CAEFchVto: string
  FchProceso?: string
  TipoFactura?: 'A' | 'B'
  CondicionIVA?: string
  RazonSocial?: string
  Domicilio?: string
  Articulos?: ArticuloFactura[]
  IVAsAgrupados?: IVAAgrupado[]
  DatosEmisor?: {
    cuit: string
    razonSocial: string
    domicilio: string
    condicionIVA: string
    iibb: string
    inicioActividades: string
  }
}

/**
 * Formatea una fecha de YYYYMMDD a DD/MM/YYYY
 */
function formatearFecha(fecha: string): string {
  if (!fecha)
    return new Date().toLocaleDateString('es-AR')

  // Si viene en formato YYYYMMDD
  if (fecha.length === 8) {
    const year = fecha.substring(0, 4)
    const month = fecha.substring(4, 6)
    const day = fecha.substring(6, 8)
    return `${day}/${month}/${year}`
  }

  // Si viene en formato ISO (YYYY-MM-DD)
  if (fecha.includes('-')) {
    const [year, month, day] = fecha.split('T')[0].split('-')
    return `${day}/${month}/${year}`
  }

  return fecha
}

/**
 * Genera el HTML para el PDF de la factura
 * Este template se basa en el formato oficial de AFIP
 */
export function generarHTMLFactura(facturaInfo: FacturaPDFData, qrImageUrl: string, cuit: number, logoPath?: string, arcaLogoPath?: string): string {
  const fecha = formatearFecha(facturaInfo.FchProceso || new Date().toISOString().split('T')[0])
  const fechaVtoCAE = formatearFecha(facturaInfo.CAEFchVto)
  const ptoVta = String(facturaInfo.PtoVta).padStart(4, '0')
  const nroComp = String(facturaInfo.CbteDesde).padStart(8, '0')

  // Determinar tipo de factura basado en CbteTipo (1 = A, 6 = B)
  const tipoFactura = facturaInfo.TipoFactura || (facturaInfo.CbteTipo === 1 ? 'A' : 'B')
  const codigoComprobante = String(facturaInfo.CbteTipo).padStart(2, '0')
  const condicionIVA = facturaInfo.CondicionIVA || 'Consumidor Final'
  const razonSocial = facturaInfo.RazonSocial || 'Cliente'
  const domicilio = facturaInfo.Domicilio || 'Domicilio del cliente'

  // Datos del emisor
  const emisor = facturaInfo.DatosEmisor || {
    razonSocial: 'Tu Empresa',
    domicilio: 'Domicilio',
    condicionIVA: 'Responsable Inscripto',
    iibb: 'Exento',
    inicioActividades: '01/01/2020',
    cuit: String(cuit),
  }

  // Formatear fecha de inicio de actividades
  const inicioActividades = emisor.inicioActividades?.includes('-')
    ? formatearFecha(emisor.inicioActividades.replace(/-/g, ''))
    : emisor.inicioActividades

  // Generar filas de artículos
  const articulosHTML = (facturaInfo.Articulos || []).map((articulo, index) => {
    const subtotal = articulo.subtotal || (articulo.cantidad * articulo.precioUnitario)

    // Para Factura B, el subtotal incluye el IVA
    // Para Factura A, el subtotal es sin IVA
    const subtotalMostrar = tipoFactura === 'B' ? subtotal : subtotal

    return `
    <tr>
      <td>${articulo.codigo || String(index + 1).padStart(3, '0')}</td>
      <td>${articulo.descripcion}</td>
      <td>${articulo.cantidad.toFixed(2)}</td>
      <td>${articulo.unidadMedida || 'Unidad'}</td>
      <td>$${subtotalMostrar.toFixed(2)}</td>
    </tr>
    `
  }).join('')

  // Si no hay artículos, mostrar una fila por defecto
  const articulosDefault = !facturaInfo.Articulos || facturaInfo.Articulos.length === 0
    ? `
    <tr>
      <td>001</td>
      <td>Producto/Servicio</td>
      <td>1.00</td>
      <td>Unidad</td>
      <td>$${(facturaInfo.ImpNeto || 0).toFixed(2)}</td>
    </tr>
  `
    : articulosHTML

  // Generar filas de IVA agrupado
  const ivasHTML = (facturaInfo.IVAsAgrupados || []).map((iva) => {
    const label = tipoFactura === 'B' ? `IVA contenido (${iva.porcentaje}%)` : `IVA ${iva.porcentaje}%`
    return `
    <div class="text-right margin-b-10">
      <strong>${label}: $${iva.importeIVA.toFixed(2)}</strong>
    </div>
  `
  }).join('')

  // Si no hay IVAs agrupados, mostrar el IVA simple
  const ivasDefault = !facturaInfo.IVAsAgrupados || facturaInfo.IVAsAgrupados.length === 0
    ? `
    <div class="text-right margin-b-10">
      <strong>${tipoFactura === 'B' ? 'IVA contenido (21%)' : 'IVA 21%'}: $${(facturaInfo.ImpIVA || 0).toFixed(2)}</strong>
    </div>
  `
    : ivasHTML

  // Generar la sección de totales según el tipo de factura
  const totalesHTML = tipoFactura === 'A'
    ? `
    <div class="text-right margin-b-10">
      <strong>Subtotal: $${(facturaInfo.ImpNeto || 0).toFixed(2)}</strong>
    </div>
    ${ivasDefault}
    <div class="text-right">
      <strong>TOTAL: $${facturaInfo.ImpTotal.toFixed(2)}</strong>
    </div>
  `
    : `
    <div class="text-right">
      <strong>TOTAL: $${facturaInfo.ImpTotal.toFixed(2)}</strong>
    </div>
  `

  // Sección de Régimen de Transparencia Fiscal (solo para Factura B)
  const regimenTransparenciaHTML = tipoFactura === 'B'
    ? `
    <div class="regimen-transparencia">
      <div style="margin-bottom: 3px;">
        <strong><u>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</u></strong>
      </div>
      ${ivasDefault}
    </div>
  `
    : ''

  return `<!doctype html>
    <html>
      <head>
        <title>Factura ${tipoFactura}</title>
        <style type="text/css">
          * {
            box-sizing: border-box;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            font-family: Arial, Helvetica, sans-serif;
          }
          body,
          html {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }
          .bill-container {
            width: 750px;
            position: relative;
            left: 0;
            right: 0;
            margin: 0 auto;
            border-collapse: collapse;
            font-size: 12px;
          }

          .regimen-transparencia {
            width: 375px;
            padding: 8px;
            font-size: 10px;
            border: 1px solid #999;
            background: #f9f9f9;
            margin-bottom: 10px;
          }

          .bill-footer-section {
            width: 750px;
            margin: auto auto 0 auto;
          }

          .bill-footer {
            width: 750px;
            margin: 0 auto;
            border-top: 2px solid black;
            font-size: 12px;
            padding: 10px;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }

          .footer-left {
            display: flex;
            flex-direction: row;
            gap: 8px;
            align-items: flex-start;
          }

          .footer-qr {
            flex-shrink: 0;
          }

          .footer-qr img {
            width: 150px;
            height: 150px;
            display: block;
          }

          .footer-cae {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }

          .footer-totals {
            text-align: right;
            flex-shrink: 0;
          }

          .bill-emitter-row td {
            width: 50%;
            border-bottom: 1px solid;
            padding-top: 10px;
            padding-left: 10px;
            vertical-align: top;
          }
          .bill-emitter-row {
            position: relative;
          }
          .bill-emitter-row td:nth-child(2) {
            padding-left: 60px;
          }
          .bill-emitter-row td:nth-child(1) {
            padding-right: 60px;
          }

          .bill-type {
            border: 1px solid;
            border-top: 1px solid;
            border-bottom: 1px solid;
            margin-right: -30px;
            background: white;
            width: 60px;
            height: 50px;
            position: absolute;
            left: 0;
            right: 0;
            top: -1px;
            margin: auto;
            text-align: center;
            font-size: 40px;
            font-weight: 600;
          }
          .text-lg {
            font-size: 30px;
          }
          .text-center {
            text-align: center;
          }

          .col-2 {
            width: 16.66666667%;
            float: left;
          }
          .col-3 {
            width: 25%;
            float: left;
          }
          .col-4 {
            width: 33.3333333%;
            float: left;
          }
          .col-5 {
            width: 41.66666667%;
            float: left;
          }
          .col-6 {
            width: 50%;
            float: left;
          }
          .col-8 {
            width: 66.66666667%;
            float: left;
          }
          .col-10 {
            width: 83.33333333%;
            float: left;
          }
          .row {
            overflow: hidden;
          }

          .margin-b-0 {
            margin-bottom: 0px;
          }

          .bill-row td {
            padding-top: 5px;
          }

          .bill-row td > div {
            border-top: 1px solid;
            border-bottom: 1px solid;
            margin: 0 -1px 0 -2px;
            padding: 0 10px 13px 10px;
          }
          .row-details table {
            border-collapse: collapse;
            width: 100%;
          }
          .row-details td > div,
          .row-qrcode td > div {
            border: 0;
            margin: 0 -1px 0 -2px;
            padding: 0 !important;
          }
          .row-details table td {
            padding: 5px;
            text-align: center;
          }
          .row-details table td:first-child {
            padding-left: 10px;
            text-align: left;
          }
          .row-details table td:last-child {
            padding-right: 10px;
            text-align: right;
          }
          .row-details table tr:nth-child(1) {
            border-top: 1px solid;
            border-bottom: 1px solid;
            background: #c0c0c0;
            font-weight: bold;
            text-align: center;
          }
          .row-details table tr:nth-child(1) td {
            padding: 5px;
          }
          .row-details table tr:nth-child(1) td:first-child {
            padding-left: 10px;
          }
          .row-details table tr:nth-child(1) td:last-child {
            padding-right: 10px;
          }
          .row-details table tr + tr {
            border-top: 1px solid #c0c0c0;
          }
          .text-right {
            text-align: right;
          }

          .margin-b-10 {
            margin-bottom: 10px;
          }

          .total-row td > div {
            border-width: 2px;
          }

          .row-qrcode td {
            padding: 10px;
          }

          #qrcode {
            width: 50%;
          }
        </style>
      </head>
      <body>
        <table class="bill-container">
          <tr class="bill-emitter-row">
            <td>
              <div class="bill-type">
                ${tipoFactura}
                <div
                  style="
                    text-align: center;
                    font-size: 11px;
                    font-weight: 600;
                    margin-b-0: 4px;
                  "
                >
                  Cod. ${codigoComprobante}
                </div>
              </div>
              <div class="text-center" style="padding: 10px 0">
                ${logoPath
                  ? `<img
                  src="${logoPath}"
                  alt="Logo"
                  style="max-width: 280px; max-height: 110px"
                />`
                  : `
                <div class="text-lg">${emisor.razonSocial}</div>
                `}
              </div>
              <p><strong>Razón social:</strong> ${emisor.razonSocial}</p>
              <p><strong>Domicilio:</strong> ${emisor.domicilio}</p>
              <p>
                <strong>Condición Frente al IVA:</strong> ${emisor.condicionIVA}
              </p>
            </td>
            <td>
              <div>
                <div class="text-lg">Factura</div>
                <p><strong>Nro: ${ptoVta}-${nroComp}</strong></p>
                <p><strong>Fecha de Emisión:</strong> ${fecha}</p>
                <p><strong>CUIT:</strong> ${emisor.cuit}</p>
                <p><strong>Ingresos Brutos:</strong> ${emisor.iibb}</p>
                <p>
                  <strong>Fecha de Inicio de Actividades:</strong>
                  ${inicioActividades}
                </p>
              </div>
            </td>
          </tr>
          <tr class="bill-row">
            <td colspan="2">
              <div class="row">
                <p class="col-4 margin-b-0">
                  <strong>Período Facturado Desde: </strong>${fecha}
                </p>
                <p class="col-3 margin-b-0"><strong>Hasta: </strong>${fecha}</p>
                <p class="col-5 margin-b-0">
                  <strong>Fecha de Vto. para el pago: </strong>${fecha}
                </p>
              </div>
            </td>
          </tr>
          <tr class="bill-row">
            <td colspan="2">
              <div>
                <div class="row">
                  <p class="col-4 margin-b-0">
                    <strong>CUIL/CUIT: </strong>${facturaInfo.DocNro}
                  </p>
                  <p class="col-8 margin-b-0">
                    <strong>Apellido y Nombre / Razón social: </strong
                    >${razonSocial}
                  </p>
                </div>
                <div class="row">
                  <p class="col-6 margin-b-0">
                    <strong>Condición Frente al IVA: </strong>${condicionIVA}
                  </p>
                  <p class="col-6 margin-b-0">
                    <strong>Domicilio: </strong>${domicilio}
                  </p>
                </div>
                <p><strong>Condicion de venta: </strong>Efectivo</p>
              </div>
            </td>
          </tr>
          <tr class="bill-row row-details">
            <td colspan="2">
              <div style="padding: 0">
                <table>
                  <tr>
                    <td>Código</td>
                    <td>Descripción</td>
                    <td>Cantidad</td>
                    <td>Unidad</td>
                    <td>Subtotal</td>
                  </tr>
                  ${articulosDefault}
                </table>
              </div>
            </td>
          </tr>
        </table>

        <div class="bill-footer-section">
          ${regimenTransparenciaHTML}

          <div class="bill-footer">
            <div class="footer-left">
              <div class="footer-qr">
                <img id="qrcode" src="${qrImageUrl}" alt="QR Code" />
              </div>
              <div class="footer-cae">
                <div>
                  <strong>CAE Nº:</strong> ${facturaInfo.CAE}
                </div>
                <div style="margin-bottom: 15px">
                  <strong>Fecha de Vto. de CAE:</strong> ${fechaVtoCAE}
                </div>
                ${arcaLogoPath
                  ? `
                <div style="margin-top: 10px">
                  <img
                    src="${arcaLogoPath}"
                    alt="AFIP Logo"
                    style="max-width: 140px; display: block; margin-bottom: 3px"
                  />
                  <strong style="font-size: 10px">Comprobante Autorizado</strong>
                </div>
                `
                  : '<div style="margin-top: 10px"><strong style="font-size: 10px">Comprobante Autorizado</strong></div>'}
              </div>
            </div>
            <div class="footer-totals">
              ${totalesHTML}
            </div>
          </div>
        </div>
      </body>
    </html>`
}
