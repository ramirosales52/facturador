import { IsNotEmpty, IsString } from 'class-validator'

/**
 * DTO para autorizar web service de producción en ARCA
 */
export class AuthWebServiceProdDto {
  @IsString()
  @IsNotEmpty()
  cuit: string

  @IsString()
  @IsNotEmpty()
  username: string

  @IsString()
  @IsNotEmpty()
  password: string

  @IsString()
  @IsNotEmpty()
  alias: string

  @IsString()
  @IsNotEmpty()
  service: string // ID del web service a autorizar (ej: 'wsfe' para factura electrónica)
}
