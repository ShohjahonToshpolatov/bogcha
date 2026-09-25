import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumberString, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertTariffDto {
  @ApiProperty({ example: "To'liq kun + ovqat" })
  @IsString()
  name: string;

  @ApiProperty({ example: '1200000' })
  @IsNumberString()
  monthlyAmount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includesMeals?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  siblingDiscountPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
