import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class GuardianDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak" })
  phone: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'Ona' })
  @IsString()
  relation: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canPickup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canPay?: boolean;
}
