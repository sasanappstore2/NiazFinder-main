import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ParseIntentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;
}
