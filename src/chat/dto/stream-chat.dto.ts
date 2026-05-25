import { IsString, IsUUID, IsOptional } from 'class-validator'

export class StreamChatDto {
  @IsUUID()
  proyectoId: string

  @IsString()
  mensaje: string

  @IsOptional()
  @IsString()
  archivoBase64?: string  // base64 del archivo

  @IsOptional()
  @IsString()
  archivoNombre?: string

  @IsOptional()
  @IsString()
  archivoTipo?: string  // 'pdf' | 'image/jpeg' | 'image/png' | etc.
}
