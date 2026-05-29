import { Body, Controller, Get, Inject, Param, Post, Put, Query, UsePipes, ValidationPipe } from '@nestjs/common'
import { DatabaseService } from '../../main/database/database.service'
import { ArcaService } from './arca.service'
import { AuthWebServiceDevDto } from './dto/auth-web-service-dev.dto'
import { AuthWebServiceProdDto } from './dto/auth-web-service-prod.dto'
import { CreateArcaDto } from './dto/create-arca.dto'
import { CreateCertDevDto } from './dto/create-cert-dev.dto'
import { CreateCertProdDto } from './dto/create-cert-prod.dto'

@Controller('arca')
export class ArcaController {
  constructor(
    @Inject(ArcaService) private readonly arcaService: ArcaService,
    @Inject(DatabaseService) private readonly databaseService: DatabaseService,
  ) { }

  /**
   * Crear una nueva factura electrónica
   */
  @Post('factura')
  create(@Body() createArcaDto: CreateArcaDto) {
    return this.arcaService.create(createArcaDto)
  }

  /**
   * Crear una nota de crédito electrónica
   */
  @Post('nota-credito')
  createNotaCredito(@Body() createArcaDto: CreateArcaDto) {
    return this.arcaService.create(createArcaDto)
  }

  /**
   * Generar código QR para una factura
   */
  @Post('generar-qr')
  generateQR(@Body() qrData: any) {
    return this.arcaService.generateQR(qrData)
  }

  /**
   * Generar PDF de una factura
   */
  @Post('generar-pdf')
  generatePDF(@Body() facturaInfo: any) {
    return this.arcaService.generatePDF(facturaInfo)
  }

  /**
   * Generar PDF de un ticket
   */
  @Post('generar-pdf-ticket')
  generatePDFTicket(@Body() ticketInfo: any) {
    return this.arcaService.generatePDFTicket(ticketInfo)
  }

  @Post('generar-pdf-remito')
  generatePDFRemito(@Body() remitoInfo: any) {
    return this.arcaService.generatePDFRemito(remitoInfo)
  }

  /**
   * Obtener CUIT a partir de un DNI
   */
  @Get('dni-to-cuit/:dni')
  obtenerCUITDesdeDNI(@Param('dni') dni: string) {
    return this.arcaService.obtenerCUITDesdeDNI(+dni)
  }

  /**
   * Consultar datos de un contribuyente por CUIT
   */
  @Get('contribuyente/:cuit')
  consultarContribuyente(@Param('cuit') cuit: string) {
    return this.arcaService.consultarContribuyente(+cuit)
  }

  /**
   * Obtener puntos de venta habilitados
   */
  @Get('puntos-venta')
  getPuntosVentaHabilitados() {
    return this.arcaService.getPuntosVentaHabilitados()
  }

  /**
   * Crear certificado de desarrollo para ARCA
   */
  @Post('crear-certificado-dev')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  crearCertificadoDev(@Body() data: CreateCertDevDto) {
    return this.arcaService.crearCertificadoDev(data)
  }

  /**
   * Autorizar web service de desarrollo
   */
  @Post('autorizar-web-service-dev')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  autorizarWebServiceDev(@Body() data: AuthWebServiceDevDto) {
    return this.arcaService.autorizarWebServiceDev(data)
  }

  /**
   * Crear certificado de producción para ARCA
   */
  @Post('crear-certificado-prod')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  crearCertificadoProd(@Body() data: CreateCertProdDto) {
    return this.arcaService.crearCertificadoProd(data)
  }

  /**
   * Autorizar web service de producción
   */
  @Post('autorizar-web-service-prod')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  autorizarWebServiceProd(@Body() data: AuthWebServiceProdDto) {
    return this.arcaService.autorizarWebServiceProd(data)
  }

  /**
   * Obtener configuración de ARCA (incluyendo CUIT)
   */
  @Get('config')
  getConfig() {
    return this.arcaService.getConfig()
  }

  /**
   * Configurar CUIT dinámicamente
   * Útil cuando el usuario ingresa su CUIT desde la UI
   */
  @Post('configurar-cuit')
  async configurarCUIT(@Body() body: { cuit: number }) {
    try {
      this.arcaService.configurarCUIT(body.cuit)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Configurar token de AFIP SDK
   */
  @Post('configurar-token')
  async configurarToken(@Body() body: { token: string }) {
    try {
      this.arcaService.configurarToken(body.token)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Obtener comprobantes emitidos usando automatización de AFIP SDK
   */
  @Post('mis-comprobantes')
  async getMisComprobantes(@Body() filters: any) {
    return this.arcaService.getMisComprobantes(filters)
  }

  @Post('cai-remitos')
  guardarCaiRemito(@Body() body: { cai: string, puntoVenta: number, numeroDesde: number, numeroHasta: number, fechaVencimiento: string, activo?: boolean }) {
    try {
      const id = this.databaseService.guardarCaiRemito({
        cai: body.cai,
        puntoVenta: body.puntoVenta,
        numeroDesde: body.numeroDesde,
        numeroHasta: body.numeroHasta,
        proximoNumero: body.numeroDesde,
        fechaVencimiento: body.fechaVencimiento,
        activo: body.activo ?? true,
      })

      return { success: true, id }
    }
    catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  @Put('cai-remitos/:id')
  actualizarCaiRemito(@Param('id') id: string, @Body() body: { cai: string, puntoVenta: number, numeroDesde: number, numeroHasta: number, fechaVencimiento: string, activo?: boolean }) {
    try {
      const updated = this.databaseService.actualizarCaiRemito(Number.parseInt(id), {
        cai: body.cai,
        puntoVenta: body.puntoVenta,
        numeroDesde: body.numeroDesde,
        numeroHasta: body.numeroHasta,
        proximoNumero: body.numeroDesde,
        fechaVencimiento: body.fechaVencimiento,
        activo: body.activo ?? true,
      })

      return { success: updated }
    }
    catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  @Get('cai-remitos')
  listarCaiRemitos(@Query('puntoVenta') puntoVenta?: string) {
    return { success: true, data: this.databaseService.obtenerCaiRemitos(puntoVenta ? { puntoVenta: Number.parseInt(puntoVenta) } : undefined) }
  }

  @Get('cai-remitos/alertas')
  alertasCaiRemitos(@Query('puntoVenta') puntoVenta?: string) {
    return { success: true, data: this.databaseService.obtenerAlertasCaiRemitos(puntoVenta ? Number.parseInt(puntoVenta) : undefined) }
  }

  @Post('remitos/emitir')
  emitirRemito(@Body() body: {
    puntoVenta: number
    cliente: string
    docTipo: number
    docNro: number
    razonSocial: string
    domicilio: string
    condicionIVA: string
    condicionVenta: string
    items: Array<{ descripcion: string; cantidad: number; unidadMedida: string }>
    fecha?: string
  }) {
    try {
      const result = this.databaseService.emitirRemito(body)

      return {
        success: true,
        data: {
          id: result.remito.id,
          puntoVenta: result.remito.puntoVenta,
          numero: result.remito.numero,
          fecha: result.remito.fecha,
          cliente: result.remito.cliente,
          docTipo: result.remito.docTipo,
          docNro: result.remito.docNro,
          razonSocial: result.remito.razonSocial,
          domicilio: result.remito.domicilio,
          cai: result.remito.cai,
          caiVencimiento: result.remito.caiVencimiento,
          condicionIVA: result.remito.condicionIVA,
          condicionVenta: result.remito.condicionVenta,
          estado: result.remito.estado,
          proximoNumero: result.cai.proximoNumero,
        },
      }
    }
    catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Guardar una factura en la base de datos local
   */
  @Post('facturas/guardar')
  async guardarFactura(@Body() factura: any) {
    try {
      console.log('📥 Guardando factura:', JSON.stringify(factura, null, 2))
      const id = this.databaseService.guardarFactura(factura)
      console.log('✅ Factura guardada con ID:', id)
      return { success: true, id }
    } catch (error: any) {
      console.error('❌ Error al guardar factura:', error.message)
      console.error('Stack:', error.stack)
      return { success: false, error: error.message }
    }
  }

  /**
   * Obtener facturas guardadas localmente
   */
  @Get('facturas')
  async obtenerFacturas(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('docNro') docNro?: string,
    @Query('docTipo') docTipo?: string,
    @Query('ptoVta') ptoVta?: string,
    @Query('cbteTipo') cbteTipo?: string,
    @Query('cbteAsocTipo') cbteAsocTipo?: string,
    @Query('cbteAsocPtoVta') cbteAsocPtoVta?: string,
    @Query('cbteAsocNro') cbteAsocNro?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filtros: any = {}
      
      if (fechaDesde) filtros.fechaDesde = fechaDesde
      if (fechaHasta) filtros.fechaHasta = fechaHasta
      if (docNro) filtros.docNro = parseInt(docNro)
      if (docTipo) filtros.docTipo = parseInt(docTipo)
      if (ptoVta) filtros.ptoVta = parseInt(ptoVta)
      if (cbteTipo) filtros.cbteTipo = parseInt(cbteTipo)
      if (cbteAsocTipo) filtros.cbteAsocTipo = parseInt(cbteAsocTipo)
      if (cbteAsocPtoVta) filtros.cbteAsocPtoVta = parseInt(cbteAsocPtoVta)
      if (cbteAsocNro) filtros.cbteAsocNro = parseInt(cbteAsocNro)
      if (limit) filtros.limit = parseInt(limit)
      if (offset) filtros.offset = parseInt(offset)

      const facturas = this.databaseService.obtenerFacturas(filtros)
      const total = this.databaseService.contarFacturas(filtros)

      return { success: true, data: facturas, total }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Obtener una factura por ID
   */
  @Get('facturas/:id')
  async obtenerFacturaPorId(@Param('id') id: string) {
    try {
      const factura = this.databaseService.obtenerFacturaPorId(parseInt(id))
      if (!factura) {
        return { success: false, error: 'Factura no encontrada' }
      }
      return { success: true, data: factura }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Actualizar el path del PDF de una factura
   */
  @Post('facturas/:id/pdf-path')
  async actualizarPdfPath(@Param('id') id: string, @Body() body: { pdfPath: string }) {
    try {
      const success = this.databaseService.actualizarPdfPath(parseInt(id), body.pdfPath)
      if (!success) {
        return { success: false, error: 'Factura no encontrada' }
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}
