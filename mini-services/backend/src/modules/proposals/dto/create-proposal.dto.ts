import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProposalDto {
  @ApiProperty({ description: 'شناسه درخواست' })
  @IsNotEmpty({ message: 'شناسه درخواست الزامی است' })
  @IsString()
  requestId: string;

  @ApiProperty({ description: 'قیمت پیشنهادی (تومان)', example: 5000000 })
  @IsNotEmpty({ message: 'قیمت پیشنهادی الزامی است' })
  @IsInt()
  @Min(0, { message: 'قیمت نمی‌تواند منفی باشد' })
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ description: 'زمان تحویل' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'زمان تحویل باید حداقل ۱ باشد' })
  @Type(() => Number)
  deliveryTime?: number;

  @ApiPropertyOptional({ description: 'واحد زمان تحویل', enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsIn(['day', 'week', 'month'], { message: 'واحد زمان تحویل نامعتبر است' })
  deliveryUnit?: 'day' | 'week' | 'month';

  @ApiProperty({
    description: 'پیام توضیحی پیشنهاد',
    example: 'با تجربه بیش از ۵ سال در طراحی وب، می‌توانم پروژه شما را با کیفیت بالا تحویل دهم.',
  })
  @IsNotEmpty({ message: 'پیام توضیحی الزامی است' })
  @IsString()
  @MinLength(10, { message: 'پیام توضیحی باید حداقل ۱۰ کاراکتر باشد' })
  message: string;
}
