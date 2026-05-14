import { IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyReferralDto {
  @ApiProperty({ description: 'کد دعوت', example: 'NF-AB12CD' })
  @IsNotEmpty({ message: 'کد دعوت الزامی است' })
  @Matches(/^NF-[A-Z0-9]{6}$/, {
    message: 'فرمت کد دعوت نامعتبر است. کد باید به فرمت NF-XXXXXX باشد',
  })
  code: string;
}
