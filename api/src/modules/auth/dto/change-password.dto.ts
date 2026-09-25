import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  oldPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6, { message: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  newPassword: string;
}
