import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ArchiveChildDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
