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
  const articulosDefault = !facturaInfo.Articulos || facturaInfo.Articulos.length === 0 ? `
    <tr>
      <td>001</td>
      <td>Producto/Servicio</td>
      <td>1.00</td>
      <td>Unidad</td>
      <td>$${(facturaInfo.ImpNeto || 0).toFixed(2)}</td>
    </tr>
  ` : articulosHTML

  // Generar filas de IVA agrupado
  const ivasHTML = (facturaInfo.IVAsAgrupados || []).map(iva => {
    const label = tipoFactura === 'B' ? `IVA contenido (${iva.porcentaje}%)` : `IVA ${iva.porcentaje}%`
    return `
    <div class="text-right margin-b-10">
      <strong>${label}: $${iva.importeIVA.toFixed(2)}</strong>
    </div>
  `
  }).join('')

  // Si no hay IVAs agrupados, mostrar el IVA simple
  const ivasDefault = !facturaInfo.IVAsAgrupados || facturaInfo.IVAsAgrupados.length === 0 ? `
    <div class="text-right margin-b-10">
      <strong>${tipoFactura === 'B' ? 'IVA contenido (21%)' : 'IVA 21%'}: $${(facturaInfo.ImpIVA || 0).toFixed(2)}</strong>
    </div>
  ` : ivasHTML

  // Generar la sección de totales según el tipo de factura
  const totalesHTML = tipoFactura === 'A' ? `
    <div class="text-right margin-b-10">
      <strong>Subtotal: $${(facturaInfo.ImpNeto || 0).toFixed(2)}</strong>
    </div>
    ${ivasDefault}
    <div class="text-right">
      <strong>TOTAL: $${facturaInfo.ImpTotal.toFixed(2)}</strong>
    </div>
  ` : `
    <div class="text-right">
      <strong>TOTAL: $${facturaInfo.ImpTotal.toFixed(2)}</strong>
    </div>
  `

  // Sección de Régimen de Transparencia Fiscal (solo para Factura B)
  const regimenTransparenciaHTML = tipoFactura === 'B' ? `
    <div class="regimen-transparencia">
      <div style="margin-bottom: 3px;">
        <strong><u>Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)</u></strong>
      </div>
      ${ivasDefault}
    </div>
  ` : ''

  return `<!doctype html>
    <html lang="es">

    <head>
      <meta charset="utf-8" />
      <title>Factura ${tipoFactura}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }

        * {
          box-sizing: border-box;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          background: #fff;
          display: flex;
          justify-content: center;
        }

        .a4-page {
          width: 210mm;
          height: 297mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid #ccc;
          padding: 15mm;
          position: relative;
        }

        /* --- HEADER --- */
        header {
          display: flex;
          justify-content: space-between;
          position: relative;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }

        .bill-type {
          position: absolute;
          left: 50%;
          top: -10px;
          transform: translateX(-50%);
          background: white;
          border: 2px solid #000;
          width: 60px;
          height: 60px;
          border-radius: 8px;
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .bill-type small {
          font-size: 10px;
          margin-top: 3px;
        }

        .emisor-info,
        .factura-info {
          width: 48%;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .emisor-info img {
          max-width: 240px;
          max-height: 90px;
          object-fit: contain;
          margin-bottom: 5px;
        }

        .text-lg {
          font-size: 20px;
          font-weight: bold;
        }

        /* --- MAIN --- */
        main {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 10px;
          overflow: hidden;
        }

        /* CLIENTE */
        .client-section {
          border-bottom: 1px solid #aaa;
          padding-bottom: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .client-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
        }

        .client-row p {
          margin: 0;
          flex: 1;
          min-width: 200px;
        }

        /* DETALLES */
        .details-section {
          border: 1px solid #999;
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .details-header,
        .details-row {
          display: grid;
          grid-template-columns: 1fr 3fr 1fr 1fr 1fr;
          padding: 6px 10px;
          border-bottom: 1px solid #ccc;
          text-align: center;
        }

        .details-header {
          background: #e0e0e0;
          font-weight: bold;
        }

        .details-row:nth-child(even) {
          background: #fafafa;
        }

        /* --- FOOTER FIJO --- */
        footer {
          margin-top: auto;
          border-top: 2px solid #000;
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .footer-upper {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .footer-left {
          display: flex;
          gap: 10px;
          width: 50%;
        }

        .footer-left img {
          width: 120px;
          height: auto;
        }

        .footer-left small {
          font-size: 10px;
          display: block;
          margin-top: 4px;
        }

        .footer-right {
          text-align: right;
          flex: 1;
        }

        .footer-right div {
          margin-bottom: 5px;
        }

        .regimen-transparencia {
          font-size: 10px;
          border: 1px solid #999;
          background: #f9f9f9;
          padding: 6px;
        }

        /* --- IMPRESIÓN --- */
        @media print {
          body {
            margin: 0;
            background: none;
          }

          .a4-page {
            border: none;
            box-shadow: none;
            height: auto;
            min-height: 297mm;
          }
        }
      </style>
    </head>

    <body>
      <div class="a4-page">

        <!-- HEADER -->
        <header>
          <div class="emisor-info">
            ${logoPath
      ? `<img src="${logoPath}" alt="Logo">`
      : `<div class="text-lg">${emisor.razonSocial}</div>`}

            <p><strong>Razón social:</strong> ${emisor.razonSocial}</p>
            <p><strong>Domicilio:</strong> ${emisor.domicilio}</p>
            <p><strong>Condición frente al IVA:</strong> ${emisor.condicionIVA}</p>
          </div>

          <div class="bill-type">
            ${tipoFactura}
            <small>Cod. ${codigoComprobante}</small>
          </div>

          <div class="factura-info">
            <div class="text-lg">Factura</div>
            <p><strong>Nro:</strong> ${ptoVta}-${nroComp}</p>
            <p><strong>Fecha de emisión:</strong> ${fecha}</p>
            <p><strong>CUIT:</strong> ${emisor.cuit}</p>
            <p><strong>Ingresos Brutos:</strong> ${emisor.iibb}</p>
            <p><strong>Inicio de actividades:</strong> ${inicioActividades}</p>
          </div>
        </header>

        <!-- MAIN -->
        <main>
          <section class="client-section">
            <div class="client-row">
              <p><strong>Período Desde:</strong> ${fecha}</p>
              <p><strong>Hasta:</strong> ${fecha}</p>
              <p><strong>Vto. de pago:</strong> ${fecha}</p>
            </div>

            <div class="client-row">
              <p><strong>CUIL/CUIT:</strong> ${facturaInfo.DocNro}</p>
              <p><strong>Razón social:</strong> ${razonSocial}</p>
            </div>

            <div class="client-row">
              <p><strong>Condición frente al IVA:</strong> ${condicionIVA}</p>
              <p><strong>Domicilio:</strong> ${domicilio}</p>
            </div>

            <p><strong>Condición de venta:</strong> Efectivo</p>
          </section>

          <section class="details-section">
            <div class="details-header">
              <p>Código</p>
              <p>Descripción</p>
              <p>Cantidad</p>
              <p>Unidad</p>
              <p>Subtotal</p>
            </div>
            ${articulosDefault}
          </section>
        </main>

        <!-- FOOTER -->
        <footer>

          ${regimenTransparenciaHTML
      ? `<div class="regimen-transparencia">${regimenTransparenciaHTML}</div>`
      : ''}

          <div class="footer-upper">
            <div class="footer-left">
              <div>
                <img src="${qrImageUrl}" alt="QR Code" />
              </div>
              <div>
                <div><strong>CAE Nº:</strong> ${facturaInfo.CAE}</div>
                <div><strong>Vto. CAE:</strong> ${fechaVtoCAE}</div>
                ${arcaLogoPath
      ? `<img src="${arcaLogoPath}" alt="AFIP Logo" />
                <small>Comprobante Autorizado</small>`
      : `<small>Comprobante Autorizado</small>`}
              </div>
            </div>

            <div class="footer-right">
              ${totalesHTML}
            </div>
          </div>

        </footer>
      </div>
    </body>

    </html>`
}
