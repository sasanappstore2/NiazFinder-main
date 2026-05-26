import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class TypingJoinDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class TypingAnalyzeDto {
  @IsString()
  sessionId: string;

  @IsString()
  @MaxLength(2000)
  text: string;

  @IsOptional()
  @IsNumber()
  seq?: number;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class TypingHeavyJobDto {
  @IsString()
  requestId: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
