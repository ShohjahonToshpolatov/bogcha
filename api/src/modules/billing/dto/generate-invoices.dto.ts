import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class GenerateInvoicesDto {
  @ApiProperty({ example: '2026-09' })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "Davr YYYY-MM formatida bo'lishi kerak" })
  period: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  childIds?: string[];
}
