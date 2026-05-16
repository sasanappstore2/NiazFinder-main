import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'ریفرش توکن' })
  @IsNotEmpty({ message: 'ریفرش توکن الزامی است' })
  refreshToken: string;
}
