import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpsertCameraDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiProperty({ example: "Quyoshcha — o'yin xonasi" })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rtsp://user:pass@192.168.1.10:554/stream1' })
  @IsString()
  rtspUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  visibleToParents?: boolean;

  @ApiPropertyOptional({
    description: 'Hafta kunlari bo\'yicha ochiq soatlar',
    example: { mon: [['09:00', '11:30']], tue: [['09:00', '11:30']] },
  })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, [string, string][]>;

  @ApiPropertyOptional({ default: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxViewMinutes?: number;
}
