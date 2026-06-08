import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IntentParserService } from './intent-parser.service';
import { ParseIntentDto } from './dto/parse-intent.dto';

@ApiTags('Intent Parser')
@Controller('intent-parser')
export class IntentParserController {
  constructor(private readonly intentParser: IntentParserService) {}

  @Post('parse')
  @ApiOperation({ summary: 'Parse free-form Persian need text into category and location' })
  async parse(@Body() dto: ParseIntentDto) {
    const intent = await this.intentParser.parse(dto.description);

    return {
      parsed: intent,
      autoFilled: !intent.requiresConfirmation,
    };
  }
}
