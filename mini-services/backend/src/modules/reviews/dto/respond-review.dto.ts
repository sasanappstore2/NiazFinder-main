import { IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondReviewDto {
  @ApiProperty({ description: 'پاسخ به نظر', maxLength: 1000 })
  @IsNotEmpty({ message: 'پاسخ نمی‌تواند خالی باشد' })
  @MaxLength(1000, { message: 'پاسخ نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد' })
  response: string;
}
