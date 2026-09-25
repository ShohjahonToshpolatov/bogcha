import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertWaitlistDto {
  @ApiProperty()
  @IsString()
  childName: string;

  @ApiProperty({ example: '2023-01-15' })
  @IsDateString()
  birthDate: string;

  @ApiProperty()
  @IsString()
  parentName: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak" })
  parentPhone: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  desiredStart: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ enum: WaitlistStatus })
  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;
}
