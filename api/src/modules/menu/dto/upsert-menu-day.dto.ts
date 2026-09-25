import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { MealType } from '@prisma/client';

class DishDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  portion?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  allergens?: string[];
}

export class UpsertMenuDayDto {
  @ApiProperty()
  @IsString()
  branchId: string;

  @ApiProperty({ example: '2026-09-08' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: MealType })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiProperty({ type: [DishDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DishDto)
  dishes: DishDto[];
}

export class CopyWeekDto {
  @ApiProperty({ example: '2026-09-07' })
  @IsDateString()
  fromWeekStart: string;

  @ApiProperty({ example: '2026-09-14' })
  @IsDateString()
  toWeekStart: string;

  @ApiProperty()
  @IsString()
  branchId: string;
}
