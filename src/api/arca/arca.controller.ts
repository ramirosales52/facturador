import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Inject } from '@nestjs/common';
import { ArcaService } from './arca.service';
import { CreateArcaDto } from './dto/create-arca.dto';
import { UpdateArcaDto } from './dto/update-arca.dto';

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
   * Obtener estado del servidor de ARCA/AFIP
   */
  @Get('server-status')
  findAll() {
    return this.arcaService.findAll();
  }

  /**
   * Obtener información de un comprobante
   */
  @Get('comprobante/:id')
  findOne(@Param('id') id: string) {
    return this.arcaService.findOne(+id);
  }

  /**
   * Obtener el último número de comprobante
   */
  @Get('ultimo-comprobante')
  getLastVoucher(
    @Query('ptoVta') ptoVta: string = '1',
    @Query('cbteTipo') cbteTipo: string = '11'
  ) {
    return this.arcaService.getLastVoucher(+ptoVta, +cbteTipo);
  }

  /**
   * Obtener tipos de comprobantes disponibles
   */
  @Get('tipos-comprobante')
  getVoucherTypes() {
    return this.arcaService.getVoucherTypes();
  }

  /**
   * Obtener puntos de venta disponibles
   */
  @Get('puntos-venta')
  getSalesPoints() {
    return this.arcaService.getSalesPoints();
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateArcaDto: UpdateArcaDto) {
    return this.arcaService.update(+id, updateArcaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.arcaService.remove(+id);
  }
}
