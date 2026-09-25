import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StartThreadDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  childId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body!: string;
}
