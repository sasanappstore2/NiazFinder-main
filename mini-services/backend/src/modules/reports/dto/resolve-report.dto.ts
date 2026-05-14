import { IsNotEmpty, IsOptional, IsIn, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolveReportDto {
  @ApiProperty({ description: 'وضعیت نهایی گزارش', enum: ['RESOLVED', 'DISMISSED'] })
  @IsNotEmpty()
  @IsIn(['RESOLVED', 'DISMISSED'])
  status: 'RESOLVED' | 'DISMISSED';

  @ApiPropertyOptional({ description: 'یادداشت مدیر', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
