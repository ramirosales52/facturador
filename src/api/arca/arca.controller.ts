import { Controller, Get, Post, Body, Param, Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { ArcaService } from './arca.service';
import { CreateArcaDto } from './dto/create-arca.dto';
import { CreateCertDevDto } from './dto/create-cert-dev.dto';
import { AuthWebServiceDevDto } from './dto/auth-web-service-dev.dto';

@Controller('arca')
export class ArcaController {
  constructor(@Inject(ArcaService) private readonly arcaService: ArcaService) {}

  /**
   * Crear una nueva factura electrónica
   */
  @Post('factura')
  create(@Body() createArcaDto: CreateArcaDto) {
    return this.arcaService.create(createArcaDto);
  }

  /**
   * Generar código QR para una factura
   */
  @Post('generar-qr')
  generateQR(@Body() qrData: any) {
    return this.arcaService.generateQR(qrData);
  }

  /**
   * Generar PDF de una factura
   */
  @Post('generar-pdf')
  generatePDF(@Body() facturaInfo: any) {
    return this.arcaService.generatePDF(facturaInfo);
  }

  /**
   * Consultar datos de un contribuyente por CUIT
   */
  @Get('contribuyente/:cuit')
  consultarContribuyente(@Param('cuit') cuit: string) {
    return this.arcaService.consultarContribuyente(+cuit);
  }

  /**
   * Crear certificado de desarrollo para ARCA
   */
  @Post('crear-certificado-dev')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  crearCertificadoDev(@Body() data: CreateCertDevDto) {
    return this.arcaService.crearCertificadoDev(data);
  }

  /**
   * Autorizar web service de desarrollo
   */
  @Post('autorizar-web-service-dev')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  autorizarWebServiceDev(@Body() data: AuthWebServiceDevDto) {
    return this.arcaService.autorizarWebServiceDev(data);
  }

  /**
   * Obtener configuración de ARCA (incluyendo CUIT)
   */
  @Get('config')
  getConfig() {
    return this.arcaService.getConfig();
  }
}
