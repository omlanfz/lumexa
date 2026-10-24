// FILE PATH: server/src/assessments/bank/final-tests/index.ts
//
// Every authored Final Test bank, keyed by the slug of the pathway (Course.slug)
// it closes — including the Lumexa Odyssey.

import { TestBank } from '../bank.types';
import { aiBuilderFinal } from './ai-builder-path';
import { dataScientistFinal } from './data-scientist-path';
import { digitalIndependenceFinal } from './digital-independence-path';
import { gameCreatorFinal } from './game-creator-path';
import { littleCodersFinal } from './little-coders-path';
import { odysseyFinal } from './lumexa-odyssey';
import { webDeveloperFinal } from './web-developer-path';

export const finalTestBanks: Record<string, TestBank> = {
  'ai-builder-path': aiBuilderFinal,
  'data-scientist-path': dataScientistFinal,
  'digital-independence-path': digitalIndependenceFinal,
  'game-creator-path': gameCreatorFinal,
  'little-coders-path': littleCodersFinal,
  'lumexa-odyssey': odysseyFinal,
  'web-developer-path': webDeveloperFinal,
};
