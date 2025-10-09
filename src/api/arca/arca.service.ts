import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import Afip from '@afipsdk/afip.js'
import { Injectable } from '@nestjs/common'
import puppeteer from 'puppeteer'
import { ArcaConfig } from './arca.config'
import { CreateArcaDto } from './dto/create-arca.dto'

@Injectable()
export class ArcaService {
  private afip: Afip

  constructor() {
    // Configuración para ambiente de desarrollo/homologación
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
   * Consultar datos de un contribuyente por CUIT
   */
  async consultarContribuyente(cuit: number) {
    try {
      const data = await this.afip.RegisterScopeFive.getTaxpayerDetails(cuit)
      
      return {
        success: true,
        data: {
          razonSocial: data.razonSocial || `${data.apellido} ${data.nombre}`,
          domicilio: data.domicilioFiscal?.direccion,
          localidad: data.domicilioFiscal?.localidad,
          provincia: data.domicilioFiscal?.provincia,
          condicionIVA: this.determinarCondicionIVA(data),
          tipoPersona: data.tipoPersona,
        },
      }
    }
    catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Determinar condición IVA según impuestos inscriptos
   */
  private determinarCondicionIVA(data: any): number {
    // Buscar si tiene IVA inscripto (idImpuesto: 30)
    const tieneIVA = data.impuestos?.some((imp: any) => imp.idImpuesto === 30)

    if (tieneIVA) {
      return 1 // Responsable Inscripto
    }
    else if (data.categoriaMonotributo) {
      return 6 // Responsable Monotributo
    }
    else {
      return 5 // Consumidor Final / Exento
    }
  }

  /**
   * Helper para manejar errores de forma consistente
   */
  private handleError(error: unknown): { success: false, error: string } {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return {
      success: false,
      error: errorMessage,
    }
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

      // Usar DocTipo y Concepto del DTO si vienen, si no usar por defecto
      const docTipo = createArcaDto.DocTipo || 80
      const concepto = createArcaDto.Concepto || 1
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
        CbteTipo: cbteTipo, // Tipo de comprobante
        Concepto: concepto, // Concepto (1 = Productos, 2 = Servicios, 3 = Ambos)
        DocTipo: docTipo, // Tipo de documento del comprador
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
      return this.handleError(error)
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
      return this.handleError(error)
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
      return this.handleError(error)
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
      return this.handleError(error)
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
      return this.handleError(error)
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
      return this.handleError(error)
    }
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
    codAut: string | number // CAE (se convierte a número si es string)
  }) {
    try {
      // Generar URL según especificaciones de AFIP
      // https://www.afip.gob.ar/fe/qr/?p=parametros
      
      // IMPORTANTE: El CAE debe ser número según especificación de AFIP
      const codAutNumerico = typeof facturaData.codAut === 'string' 
        ? Number.parseInt(facturaData.codAut, 10)
        : facturaData.codAut

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
        codAut: codAutNumerico, // CAE como número
      }

      // Crear string de datos base64
      const jsonStr = JSON.stringify(qrData)
      const base64Data = Buffer.from(jsonStr).toString('base64')

      // URL del QR de AFIP
      const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`

      return {
        success: true,
        qrUrl,
        qrData,
      }
    }
    catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Generar PDF de la factura usando Puppeteer (sin límite de 100 PDFs/mes)
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

      // Verificar que se generó el QR correctamente
      if (!qrResult.success || !qrResult.qrUrl) {
        const errorMsg = 'error' in qrResult ? qrResult.error : 'Error desconocido al generar QR'
        throw new Error('Error al generar QR: ' + errorMsg)
      }

      // Generar URL del QR code como imagen
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResult.qrUrl || '')}`

      // Importar y usar la función de generación de HTML desde facturaTemplate
      const { generarHTMLFactura } = await import('@render/factura/components/facturaTemplate')
      const html = generarHTMLFactura(facturaInfo, qrImageUrl, ArcaConfig.CUIT)

      // Nombre del archivo
      const fileName = `Factura_${facturaInfo.CbteTipo}_${String(facturaInfo.PtoVta).padStart(4, '0')}_${String(facturaInfo.CbteDesde).padStart(8, '0')}.pdf`

      // Directorio de destino en el escritorio del usuario
      // En Windows: C:\Users\[usuario]\Desktop
      // En Linux/Mac: /home/[usuario]/Desktop
      const desktopPath = join(homedir(), 'Desktop')
      const outputDir = desktopPath
      
      // Crear el directorio si no existe
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      // Ruta completa del archivo PDF
      const pdfPath = join(outputDir, fileName)

      // Generar PDF usando Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()
      
      // Configurar el contenido HTML
      await page.setContent(html, { waitUntil: 'networkidle0' })

      // Generar el PDF con las opciones configuradas
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: {
          top: '0.4in',
          right: '0.4in',
          bottom: '0.4in',
          left: '0.4in',
        },
        printBackground: true,
      })

      await browser.close()

      return {
        success: true,
        filePath: pdfPath,
        fileName,
        qrUrl: qrResult.qrUrl || undefined,
        message: `PDF generado exitosamente en ${pdfPath}`,
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
