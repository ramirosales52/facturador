export interface TicketPDFData {
  CAE: string
  CAEFchVto: string
  CbteDesde: number
  PtoVta: number
  FchProceso: string
  ImpTotal: number
  ImpNeto: number
  ImpIVA: number
  CondicionIVA: string
  CondicionVenta: string
  Articulo: {
    descripcion: string
    cantidad: number
    porcentajeIVA: number
    precioUnitario: number
    subtotal: number
  }
  DatosEmisor: {
    cuit: string
    razonSocial: string
    domicilio: string
    condicionIVA: string
    iibb?: string
    inicioActividades: string
  }
}

export function generarHTMLTicket(
  data: TicketPDFData,
  qrBase64: string,
): string {
  const formatearFecha = (fecha: string): string => {
    if (!fecha) return ''
    // Formato: YYYYMMDD -> DD/MM/YYYY
    if (fecha.length === 8) {
      const dia = fecha.substring(6, 8)
      const mes = fecha.substring(4, 6)
      const anio = fecha.substring(0, 4)
      return `${dia}/${mes}/${anio}`
    }
    return fecha
  }

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor)
  }

  return `
<!DOCTYPE html>
<html>
<head>
<title>Ticket</title>
<style type="text/css">
*{
  box-sizing: border-box;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

body {
  margin: 0;
  padding: 0;
  width: 80mm;
}

.bill-container{
  border-collapse: collapse;
  width: 76mm;
  margin: 0 auto;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
}

.text-lg{
  font-size: 18px;
  font-weight: bold;
}

.text-center{
  text-align: center;
}

#qrcode {
  width: 110px;
}

p {
  margin: 2px 0;
}

table table {
  width: 100%;
}

table table tr td:last-child{
  text-align: right;
}

.border-top {
  border-top: 1px dashed #000;
}

.padding-b-3 {
  padding-bottom: 3px;
}

.padding-t-3 {
  padding-top: 3px;
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }
  
  @page {
    size: 80mm auto;
    margin: 0;
  }
}
</style>
</head>
<body>
<table class="bill-container">
<tr>
<td class="padding-b-3">
<p><strong>Razón social:</strong> ${data.DatosEmisor.razonSocial}</p>
<p><strong>Dirección:</strong> ${data.DatosEmisor.domicilio}</p>
<p><strong>C.U.I.T.:</strong> ${data.DatosEmisor.cuit}</p>
<p><strong>${data.DatosEmisor.condicionIVA.toUpperCase()}</strong></p>
${data.DatosEmisor.iibb ? `<p><strong>IIBB:</strong> ${data.DatosEmisor.iibb}</p>` : ''}
<p><strong>Inicio de actividad:</strong> ${data.DatosEmisor.inicioActividades}</p>
</td>
</tr>
<tr>
<td class="border-top padding-t-3 padding-b-3">
<p class="text-center text-lg">FACTURA B</p>
<p class="text-center">Código 06</p>
<p><strong>P.V:</strong> ${String(data.PtoVta).padStart(5, '0')}</p>
<p><strong>Nro:</strong> ${String(data.CbteDesde).padStart(8, '0')}</p>
<p><strong>Fecha:</strong> ${formatearFecha(data.FchProceso)}</p>
<p><strong>Concepto:</strong> Productos</p>
</td>
</tr>
<tr>
<td class="border-top padding-t-3 padding-b-3">
<p><strong>A ${data.CondicionIVA.toUpperCase()}</strong></p>
<p><strong>Condición de Venta:</strong> ${data.CondicionVenta}</p>
</td>
</tr>
<tr>
<td class="border-top padding-t-3 padding-b-3">
<div>
<table>
<tr>
<td><strong>Cant</strong></td>
<td><strong>Descripción</strong></td>
<td><strong>IVA</strong></td>
<td><strong>Precio</strong></td>
</tr>
<tr>
<td>${data.Articulo.cantidad}</td>
<td>${data.Articulo.descripcion}</td>
<td>${data.Articulo.porcentajeIVA}%</td>
<td>${formatearMoneda(data.Articulo.subtotal)}</td>
</tr>
</table>
</div>
</td>
</tr>
<tr>
<td class="border-top padding-t-3 padding-b-3">
<div>
<table>
<tr>
<td><strong>Subtotal (sin IVA):</strong></td>
<td>${formatearMoneda(data.ImpNeto)}</td>
</tr>
<tr>
<td><strong>IVA (${data.Articulo.porcentajeIVA}%):</strong></td>
<td>${formatearMoneda(data.ImpIVA)}</td>
</tr>
<tr>
<td><strong>TOTAL:</strong></td>
<td><strong>${formatearMoneda(data.ImpTotal)}</strong></td>
</tr>
</table>
</div>
</td>
</tr>
<tr>
<td class="border-top padding-t-3">
<p><strong>CAE:</strong> ${data.CAE}</p>
<p><strong>Vto:</strong> ${formatearFecha(data.CAEFchVto)}</p>
</td>
</tr>
<tr class="text-center">
<td>
<img id="qrcode" src="${qrBase64}" alt="QR Code">
</td>
</tr>
</table>
</body>
</html>
  `.trim()
}
