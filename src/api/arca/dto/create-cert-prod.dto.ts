import { IsNotEmpty, IsString } from 'class-validator'

/**
 * DTO para crear certificado de producción en ARCA
 */
export class CreateCertProdDto {
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
  token: string
}
