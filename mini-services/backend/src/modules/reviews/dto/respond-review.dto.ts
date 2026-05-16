import { IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondReviewDto {
  @ApiProperty({ description: 'پاسخ به نظر', minLength: 10, maxLength: 1000 })
  @IsNotEmpty({ message: 'پاسخ نمی‌تواند خالی باشد' })
  @MinLength(10, { message: 'پاسخ باید حداقل ۱۰ کاراکتر باشد' })
  @MaxLength(1000, { message: 'پاسخ نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد' })
  response: string;
}
