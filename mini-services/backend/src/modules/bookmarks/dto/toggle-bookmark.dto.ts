import { IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleBookmarkDto {
  @ApiProperty({
    description: 'نوع هدف',
    enum: ['REQUEST', 'SPECIALIST'],
    example: 'REQUEST',
  })
  @IsNotEmpty({ message: 'نوع bookmark الزامی است' })
  @IsIn(['REQUEST', 'SPECIALIST'], { message: 'نوع باید REQUEST یا SPECIALIST باشد' })
  type: 'REQUEST' | 'SPECIALIST';

  @ApiProperty({ description: 'شناسه هدف', example: 'clxxxx' })
  @IsNotEmpty({ message: 'شناسه هدف الزامی است' })
  targetId: string;
}
