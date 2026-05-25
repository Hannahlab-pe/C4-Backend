import { IsString, IsOptional } from 'class-validator'

export class CreateProyectoDto {
  @IsString()
  nombre: string

  @IsOptional()
  @IsString()
  ubicacion?: string

  @IsOptional()
  @IsString()
  distrito?: string

  @IsOptional()
  @IsString()
  propietario?: string
}
