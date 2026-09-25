import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertGroupDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty({ example: 'Quyoshcha' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Oy hisobida', example: 24 })
  @IsInt()
  @Min(0)
  ageMin: number;

  @ApiProperty({ description: 'Oy hisobida', example: 36 })
  @IsInt()
  @Min(0)
  ageMax: number;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ example: '#4F8EF7' })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
