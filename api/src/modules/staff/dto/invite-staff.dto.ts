import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';

const STAFF_ROLES = [Role.ADMIN, Role.TEACHER, Role.NURSE, Role.COOK] as const;

export class InviteStaffDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Matches(/^\+998\d{9}$/, { message: "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak" })
  phone: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty({ enum: STAFF_ROLES })
  @IsIn(STAFF_ROLES)
  role: (typeof STAFF_ROLES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  groupIds?: string[];
}
