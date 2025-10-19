import { IsString, IsNotEmpty } from 'class-validator';

export class AuthWebServiceDevDto {
  @IsString()
  @IsNotEmpty()
  cuit: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  alias: string;

  @IsString()
  @IsNotEmpty()
  service: string; // ID del web service a autorizar (ej: 'wsfe' para factura electrónica)
}
