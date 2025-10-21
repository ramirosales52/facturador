import { Module } from '@nestjs/common'
import { ArcaController } from './arca.controller'
import { ArcaService } from './arca.service'

@Module({
  controllers: [ArcaController],
  providers: [ArcaService],
})
export class ArcaModule {}
