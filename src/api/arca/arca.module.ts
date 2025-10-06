import { Module } from '@nestjs/common';
import { ArcaService } from './arca.service';
import { ArcaController } from './arca.controller';

@Module({
  controllers: [ArcaController],
  providers: [ArcaService],
})
export class ArcaModule {}
