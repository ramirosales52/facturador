import { existsSync } from 'node:fs'
import Afip from '@afipsdk/afip.js'
import { Injectable } from '@nestjs/common'
import { ArcaConfig, TiposComprobante } from './arca.config'
import { CreateArcaDto } from './dto/create-arca.dto'
import { UpdateArcaDto } from './dto/update-arca.dto'

@Injectable()
export class ArcaService {
  private afip: Afip

  constructor() {
    // Configuración para ambiente de pruebas (homologación)
    const config: any = {
      CUIT: ArcaConfig.CUIT,
      production: ArcaConfig.production,
    }

    // Solo incluir certificados si existen
    if (ArcaConfig.cert && existsSync(ArcaConfig.cert)) {
      config.cert = ArcaConfig.cert
    }
    if (ArcaConfig.key && existsSync(ArcaConfig.key)) {
      config.key = ArcaConfig.key
    }

    this.afip = new Afip(config)
  }

  /**
   * Crear una nueva factura electrónica
   */
  async create(createArcaDto: CreateArcaDto) {
    try {
      // Obtener el último número de comprobante
      const ptoVta = createArcaDto.PtoVta || 1
      const cbteTipo = createArcaDto.CbteTipo || 11
      const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo)

      // Determinar condición IVA del receptor según el tipo de documento y comprobante
      const docTipo = createArcaDto.DocTipo || 99
      let condicionIVAReceptorId = createArcaDto.CondicionIVAReceptorId

      if (!condicionIVAReceptorId) {
        // Lógica automática según tipo de comprobante y documento
        if (cbteTipo === 1 || cbteTipo === 2 || cbteTipo === 3) {
          // Factura A, Nota Débito A, Nota Crédito A
          condicionIVAReceptorId = 1 // Responsable Inscripto
        }
        else if (cbteTipo === 6 || cbteTipo === 7 || cbteTipo === 8) {
          // Factura B, Nota Débito B, Nota Crédito B
          // Para Factura B con CUIT, usar Consumidor Final (5)
          // AFIP requiere que Factura B siempre use Consumidor Final
          condicionIVAReceptorId = 5
        }
        else if (cbteTipo === 11 || cbteTipo === 12 || cbteTipo === 13) {
          // Factura C, Nota Débito C, Nota Crédito C
          condicionIVAReceptorId = 5 // Consumidor Final
        }
        else {
          // Por defecto
          condicionIVAReceptorId = 5
        }
      }

      // Datos de la factura con valores por defecto
      const data = {
        CantReg: 1, // Cantidad de comprobantes a registrar
        PtoVta: ptoVta, // Punto de venta
        CbteTipo: cbteTipo, // Tipo de comprobante (11 = Factura C)
        Concepto: createArcaDto.Concepto || 1, // Concepto (1 = Productos)
        DocTipo: docTipo, // Tipo de documento del comprador (99 = Consumidor Final)
        DocNro: createArcaDto.DocNro || 0, // Número de documento
        CondicionIVAReceptorId: condicionIVAReceptorId, // Condición IVA del receptor
        CbteDesde: lastVoucher + 1, // Número de comprobante desde
        CbteHasta: lastVoucher + 1, // Número de comprobante hasta
        CbteFch: Number.parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, '')), // Fecha formato YYYYMMDD
        ImpTotal: createArcaDto.ImpTotal, // Importe total
        ImpTotConc: createArcaDto.ImpTotConc || 0, // Importe neto no gravado
        ImpNeto: createArcaDto.ImpNeto, // Importe neto gravado
        ImpOpEx: createArcaDto.ImpOpEx || 0, // Importe exento
        ImpIVA: createArcaDto.ImpIVA, // Importe de IVA
        ImpTrib: createArcaDto.ImpTrib || 0, // Importe de tributos
        MonId: createArcaDto.MonId || 'PES', // Moneda (PES = Pesos)
        MonCotiz: createArcaDto.MonCotiz || 1, // Cotización de la moneda
        Iva: createArcaDto.Iva || [
          {
            Id: 5, // ID del tipo de IVA (5 = 21%)
            BaseImp: createArcaDto.ImpNeto, // Base imponible
            Importe: createArcaDto.ImpIVA, // Importe de IVA
          },
        ],
      }

      const result = await this.afip.ElectronicBilling.createVoucher(data)

      // Devolver información completa del comprobante
      return {
        success: true,
        data: {
          CAE: result.CAE,
          CAEFchVto: result.CAEFchVto,
          CbteDesde: data.CbteDesde,
          CbteHasta: data.CbteHasta,
          PtoVta: data.PtoVta,
          CbteTipo: data.CbteTipo,
          DocTipo: data.DocTipo,
          DocNro: data.DocNro,
          ImpTotal: data.ImpTotal,
          FchProceso: result.FchProceso || new Date().toISOString().split('T')[0],
          fullResponse: result, // Respuesta completa por si se necesita
        },
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener información del servidor de AFIP/ARCA
   */
  async findAll() {
    try {
      const serverStatus = await this.afip.ElectronicBilling.getServerStatus()
      return {
        success: true,
        serverStatus,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener un comprobante específico
   */
  async findOne(id: number) {
    try {
      // Obtener información de un comprobante
      const voucher = await this.afip.ElectronicBilling.getVoucherInfo(id, 1, 11)
      return {
        success: true,
        voucher,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener el último número de comprobante
   */
  async getLastVoucher(ptoVta: number = 1, cbteTipo: number = 11) {
    try {
      const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo)
      return {
        success: true,
        lastVoucher,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener tipos de comprobantes disponibles
   */
  async getVoucherTypes() {
    try {
      const types = await this.afip.ElectronicBilling.getVoucherTypes()
      return {
        success: true,
        types,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener puntos de venta disponibles
   */
  async getSalesPoints() {
    try {
      const salesPoints = await this.afip.ElectronicBilling.getSalesPoints()
      return {
        success: true,
        salesPoints,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  update(id: number, _updateArcaDto: UpdateArcaDto) {
    return `This action updates a #${id} arca`
  }

  remove(id: number) {
    return `This action removes a #${id} arca`
  }

  /**
   * Generar código QR según especificaciones de AFIP
   */
  async generateQR(facturaData: {
    ver: number
    fecha: string // YYYY-MM-DD
    cuit: number
    ptoVta: number
    tipoCmp: number
    nroCmp: number
    importe: number
    moneda: string
    ctz: number
    tipoDocRec: number
    nroDocRec: number
    tipoCodAut: string // 'E' para CAE
    codAut: string // CAE
  }) {
    try {
      // Generar URL según especificaciones de AFIP
      // https://www.afip.gob.ar/fe/qr/?p=parametros
      const qrData = {
        ver: facturaData.ver || 1,
        fecha: facturaData.fecha,
        cuit: facturaData.cuit,
        ptoVta: facturaData.ptoVta,
        tipoCmp: facturaData.tipoCmp,
        nroCmp: facturaData.nroCmp,
        importe: facturaData.importe,
        moneda: facturaData.moneda || 'PES',
        ctz: facturaData.ctz || 1,
        tipoDocRec: facturaData.tipoDocRec,
        nroDocRec: facturaData.nroDocRec,
        tipoCodAut: facturaData.tipoCodAut || 'E',
        codAut: facturaData.codAut,
      }

      // Log para verificar que el CAE está incluido
      console.log('📋 Datos del QR:', JSON.stringify(qrData, null, 2))

      // Crear string de datos base64
      const jsonStr = JSON.stringify(qrData)
      const base64Data = Buffer.from(jsonStr).toString('base64')

      // URL del QR de AFIP
      const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`

      console.log('🔗 URL del QR generada:', qrUrl)

      return {
        success: true,
        qrUrl,
        qrData,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Generar PDF de la factura
   */
  async generatePDF(facturaInfo: {
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
  }) {
    try {
      // Generar QR para incluir en el PDF
      const fecha = facturaInfo.FchProceso || new Date().toISOString().split('T')[0]

      const qrResult = await this.generateQR({
        ver: 1,
        fecha,
        cuit: ArcaConfig.CUIT,
        ptoVta: facturaInfo.PtoVta,
        tipoCmp: facturaInfo.CbteTipo,
        nroCmp: facturaInfo.CbteDesde,
        importe: facturaInfo.ImpTotal,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: facturaInfo.DocTipo,
        nroDocRec: facturaInfo.DocNro,
        tipoCodAut: 'E',
        codAut: facturaInfo.CAE,
      })

      // Generar URL del QR code como imagen
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResult.qrUrl || '')}`

      // Función auxiliar para formatear fechas
      const formatearFecha = (fecha: string): string => {
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

      const fechaFormateada = formatearFecha(fecha)
      const fechaVtoCAE = formatearFecha(facturaInfo.CAEFchVto)
      const ptoVta = String(facturaInfo.PtoVta).padStart(4, '0')
      const nroComp = String(facturaInfo.CbteDesde).padStart(8, '0')

      // HTML de la factura basado en el formato oficial de AFIP
      const html = `<!DOCTYPE html>
<html>
<head>
<title>Factura</title>
<style type="text/css">
*{
  box-sizing: border-box;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
.bill-container{
  width: 750px;
  position: absolute;
  left:0;
  right: 0;
  margin: auto;
  border-collapse: collapse;
  font-family: sans-serif;
  font-size: 13px;
}

.bill-emitter-row td{
  width: 50%;
  border-bottom: 1px solid; 
  padding-top: 10px;
  padding-left: 10px;
  vertical-align: top;
}
.bill-emitter-row{
  position: relative;
}
.bill-emitter-row td:nth-child(2){
  padding-left: 60px;
}
.bill-emitter-row td:nth-child(1){
  padding-right: 60px;
}

.bill-type{
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
.text-lg{
  font-size: 30px;
}
.text-center{
  text-align: center;
}

.col-2{
  width: 16.66666667%;
  float: left;
}
.col-3{
  width: 25%;
  float: left;
}
.col-4{
  width: 33.3333333%;
  float: left;
}
.col-5{
  width: 41.66666667%;
  float: left;
}
.col-6{
  width: 50%;
  float: left;
}
.col-8{
  width: 66.66666667%;
  float: left;
}
.col-10{
  width: 83.33333333%;
  float: left;
}
.row{
  overflow: hidden;
}

.margin-b-0{
  margin-bottom: 0px;
}

.bill-row td{
  padding-top: 5px
}

.bill-row td > div{
  border-top: 1px solid; 
  border-bottom: 1px solid; 
  margin: 0 -1px 0 -2px;
  padding: 0 10px 13px 10px;
}
.row-details table {
  border-collapse: collapse;
  width: 100%;
}
.row-details td > div, .row-qrcode td > div{
  border: 0;
  margin: 0 -1px 0 -2px;
  padding: 0;
}
.row-details table td{
  padding: 5px;
}
.row-details table tr:nth-child(1){
  border-top: 1px solid; 
  border-bottom: 1px solid; 
  background: #c0c0c0;
  font-weight: bold;
  text-align: center;
}
.row-details table tr +  tr{
  border-top: 1px solid #c0c0c0; 
}
.text-right{
  text-align: right;
}

.margin-b-10 {
  margin-bottom: 10px;
}

.total-row td > div{
  border-width: 2px;
}

.row-qrcode td{
  padding: 10px;
}

#qrcode {
  width: 50%
}
</style>
</head>
<body>
<table class="bill-container">
<tr class="bill-emitter-row">
<td>
<div class="bill-type">
B
</div>
<div class="text-lg text-center">
Tu Empresa S.A.
</div>
<p><strong>Razón social:</strong> Tu Empresa S.A.</p>
<p><strong>Domicilio Comercial:</strong> Calle falsa 123</p>
<p><strong>Condición Frente al IVA:</strong> Responsable inscripto</p>
</td>
<td>
<div>
<div class="text-lg">
Factura
</div>
<div class="row">
<p class="col-6 margin-b-0">
<strong>Punto de Venta: ${ptoVta}</strong>
</p>
<p class="col-6 margin-b-0">
<strong>Comp. Nro: ${nroComp}</strong> 
</p>
</div>
<p><strong>Fecha de Emisión:</strong> ${fechaFormateada}</p>
<p><strong>CUIT:</strong> ${ArcaConfig.CUIT}</p>
<p><strong>Ingresos Brutos:</strong> Exento</p>
<p><strong>Fecha de Inicio de Actividades:</strong> 01/01/2020</p>
</div>
</td>
</tr>
<tr class="bill-row">
<td colspan="2">
<div class="row">
<p class="col-4 margin-b-0">
<strong>Período Facturado Desde: </strong>${fechaFormateada}
</p>
<p class="col-3 margin-b-0">
<strong>Hasta: </strong>${fechaFormateada}
</p>
<p class="col-5 margin-b-0">
<strong>Fecha de Vto. para el pago: </strong>${fechaFormateada}
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
<strong>Apellido y Nombre / Razón social: </strong>Cliente
</p>
</div>
<div class="row">
<p class="col-6 margin-b-0">
<strong>Condición Frente al IVA: </strong>Consumidor final
</p>
<p class="col-6 margin-b-0">
<strong>Domicilio: </strong>Calle Cliente 456
</p>
</div>
<p>
<strong>Condicion de venta: </strong>Efectivo
</p>
</div>
</td>
</tr>
<tr class="bill-row row-details">
<td colspan="2">
<div>
<table>
<tr>
<td>Código</td>
<td>Producto / Servicio</td>
<td>Cantidad</td>
<td>U. Medida</td>
<td>Precio Unit.</td>
<td>% Bonif.</td>
<td>Imp. Bonif.</td>
<td>Subtotal</td>
</tr>
<tr>
<td>001</td>
<td>Producto/Servicio</td>
<td>1,00</td>
<td>Unidad</td>
<td>${(facturaInfo.ImpNeto || 0).toFixed(2)}</td>
<td>0,00</td>
<td>0,00</td>
<td>${(facturaInfo.ImpNeto || 0).toFixed(2)}</td>
</tr>
</table>
</div>
</td>
</tr>
<tr class="bill-row total-row">
<td colspan="2">
<div>
<div class="row text-right">
<p class="col-10 margin-b-0">
<strong>Subtotal: $</strong>
</p>
<p class="col-2 margin-b-0">
<strong>${(facturaInfo.ImpNeto || 0).toFixed(2)}</strong>
</p>
</div>
<div class="row text-right">
<p class="col-10 margin-b-0">
<strong>IVA 21%: $</strong>
</p>
<p class="col-2 margin-b-0">
<strong>${(facturaInfo.ImpIVA || 0).toFixed(2)}</strong>
</p>
</div>
<div class="row text-right">
<p class="col-10 margin-b-0">
<strong>Importe total: $</strong>
</p>
<p class="col-2 margin-b-0">
<strong>${facturaInfo.ImpTotal.toFixed(2)}</strong>
</p>
</div>
</div>
</td>
</tr>
<tr class="bill-row row-qrcode">
<td>
<div>
<div class="row">
<img id="qrcode" src="${qrImageUrl}" alt="QR Code">
</div>
</div>
</td>
<td>
<div>
<div class="row text-right margin-b-10">
<strong>CAE Nº:&nbsp;</strong> ${facturaInfo.CAE}
</div>
<div class="row text-right">
<strong>Fecha de Vto. de CAE:&nbsp;</strong> ${fechaVtoCAE}
</div>
</div>
</td>
</tr>
<tr class="bill-row row-details">
<td colspan="2">
<div>
<div class="row text-center margin-b-10">
<span style="vertical-align:bottom">Generado con Sistema de Facturación</span>
</div>
</div>
</td>
</tr>
</table>
</body>
</html>`

      // Nombre del archivo
      const fileName = `Factura_${facturaInfo.CbteTipo}_${String(facturaInfo.PtoVta).padStart(4, '0')}_${String(facturaInfo.CbteDesde).padStart(8, '0')}`

      // Opciones para el PDF
      const options = {
        width: 8, // Ancho de página en pulgadas
        marginLeft: 0.4,
        marginRight: 0.4,
        marginTop: 0.4,
        marginBottom: 0.4,
      }

      // Crear el PDF usando el SDK
      const pdfResult = await this.afip.ElectronicBilling.createPDF({
        html,
        file_name: fileName,
        options,
      })

      return {
        success: true,
        fileUrl: pdfResult.file,
        fileName,
        qrUrl: qrResult.qrUrl,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al generar PDF:', error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}
