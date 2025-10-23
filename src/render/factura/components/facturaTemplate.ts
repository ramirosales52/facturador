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
  Concepto?: string
  CondicionVenta?: string
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
  const condicionIVA = facturaInfo.CondicionIVA || ''
  const razonSocial = facturaInfo.RazonSocial || ''
  const domicilio = facturaInfo.Domicilio || ''
  const concepto = facturaInfo.Concepto || ''
  const condicionVenta = facturaInfo.CondicionVenta || ''

  // Datos del emisor
  const emisor = facturaInfo.DatosEmisor || {
    razonSocial: '',
    domicilio: '',
    condicionIVA: '',
    iibb: '',
    inicioActividades: '',
    cuit: String(cuit),
  }

  // Formatear fecha de inicio de actividades
  const inicioActividades = emisor.inicioActividades?.includes('-')
    ? formatearFecha(emisor.inicioActividades.replace(/-/g, ''))
    : emisor.inicioActividades

  // Generar filas de artículos
  const articulosHTML = (facturaInfo.Articulos || []).map((articulo, index) => {
    const subtotal = articulo.subtotal || (articulo.cantidad * articulo.precioUnitario)
    const precioUnitario = articulo.precioUnitario

    if (tipoFactura === 'A') {
      // Factura A: mostrar Precio Unit., IVA%, Subtotal (con IVA)
      return `
      <tr>
        <td>${articulo.codigo || String(index + 1).padStart(3, '0')}</td>
        <td>${articulo.descripcion}</td>
        <td>${articulo.cantidad.toFixed(2)}</td>
        <td>${articulo.unidadMedida || 'Unidad'}</td>
        <td>$${precioUnitario.toFixed(2)}</td>
        <td>${articulo.porcentajeIVA}%</td>
        <td>$${subtotal.toFixed(2)}</td>
      </tr>
      `
    } else {
      // Factura B: mostrar Precio Unit., Subtotal (con IVA)
      return `
      <tr>
        <td>${articulo.codigo || String(index + 1).padStart(3, '0')}</td>
        <td>${articulo.descripcion}</td>
        <td>${articulo.cantidad.toFixed(2)}</td>
        <td>${articulo.unidadMedida || 'Unidad'}</td>
        <td>$${precioUnitario.toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
      </tr>
      `
    }
  }).join('')

  // Si no hay artículos, mostrar una fila por defecto
  const articulosDefault = !facturaInfo.Articulos || facturaInfo.Articulos.length === 0
    ? (tipoFactura === 'A'
      ? `
    <tr>
      <td>001</td>
      <td>Producto/Servicio</td>
      <td>1.00</td>
      <td>Unidad</td>
      <td>$${(facturaInfo.ImpNeto || 0).toFixed(2)}</td>
      <td>21%</td>
      <td>$${(facturaInfo.ImpTotal || 0).toFixed(2)}</td>
    </tr>
  `
      : `
    <tr>
      <td>001</td>
      <td>Producto/Servicio</td>
      <td>1.00</td>
      <td>Unidad</td>
      <td>$${(facturaInfo.ImpTotal || 0).toFixed(2)}</td>
      <td>$${(facturaInfo.ImpTotal || 0).toFixed(2)}</td>
    </tr>
  `)
    : articulosHTML

  // Generar filas de IVA agrupado con alineación derecha y espaciado
  const ivasHTML = (facturaInfo.IVAsAgrupados || []).map((iva) => {
    const label = tipoFactura === 'B' ? `IVA contenido (${iva.porcentaje}%)` : `IVA ${iva.porcentaje}%`
    return `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <strong>${label}:</strong>
      <strong style="margin-left: 20px;">$${iva.importeIVA.toFixed(2)}</strong>
    </div>
  `
  }).join('')

  // Si no hay IVAs agrupados, mostrar el IVA simple
  const ivasDefault = !facturaInfo.IVAsAgrupados || facturaInfo.IVAsAgrupados.length === 0
    ? `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <strong>${tipoFactura === 'B' ? 'IVA contenido (21%)' : 'IVA'}:</strong>
      <strong style="margin-left: 20px;">$${(facturaInfo.ImpIVA || 0).toFixed(2)}</strong>
    </div>
  `
    : ivasHTML

  // Generar la sección de totales según el tipo de factura
  const totalesHTML = tipoFactura === 'A'
    ? `
  <div style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; margin-top: 10px;">
    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px; text-align: right;"><strong>Importe Neto Gravado: $</strong></div>
      <div style="width: 120px; text-align: right;"><strong>${(facturaInfo.ImpNeto || 0).toFixed(2)}</strong></div>
    </div>

    ${ivasDefault}

    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px; text-align: right;"><strong>Importe otros Tributos: $</strong></div>
      <div style="width: 120px; text-align: right;"><strong>0.00</strong></div>
    </div>

    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px; text-align: right;"><strong>Importe Total: $</strong></div>
      <div style="width: 120px; text-align: right;"><strong>${facturaInfo.ImpTotal.toFixed(2)}</strong></div>
    </div>
  </div>
  `
    : `
  <div style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; margin-top: 10px;">
    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px; text-align: right;"><strong>Subtotal: $</strong></div>
      <div style="width: 120px; text-align: right;"><strong>${facturaInfo.ImpTotal.toFixed(2)}</strong></div>
    </div>

    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px; text-align: right;"><strong>Importe otros Tributos: $</strong></div>
      <div style="width: 120px; text-align: right;"><strong>0.00</strong></div>
    </div>

    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 250px; text-align: right;"><strong>Importe Total: $</strong></div>
      <div style="width: 120px; text-align: right;"><strong>${facturaInfo.ImpTotal.toFixed(2)}</strong></div>
    </div>
  </div>
  `

  // Sección de Régimen de Transparencia Fiscal (solo para Factura B)
  // Se integrará con los totales en un solo recuadro
  const regimenTransparenciaHTML = tipoFactura === 'B'
    ? `
    <hr style="border: none; border-top: 2px solid black; margin: 10px 0;" />
      <div style="width: 100%; display: flex; justify-content: flex-start;">
        <div style="width: 50%; font-size: 12px;">
          <strong style="font-style: italic;"><u>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</u></strong>
          <div style="margin-top: 5px; text-align: left;">
            <strong>IVA Contenido: $ ${(facturaInfo.ImpIVA || 0).toFixed(2)}</strong>
          </div>
        </div>
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
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            padding: 12px;
            position: relative;
          }

          .footer-left {
            display: flex;
            flex-direction: row;
            gap: 8px;
            align-items: flex-start;
          }

          .footer-right {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-end;
            text-align: right;
          }

          .footer-qr img {
            width: 120px;
            height: 120px;
            display: block;
            object-fit: contain;
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
                    margin-top: 8px;
                  "
                >
                  Cod. ${codigoComprobante}
                </div>
              </div>
              <div class="text-center" style="padding-bottom: 10px">
                ${logoPath
      ? `<img
                  src="${logoPath}"
                  alt="Logo"
                  style="max-width: auto; max-height: 140px"
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
                <p class="margin-b-0"><strong>Condicion de venta: </strong>${condicionVenta}</p>
                <p><strong>Concepto: </strong>${concepto}</p>
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
                    <td>Precio Unit.</td>
                    ${tipoFactura === 'A' ? '<td>IVA %</td>' : ''}
                    <td>Subtotal</td>
                  </tr>
                  ${articulosDefault}
                </table>
              </div>
            </td>
          </tr>
        </table>

        <div class="bill-footer-section">
          <!-- Totales y Régimen en un solo recuadro -->
          <div style="width: 750px; margin: 0 auto; padding: 10px; border: 2px solid black; border-bottom: none; display: flex; flex-direction: column;">

          <!-- Totales alineados a la derecha -->
          <div style="display: flex; justify-content: flex-end; width: 100%;">
            <div style="width: 350px;">
              ${totalesHTML}
            </div>
          </div>
            
            <!-- Régimen de transparencia (debajo de totales con línea separadora) -->
            ${regimenTransparenciaHTML}
          </div>

          <!-- Footer con QR/ARCA a la izquierda y CAE a la derecha -->
          <div class="bill-footer">
            <div class="footer-left">
              <div class="footer-qr">
                <img src="${qrImageUrl}" alt="QR Code" />
              </div>
              <div style="display: flex; flex-direction: column; justify-content: flex-end; gap: 5px; height: 120px">
                <div style="text-align: left;">
                  <img
                    src="${arcaLogoPath}"
                    alt="AFIP Logo"
                    style="max-width: 250px; display: block; margin-bottom: 5px"
                  />
                  <strong style="font-size: 13px; font-style: italic;">Comprobante Autorizado</strong>
                </div>
              </div>
            </div>
            
            <div class="footer-right">
              <div>
                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                  <strong style="font-size: 14px;">CAE Nº:</strong> ${facturaInfo.CAE}
                </div>
                <div>
                  <strong style="font-size: 14px;">Fecha de Vto. de CAE:</strong> ${fechaVtoCAE}
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>`
}
