import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsIn } from 'class-validator';

export class UpdateProposalStatusDto {
  @ApiProperty({
    description: 'وضعیت پیشنهاد',
    enum: ['ACCEPTED', 'REJECTED', 'WITHDRAW'],
  })
  @IsNotEmpty({ message: 'وضعیت الزامی است' })
  @IsIn(['ACCEPTED', 'REJECTED', 'WITHDRAW'], {
    message: 'وضعیت نامعتبر است. مقادیر مجاز: ACCEPTED, REJECTED, WITHDRAW',
  })
  status: 'ACCEPTED' | 'REJECTED' | 'WITHDRAW';
}
