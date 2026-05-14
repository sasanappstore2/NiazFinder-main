import { IsOptional, IsInt, Min, Max, IsString, MaxLength, ValidateNested, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SkillItemDto {
  @ApiPropertyOptional({ description: 'شناسه مهارت' })
  @IsOptional()
  @IsString()
  skillId?: string;

  @ApiPropertyOptional({ description: 'نام مهارت' })
  @IsOptional()
  @IsString()
  skillName?: string;

  @ApiProperty({ description: 'سطح مهارت (۱ تا ۵)' })
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiPropertyOptional({ description: 'تجربه', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  experience?: string;
}

export class UpdateSkillsDto {
  @ApiProperty({ description: 'لیست مهارت‌ها', type: [SkillItemDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'حداقل یک مهارت وارد کنید' })
  @ValidateNested({ each: true })
  @Type(() => SkillItemDto)
  skills: SkillItemDto[];
}
