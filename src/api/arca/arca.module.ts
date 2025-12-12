import { Module } from '@nestjs/common'
import { DatabaseService } from '../../main/database/database.service'
import { ArcaController } from './arca.controller'
import { ArcaService } from './arca.service'

@Module({
  controllers: [ArcaController],
  providers: [ArcaService, DatabaseService],
})
export class ArcaModule {}
