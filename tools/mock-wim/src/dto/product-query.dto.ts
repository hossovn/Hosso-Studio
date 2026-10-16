import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ProductQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize: number = 12
  @IsOptional() @IsString() make?: string
  @IsOptional() @IsString() model?: string
  @IsOptional() @Type(() => Number) @IsInt() year?: number
  @IsOptional() @IsString() category?: string
  @IsOptional() @IsString() brand?: string
  @IsOptional() @IsIn(['genuine', 'aftermarket']) condition?: 'genuine' | 'aftermarket'
  @IsOptional() @IsString() q?: string
}
