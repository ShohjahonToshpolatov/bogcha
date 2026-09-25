import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsString, ValidateNested } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

class BulkAttendanceItemDto {
  @ApiProperty()
  @IsString()
  childId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ description: "Oflayn sinxronizatsiya uchun noyob ID (idempotentlik)" })
  @IsString()
  clientRequestId: string;
}

export class BulkAttendanceDto {
  @ApiProperty({ example: '2026-09-06' })
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty({ type: [BulkAttendanceItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceItemDto)
  items: BulkAttendanceItemDto[];
}
