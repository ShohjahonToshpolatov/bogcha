import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckOutDto {
  @ApiProperty()
  @IsString()
  childId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pickupPersonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
