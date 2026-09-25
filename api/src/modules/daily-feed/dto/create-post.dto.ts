import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Mood, PostType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiPropertyOptional({ description: "Bo'sh bo'lsa — butun guruhga" })
  @IsOptional()
  @IsString()
  childId?: string;

  @ApiProperty({ enum: PostType })
  @IsEnum(PostType)
  type: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activityTag?: string;

  @ApiPropertyOptional({ enum: Mood })
  @IsOptional()
  @IsEnum(Mood)
  mood?: Mood;

  @ApiPropertyOptional({ type: [String], description: "POST /media/upload dan qaytgan Media ID'lari" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];
}
