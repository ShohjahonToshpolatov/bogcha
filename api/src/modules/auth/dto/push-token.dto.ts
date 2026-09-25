import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class PushTokenDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ enum: ['web', 'android', 'ios'] })
  @IsIn(['web', 'android', 'ios'])
  platform: 'web' | 'android' | 'ios';
}
