import { Body, Controller, Get, Inject, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common'
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

  /**
   * Guardar una factura en la base de datos local
   */
  @Post('facturas/guardar')
  async guardarFactura(@Body() factura: any) {
    try {
      const id = this.databaseService.guardarFactura(factura)
      return { success: true, id }
    } catch (error: any) {
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
    @Query('ptoVta') ptoVta?: string,
    @Query('cbteTipo') cbteTipo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filtros: any = {}
      
      if (fechaDesde) filtros.fechaDesde = fechaDesde
      if (fechaHasta) filtros.fechaHasta = fechaHasta
      if (docNro) filtros.docNro = parseInt(docNro)
      if (ptoVta) filtros.ptoVta = parseInt(ptoVta)
      if (cbteTipo) filtros.cbteTipo = parseInt(cbteTipo)
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
}
