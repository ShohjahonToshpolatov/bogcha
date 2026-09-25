import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNumberString, IsOptional, IsString, Max, Min } from 'class-validator';

export class AssignTariffDto {
  @ApiProperty()
  @IsString()
  tariffId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  customAmount?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountNote?: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  validFrom: string;
}
