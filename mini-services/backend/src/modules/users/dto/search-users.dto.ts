import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchUsersDto {
  @ApiProperty({ description: 'عبارت جستجو', minLength: 2 })
  @IsNotEmpty({ message: 'عبارت جستجو الزامی است' })
  @MinLength(2, { message: 'عبارت جستجو باید حداقل ۲ کاراکتر باشد' })
  query: string;
}
