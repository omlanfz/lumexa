// FILE PATH: server/src/lumi/lumi.module.ts
//
// ─── Lumi Free Chatbot Module ─────────────────────────────────────────────────
//
// Architecture: FAQ Rule-Based → Ollama AI Fallback (100% FREE)
// No paid APIs. No API keys required.
//
// Register in server/src/app.module.ts:
//   import { LumiModule } from './lumi/lumi.module';
//   @Module({ imports: [..., LumiModule] })
//
// Requires Ollama running locally:
//   See README at bottom of lumi.service.ts for setup instructions.

import { Module } from '@nestjs/common';
import { LumiController } from './lumi.controller';
import { LumiService } from './lumi.service';

@Module({
  controllers: [LumiController],
  providers: [LumiService],
  exports: [LumiService],
})
export class LumiModule {}
