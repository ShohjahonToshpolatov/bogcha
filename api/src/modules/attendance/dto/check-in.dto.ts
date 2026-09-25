import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiProperty()
  @IsString()
  childId: string;

  @ApiPropertyOptional({ example: '36.6' })
  @IsOptional()
  @IsNumberString()
  temperature?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
