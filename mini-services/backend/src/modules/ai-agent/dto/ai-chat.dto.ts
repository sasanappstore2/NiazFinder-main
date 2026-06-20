import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @IsString()
  @IsNotEmpty()
  clientTempId!: string;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
