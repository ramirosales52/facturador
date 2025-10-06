import { PartialType } from '@nestjs/mapped-types';
import { CreateArcaDto } from './create-arca.dto';

export class UpdateArcaDto extends PartialType(CreateArcaDto) {}
