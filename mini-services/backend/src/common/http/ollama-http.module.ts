import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { llmHttpAgent, llmHttpsAgent } from './http-agents';
import { OllamaClientService } from './ollama-client.service';

/**
 * Global HTTP client tuned for parallel Ollama inference (keep-alive + 100 sockets).
 * NestJS containers should set OLLAMA_URL=http://ollama:11434 on the Docker network.
 */
@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 120_000,
      maxRedirects: 0,
      httpAgent: llmHttpAgent,
      httpsAgent: llmHttpsAgent,
    }),
  ],
  providers: [OllamaClientService],
  exports: [HttpModule, OllamaClientService],
})
export class OllamaHttpModule {}
