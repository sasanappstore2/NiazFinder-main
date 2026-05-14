import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleUserStatusDto {
  @ApiProperty({ description: 'عملیات', enum: ['activate', 'deactivate', 'ban'] })
  @IsNotEmpty()
  @IsIn(['activate', 'deactivate', 'ban'])
  action: 'activate' | 'deactivate' | 'ban';

  @ApiPropertyOptional({ description: 'دلیل (برای بن)', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
