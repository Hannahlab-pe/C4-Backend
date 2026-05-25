import { IsString, IsOptional } from 'class-validator'

export class QueryRagDto {
  @IsString()
  query: string

  @IsOptional()
  @IsString()
  distrito?: string

  @IsOptional()
  limit?: number
}
