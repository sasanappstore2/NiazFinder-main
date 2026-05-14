import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'شناسه کاربر مقابل' })
  @IsNotEmpty()
  @IsString()
  userId2: string;

  @ApiPropertyOptional({ description: 'شناسه درخواست مرتبط' })
  @IsOptional()
  @IsString()
  requestId?: string;
}
