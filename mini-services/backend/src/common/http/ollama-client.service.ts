import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface OllamaGenerateOptions {
  model?: string;
  prompt: string;
  stream?: boolean;
  format?: string;
  options?: Record<string, unknown>;
  timeoutMs?: number;
}

export interface OllamaGenerateResult {
  response: string;
  model: string;
  totalDuration?: number;
  loadDuration?: number;
  evalDuration?: number;
}

export interface OllamaEmbeddingResult {
  embedding: number[];
}

@Injectable()
export class OllamaClientService {
  private readonly logger = new Logger(OllamaClientService.name);
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultTimeoutMs: number;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = (config.get<string>('OLLAMA_URL') ?? 'http://127.0.0.1:8101')
      .replace(/\/$/, '');
    this.defaultModel = config.get<string>('OLLAMA_MODEL') ?? 'gemma4-e2b-it';
    this.defaultTimeoutMs = Number(config.get<string>('OLLAMA_TIMEOUT_MS') ?? 120_000);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async generate(opts: OllamaGenerateOptions): Promise<OllamaGenerateResult | null> {
    const model = opts.model ?? this.defaultModel;
    const timeout = opts.timeoutMs ?? this.defaultTimeoutMs;

    try {
      const { data } = await firstValueFrom(
        this.http.post<OllamaGenerateResult>(
          `${this.baseUrl}/api/generate`,
          {
            model,
            prompt: opts.prompt,
            stream: opts.stream ?? false,
            format: opts.format,
            options: opts.options ?? { temperature: 0.1 },
          },
          { timeout },
        ),
      );
      return data;
    } catch (err) {
      const ax = err as AxiosError;
      this.logger.warn(
        `Ollama generate failed (${model}): ${ax.message}`,
      );
      return null;
    }
  }

  async embeddings(
    text: string,
    model?: string,
    timeoutMs?: number,
  ): Promise<number[] | null> {
    const embedModel = model ?? process.env.EMBED_MODEL ?? 'nomic-embed-text';
    const timeout = timeoutMs ?? Number(process.env.EMBED_TIMEOUT_MS ?? 30_000);

    try {
      const { data } = await firstValueFrom(
        this.http.post<OllamaEmbeddingResult>(
          `${this.baseUrl}/api/embeddings`,
          { model: embedModel, prompt: text },
          { timeout },
        ),
      );
      return data.embedding ?? null;
    } catch (err) {
      const ax = err as AxiosError;
      this.logger.warn(`Ollama embeddings failed: ${ax.message}`);
      return null;
    }
  }

  async chat(
    messages: Array<{ role: string; content: string }>,
    model?: string,
    timeoutMs?: number,
  ): Promise<string | null> {
    const chatModel = model ?? this.defaultModel;
    const timeout = timeoutMs ?? this.defaultTimeoutMs;

    try {
      const { data } = await firstValueFrom(
        this.http.post<{ message?: { content?: string } }>(
          `${this.baseUrl}/api/chat`,
          {
            model: chatModel,
            messages,
            stream: false,
          },
          { timeout },
        ),
      );
      return data.message?.content?.trim() ?? null;
    } catch (err) {
      const ax = err as AxiosError;
      this.logger.warn(`Ollama chat failed: ${ax.message}`);
      return null;
    }
  }
}
