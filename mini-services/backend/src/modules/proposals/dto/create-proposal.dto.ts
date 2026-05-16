import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsIn,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProposalDto {
  @ApiProperty({ description: 'شناسه درخواست' })
  @IsNotEmpty({ message: 'شناسه درخواست الزامی است' })
  @IsString()
  requestId: string;

  @ApiProperty({
    description: 'نامه پوششی (توضیح پیشنهاد)',
    example: 'با تجربه بیش از ۵ سال در طراحی وب، می‌توانم پروژه شما را با کیفیت بالا تحویل دهم.',
  })
  @IsNotEmpty({ message: 'نامه پوششی الزامی است' })
  @IsString()
  @MinLength(20, { message: 'نامه پوششی باید حداقل ۲۰ کاراکتر باشد' })
  @MaxLength(3000, { message: 'نامه پوششی نباید بیشتر از ۳۰۰۰ کاراکتر باشد' })
  coverLetter: string;

  @ApiPropertyOptional({ description: 'بودجه پیشنهادی (تومان)', example: 5000000 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'بودجه نمی‌تواند منفی باشد' })
  @Type(() => Number)
  estimatedBudget?: number;

  @ApiPropertyOptional({ description: 'زمان تحویل تخمینی' })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'زمان تحویل باید حداقل ۱ باشد' })
  @Type(() => Number)
  estimatedTime?: number;

  @ApiPropertyOptional({ description: 'واحد زمان تحویل', enum: ['day', 'hour', 'month'] })
  @IsOptional()
  @IsIn(['day', 'hour', 'month'], { message: 'واحد زمان تحویل نامعتبر است' })
  deliveryUnit?: 'day' | 'hour' | 'month';
}
