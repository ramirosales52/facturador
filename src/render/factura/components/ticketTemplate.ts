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
  customPath?: string
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

  const formatearCUIT = (cuit: string): string => {
    // Formato: 20111111112 -> 20-11111111-2
    if (cuit.length === 11) {
      return `${cuit.substring(0, 2)}-${cuit.substring(2, 10)}-${cuit.substring(10, 11)}`
    }
    return cuit
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
  width: 80px;
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
<p style="font-size: 14px"><strong> ${data.DatosEmisor.razonSocial.toUpperCase()}</strong></p>
<p>${formatearCUIT(data.DatosEmisor.cuit)}</p>
<p>${data.DatosEmisor.condicionIVA}</p>
${data.DatosEmisor.iibb ? `<p>IIBB: ${data.DatosEmisor.iibb}</p>` : ''}
<p>I. Actividad: ${data.DatosEmisor.inicioActividades}</p>
<p>${data.DatosEmisor.domicilio}</p>
</td>
</tr>
<tr>
<td class="border-top padding-t-3 padding-b-3">
<div style="display: flex; justify-content: space-between;">
<span><strong>FACTURA</strong></span>
<span><strong>B</strong></span>
<span><strong>${String(data.PtoVta).padStart(4, '0')}-${String(data.CbteDesde).padStart(8, '0')}</strong></span>
</div>
<div style="display: flex; justify-content: space-between;">
<span>Cod. 06</span>
<span>${formatearFecha(data.FchProceso)}</span>
</div>
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
<div style="display: flex; justify-content: space-between;">
<span><strong>Cant./Precio Unit.</strong></span>
<span><strong>Importe</strong></span>
</div>
<p><strong>Descripción</strong></p>
<p style="border-bottom: 1px dashed #000; margin: 4px 0;"></p>
<div style="display: flex; justify-content: space-between;">
<span>${data.Articulo.cantidad} x ${formatearMoneda(data.Articulo.precioUnitario)}</span>
<span>${formatearMoneda(data.Articulo.subtotal)}</span>
</div>
<p>${data.Articulo.descripcion}</p>
</td>
</tr>
<tr>
<td class="border-top padding-t-3 padding-b-3">
<div style="display: flex; justify-content: space-between;">
<span>SUBTOTAL:</span>
<span>$${formatearMoneda(data.ImpTotal)}</span>
</div>
<div style="display: flex; justify-content: space-between;">
<span><strong>TOTAL:</strong></span>
<span><strong>$${formatearMoneda(data.ImpTotal)}</strong></span>
</div>
<p style="border-bottom: 1px dashed #000; margin: 4px 0;"></p>
<p style="font-size: 10px; margin: 4px 0;">Régimen de Transparencia Fiscal (Ley 27.743)</p>
<div style="display: flex; justify-content: space-between; font-size: 11px;">
<span>IVA Contenido</span>
<span>$${formatearMoneda(data.ImpIVA)}</span>
</div>
</td>
</tr>
<tr>
<td class="border-top padding-t-3">
<p>CAE: <strong>${data.CAE}</strong></p>
<p>VTO: <strong>${formatearFecha(data.CAEFchVto)}</strong></p>
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
