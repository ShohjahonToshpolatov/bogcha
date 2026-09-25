import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TelegramLinkDto {
  @ApiProperty()
  @IsString()
  code: string;
}
