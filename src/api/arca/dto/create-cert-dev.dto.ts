import { IsNotEmpty, IsString } from 'class-validator'

export class CreateCertDevDto {
  @IsString()
  @IsNotEmpty({ message: 'El CUIT es requerido' })
  cuit: string

  @IsString()
  @IsNotEmpty({ message: 'El usuario es requerido' })
  username: string

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password: string

  @IsString()
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string
}
