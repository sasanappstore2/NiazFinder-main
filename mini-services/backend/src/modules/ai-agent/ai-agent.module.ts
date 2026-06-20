import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiAgentLlmService } from './ai-agent-llm.service';
import { AiAgentToolsService } from './ai-agent-tools.service';
import { AiAgentWalletService } from './ai-agent-wallet.service';
import { PlatformAiUserService } from './platform-ai-user.service';
import { AiAgentSiteDataService } from './ai-agent-site-data.service';
import { Gemma4AgentClient } from './gemma4-agent.client';
import { LocationEmbeddingService } from './location-embedding.service';
import { AiAgentVectorSearchService } from './ai-agent-vector-search.service';

@Module({
  imports: [WalletModule],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiAgentLlmService,
    AiAgentToolsService,
    AiAgentSiteDataService,
    AiAgentWalletService,
    PlatformAiUserService,
    Gemma4AgentClient,
    LocationEmbeddingService,
    AiAgentVectorSearchService,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule {}
