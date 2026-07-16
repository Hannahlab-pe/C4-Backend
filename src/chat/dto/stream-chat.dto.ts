import { IsString, IsUUID, IsOptional, IsArray } from 'class-validator'

export class StreamChatDto {
  @IsUUID()
  proyectoId: string

  @IsString()
  mensaje: string

  @IsOptional()
  @IsString()
  archivoBase64?: string  // base64 del archivo (single — compat)

  @IsOptional()
  @IsString()
  archivoNombre?: string

  @IsOptional()
  @IsString()
  archivoTipo?: string  // 'pdf' | 'image/jpeg' | 'image/png' | etc.

  @IsOptional()
  @IsArray()
  archivos?: { base64: string; nombre?: string; tipo?: string }[]  // varios adjuntos (ej. 3 planos)

  @IsOptional()
  @IsString()
  faseActual?: string  // módulo/fase que el usuario está viendo (contexto de UI)
}
