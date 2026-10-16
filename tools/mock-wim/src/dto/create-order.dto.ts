import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator'

export class OrderLineDto {
  @IsString() productId!: string
  @IsInt() @Min(1) @Max(999) quantity!: number
}

export class CustomerDto {
  @IsString() @MaxLength(120) name!: string
  @IsString() @MaxLength(20) phone!: string
  @IsOptional() @IsString() @MaxLength(300) address?: string
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

export class FulfillmentDto {
  @IsIn(['delivery', 'pickup']) type!: 'delivery' | 'pickup'
  @IsOptional() @IsString() branchId?: string
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderLineDto) items!: OrderLineDto[]
  @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto
  @ValidateNested() @Type(() => FulfillmentDto) fulfillment!: FulfillmentDto
}
