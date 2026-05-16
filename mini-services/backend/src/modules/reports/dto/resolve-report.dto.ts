import { IsNotEmpty, IsOptional, IsIn, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveReportDto {
  @ApiProperty({ description: 'نتیجه بررسی', maxLength: 2000 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  resolution: string;

  @ApiProperty({
    description: 'عملیات اجرایی',
    enum: ['WARN', 'SUSPEND', 'BAN', 'NONE'],
  })
  @IsNotEmpty()
  @IsIn(['WARN', 'SUSPEND', 'BAN', 'NONE'])
  action: 'WARN' | 'SUSPEND' | 'BAN' | 'NONE';

  @ApiPropertyOptional({ description: 'یادداشت مدیر', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
