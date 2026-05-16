import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ description: 'شناسه کاربر مقابل (UUID)', example: 'clxxxxxx' })
  @IsNotEmpty()
  @IsString()
  userId2: string;

  @ApiPropertyOptional({ description: 'شناسه درخواست مرتبط (UUID)', example: 'clxxxxxx' })
  @IsOptional()
  @IsString()
  requestId?: string;

  /** Alias for userId2 (new field name per spec) */
  @ApiPropertyOptional({ description: 'شناسه کاربر مقابل (UUID)', example: 'clxxxxxx' })
  @IsOptional()
  @IsString()
  otherUserId?: string;
}
