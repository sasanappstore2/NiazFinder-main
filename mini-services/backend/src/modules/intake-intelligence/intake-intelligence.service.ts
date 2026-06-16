import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IntakeAnalyzePayload {
  text: string;
  citySlug?: string;
  cityName?: string;
}

@Injectable()
export class IntakeIntelligenceService {
  private readonly logger = new Logger(IntakeIntelligenceService.name);

  constructor(private readonly config: ConfigService) {}

  async analyze(payload: IntakeAnalyzePayload): Promise<unknown> {
    const origin =
      this.config.get<string>('NEXT_PUBLIC_APP_URL') ||
      this.config.get<string>('APP_URL') ||
      'http://localhost:3000';
    const secret = this.config.get<string>('INTERNAL_API_SECRET')?.trim();
    if (!secret) {
      throw new Error('INTERNAL_API_SECRET not configured');
    }

    const res = await fetch(`${origin}/api/internal/intake-queue/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ jobName: 'intake.analyze', payload }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      result?: unknown;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? `intake analyze HTTP ${res.status}`);
    }

    this.logger.debug(`intake analyze ok textLen=${payload.text.length}`);
    return data.result;
  }
}
