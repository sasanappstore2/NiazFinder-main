import { Body, Controller, Post } from '@nestjs/common';
import { IntakeIntelligenceService } from './intake-intelligence.service';

@Controller('intake-intelligence')
export class IntakeIntelligenceController {
  constructor(private readonly service: IntakeIntelligenceService) {}

  @Post('analyze')
  async analyze(
    @Body() body: { text?: string; citySlug?: string; cityName?: string },
  ): Promise<{ ok: true; result: unknown }> {
    const text = body.text?.trim() ?? '';
    const result = await this.service.analyze({
      text,
      citySlug: body.citySlug,
      cityName: body.cityName,
    });
    return { ok: true, result };
  }
}
